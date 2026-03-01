const fs = require("fs");
const path = require("path");
const DIDRegistry = artifacts.require("DIDRegistry");

web3.eth.handleRevert = true;

async function sendWithRetry(fn, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (err.message.includes("Too Many Requests")) {
        console.log("Rate limited. Waiting 60 seconds...");
        await new Promise(r => setTimeout(r, 60000));
      } else {
        throw err;
      }
    }
  }
  throw new Error("Max retries reached");
}

async function waitForReceipt(txHash) {
  let receipt = null;
  while (!receipt) {
    try {
      receipt = await web3.eth.getTransactionReceipt(txHash);
      if (!receipt) {
        await new Promise(r => setTimeout(r, 10000));
      }
    } catch (err) {
      console.log("Retrying receipt fetch...");
      await new Promise(r => setTimeout(r, 10000));
    }
  }
  return receipt;
}

module.exports = async function (callback) {
  try {
    const instance = await DIDRegistry.deployed();
    const accounts = await web3.eth.getAccounts();

    // Save to project-root/results/latency
    const resultsDir = path.resolve("results/latency");

    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const filePath = path.join(resultsDir, "latency_revokeDID.csv");

    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, "Run,Timestamp,LatencySeconds\n");
    }

    let totalLatency = 0;

    for (let i = 1; i <= 20; i++) {

      console.log(`Run ${i} starting...`);

      const uniqueId = Date.now() + i;
      const did = `did:example:${uniqueId}`;

      // Precondition: register first
      await sendWithRetry(() =>
        instance.registerDID(did, "initial_doc", {
          from: accounts[0],
          gas: 300000
        })
      );

      const submissionTime = Date.now();

      const tx = await sendWithRetry(() =>
        instance.revokeDID(did, {
          from: accounts[0],
          gas: 300000
        })
      );

      const receipt = await waitForReceipt(tx.tx);
      const block = await web3.eth.getBlock(receipt.blockNumber);

      const confirmationTime = block.timestamp * 1000;
      const latency = (confirmationTime - submissionTime) / 1000;

      totalLatency += latency;

      console.log(`Run ${i} Latency: ${latency} sec`);

      fs.appendFileSync(
        filePath,
        `${i},${new Date().toISOString()},${latency}\n`
      );

      console.log("Waiting 3 minutes before next run...");
      await new Promise(resolve => setTimeout(resolve, 180000));
    }

    const avgLatency = totalLatency / 20;

    console.log("\n====================================");
    console.log("Average Latency:", avgLatency, "seconds");
    console.log("Results saved to latency_revokeDID.csv");
    console.log("====================================\n");

    callback();
  } catch (err) {
    console.error(err);
    callback(err);
  }
};