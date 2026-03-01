const PriorityParking = artifacts.require("PriorityParking");
const fs = require("fs");
const path = require("path");

module.exports = async function (callback) {
  try {
    const contract = await PriorityParking.deployed();
    const accounts = await web3.eth.getAccounts();
    const totalSlots = (await contract.totalSlots()).toNumber();

    let csv = "Function,Concurrency,Success,Failures,TotalTime(sec),TPS,AvgGas\n";
    const levels = [10, 25, 50, 100];

    async function testWrite(name, concurrency, action) {
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

      console.log(`\n${name} - ${concurrency}`);
      console.log("Success:", success);
      console.log("Failures:", failures);
      console.log("TPS:", tps);

      csv += `${name},${concurrency},${success},${failures},${totalTime},${tps},${avgGas}\n`;
    }

    // =========================
    // BOOK SLOT TEST
    // =========================
    for (let level of levels) {
      await testWrite("bookSlot", level, (i) => {
        return contract.bookSlot(
          "CAR" + i,
          i % 2 === 0, // alternate priority users
          { from: accounts[i], gas: 800000 }
        );
      });
    }

    // =========================
    // RELEASE SLOT TEST
    // =========================
    for (let level of levels) {
      await testWrite("releaseSlot", level, (i) => {
        const slotId = i % totalSlots;
        return contract.releaseSlot(
          slotId,
          { from: accounts[i], gas: 800000 }
        );
      });
    }

    // =========================
    // READ WAITLIST TEST
    // =========================
    for (let level of levels) {
      const start = Date.now();
      const calls = [];

      for (let i = 0; i < level; i++) {
        calls.push(contract.getWaitlist());
      }

      await Promise.all(calls);
      const end = Date.now();
      const totalTime = (end - start) / 1000;
      const tps = level / totalTime;

      console.log(`\ngetWaitlist - ${level}`);
      console.log("TPS:", tps);

      csv += `getWaitlist,${level},${level},0,${totalTime},${tps},0\n`;
    }

    const resultsDir = path.join(__dirname, "../results/concurrency");

// Create folder if it doesn't exist
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

// Optional: timestamped filename (recommended)
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const filePath = path.join(resultsDir, `priority_concurrency_${timestamp}.csv`);

fs.writeFileSync(filePath, csv);

console.log("\n✅ CSV generated at:", filePath);

    callback();
  } catch (err) {
    console.error(err);
    callback(err);
  }
};