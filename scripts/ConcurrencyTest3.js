const WaitlistManager = artifacts.require("WaitlistManager");
const fs = require("fs");
const path = require("path");

module.exports = async function (callback) {
  try {
    const contract = await WaitlistManager.deployed();
    const accounts = await web3.eth.getAccounts();
    const admin = accounts[0];

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
    // 1️⃣ ADD TO WAITLIST
    // =========================
    for (let level of levels) {
      await testWrite("addToWaitlist", level, (i) => {
        return contract.addToWaitlist(
          accounts[i + 1],
          { from: admin, gas: 500000 }
        );
      });
    }

    // =========================
    // 2️⃣ REMOVE FROM WAITLIST
    // =========================
    for (let level of levels) {
      await testWrite("removeFromWaitlist", level, (i) => {
        return contract.removeFromWaitlist(
          accounts[i + 1],
          { from: admin, gas: 500000 }
        );
      });
    }

    // =========================
    // 3️⃣ PRIORITIZE (HEAVY)
    // =========================
    for (let level of levels) {
      await testWrite("prioritize", level, (i) => {
        return contract.prioritize(
          accounts[i + 101], // use new accounts to avoid conflict
          { from: admin, gas: 800000 }
        );
      });
    }

    const resultsDir = path.join(__dirname, "../results/concurrency");

if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const filePath = path.join(resultsDir, `waitlist_concurrency_${timestamp}.csv`);

fs.writeFileSync(filePath, csv);

console.log("\n✅ CSV generated at:", filePath);

    callback();
  } catch (err) {
    console.error(err);
    callback(err);
  }
};