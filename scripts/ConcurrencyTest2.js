const SlotAllocationAdmin = artifacts.require("SlotAllocationAdmin");
const fs = require("fs");
const path = require("path");

module.exports = async function (callback) {
  try {
    const contract = await SlotAllocationAdmin.deployed();
    const accounts = await web3.eth.getAccounts();
    const admin = accounts[0]; // Deployer = admin

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

    // =============================
    // 1️⃣ SUBMIT MEDICAL DOCUMENT
    // =============================
    for (let level of levels) {
      await testWrite("submitMedicalDocument", level, (i) => {
        return contract.submitMedicalDocument(
          "DOC_HASH_" + i,
          { from: accounts[i + 1], gas: 500000 }
        );
      });
    }

    // =============================
    // 2️⃣ VERIFY (ADMIN ONLY)
    // =============================
    for (let level of levels) {
      await testWrite("verifyMedicalRecord", level, (i) => {
        return contract.verifyMedicalRecord(
          accounts[i + 1],
          true,
          { from: admin, gas: 500000 }
        );
      });
    }

    // =============================
    // 3️⃣ ALLOCATE SLOT (ADMIN ONLY)
    // =============================
    for (let level of levels) {
      await testWrite("allocateSlot", level, (i) => {
        return contract.allocateSlot(
          accounts[i + 1],
          { from: admin, gas: 800000 }
        );
      });
    }

    // =============================
    // 4️⃣ RELEASE SLOT
    // =============================
    for (let level of levels) {
      await testWrite("releaseSlot", level, (i) => {
        return contract.releaseSlot(
          { from: accounts[i + 1], gas: 500000 }
        );
      });
    }

    const resultsDir = path.join(__dirname, "../results/concurrency");

// Create folder if it doesn't exist
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

// Timestamped filename (recommended for benchmarking)
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const filePath = path.join(resultsDir, `admin_concurrency_${timestamp}.csv`);

fs.writeFileSync(filePath, csv);

console.log("\n✅ CSV generated at:", filePath);

    callback();
  } catch (err) {
    console.error(err);
    callback(err);
  }
};