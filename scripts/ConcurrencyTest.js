const ParkingSlots = artifacts.require("ParkingSlots");
const fs = require("fs");
const path = require("path");

module.exports = async function (callback) {
  try {
    const contract = await ParkingSlots.deployed();
    const accounts = await web3.eth.getAccounts();
    const totalSlots = (await contract.totalSlots()).toNumber();

    let csvData = "Function,Concurrency,Success,Failures,TotalTime(sec),TPS,AvgGas\n";

    async function testFunction(name, concurrency, action) {
      const txs = [];
      const start = Date.now();

      for (let i = 0; i < concurrency; i++) {
        txs.push(action(i).catch(e => e));
      }

      const results = await Promise.all(txs);
      const end = Date.now();
      const totalTime = (end - start) / 1000;

      let success = 0;
      let totalGas = 0;

      results.forEach(r => {
        if (r.receipt) {
          success++;
          totalGas += r.receipt.gasUsed;
        }
      });

      const failures = concurrency - success;
      const tps = success / totalTime;
      const avgGas = success > 0 ? totalGas / success : 0;

      console.log(`\n${name} - ${concurrency} users`);
      console.log("Success:", success);
      console.log("Failures:", failures);
      console.log("Total Time:", totalTime);
      console.log("TPS:", tps);
      console.log("Avg Gas:", avgGas);

      csvData += `${name},${concurrency},${success},${failures},${totalTime},${tps},${avgGas}\n`;
    }

    const levels = [10, 25, 50, 100];

    // BOOK SLOT
    for (let level of levels) {
      await testFunction("bookSlot", level, (i) => {
        const slotId = i % totalSlots;
        return contract.bookSlot(
          slotId,
          "CAR" + i,
          { from: accounts[i], gas: 500000 }
        );
      });
    }

    // RELEASE SLOT
    for (let level of levels) {
      await testFunction("releaseSlot", level, (i) => {
        const slotId = i % totalSlots;
        return contract.releaseSlot(
          slotId,
          { from: accounts[i], gas: 500000 }
        );
      });
    }

    // READ FUNCTION (View)
    for (let level of levels) {
      const start = Date.now();
      const calls = [];

      for (let i = 0; i < level; i++) {
        const slotId = i % totalSlots;
        calls.push(contract.getSlotStatus(slotId));
      }

      await Promise.all(calls);
      const end = Date.now();
      const totalTime = (end - start) / 1000;
      const tps = level / totalTime;

      console.log(`\ngetSlotStatus - ${level} users`);
      console.log("Total Time:", totalTime);
      console.log("TPS:", tps);

      csvData += `getSlotStatus,${level},${level},0,${totalTime},${tps},0\n`;
    }

    // Write CSV file
    const resultsDir = path.join(__dirname, "results/concurrency");

// Create folder automatically if it doesn't exist
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

const filePath = path.join(resultsDir, "concurrency_results.csv");

fs.writeFileSync(filePath, csvData);

console.log("\n✅ CSV file generated at:", filePath);

    callback();
  } catch (err) {
    console.error(err);
    callback(err);
  }
};