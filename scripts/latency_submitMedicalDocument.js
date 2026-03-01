const fs = require("fs");
const path = require("path");
const SlotAllocationAdmin = artifacts.require("SlotAllocationAdmin");

module.exports = async function (callback) {
  try {

    const accounts = await web3.eth.getAccounts();
    const user = accounts[0];

    // Save to project-root/results/latency
    const resultsDir = path.resolve("results/latency");

    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const filePath = path.join(resultsDir, "latency_submitMedicalDocument.csv");

    // Create CSV Header
    fs.writeFileSync(filePath, "Run,LatencySeconds\n");

    let totalLatency = 0;

    for (let i = 0; i < 20; i++) {

      console.log(`\n========== RUN ${i + 1} ==========`);

      // Deploy fresh contract each run
      const instance = await SlotAllocationAdmin.new(10, { from: user });

      const startTime = Date.now();

      // Send transaction
      const tx = await instance.submitMedicalDocument(
        "QmTestHash" + i,
        { from: user, gas: 300000 }
      );

      const endTime = Date.now();

      // Accurate latency = transaction mining time
      const latency = (endTime - startTime) / 1000;

      totalLatency += latency;

      console.log(`Latency: ${latency} sec`);

      fs.appendFileSync(
        filePath,
        `${i + 1},${latency}\n`
      );

      // Wait 3 minutes before next run
      if (i < 19) {
        console.log("Waiting 3 minutes...");
        await new Promise(r => setTimeout(r, 180000));
      }
    }

    console.log("\nAll runs completed!");
    console.log("Average Latency:", (totalLatency / 20).toFixed(3), "sec");
    console.log("CSV saved at:", filePath);

    callback();

  } catch (err) {
    console.error(err);
    callback(err);
  }
};