const fs = require("fs");
const path = require("path");
const DIDRegistry = artifacts.require("DIDRegistry");

module.exports = async function (callback) {
  try {
    const accounts = await web3.eth.getAccounts();
    const instance = await DIDRegistry.deployed();

    let results = [];
    const runs = 20;

    for (let i = 0; i < runs; i++) {

      // Unique DID every time
      const did = "did:parking:" + i + "_" + Date.now();
      const doc = "docHash_" + Date.now();

      console.log("Run:", i + 1);

      const start = Date.now();

      const tx = await instance.registerDID(did, doc, {
        from: accounts[0],
        gas: 300000
      });

      await web3.eth.getTransactionReceipt(tx.tx);
      const end = Date.now();

      const latency = (end - start) / 1000;
      results.push(latency);

      console.log("Latency:", latency, "seconds");
      console.log("Tx Hash:", tx.tx);
      console.log("---------------------------");
    }

    // Save to project-root/results/latency
    const resultsDir = path.resolve("results/latency");

    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const filePath = path.join(resultsDir, "latency_registerDID.csv");

    fs.writeFileSync(
      filePath,
      "Run,Latency(seconds)\n" +
        results.map((l, i) => `${i + 1},${l}`).join("\n")
    );

    console.log("Latency testing complete.");
    console.log("Results saved to:", filePath);

    callback();

  } catch (error) {
    console.error("Error during latency test:", error);
    callback(error);
  }
};