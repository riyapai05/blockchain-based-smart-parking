const fs = require("fs");
const path = require("path");
const WaitlistManager = artifacts.require("WaitlistManager");

web3.eth.handleRevert = true;

async function waitForReceipt(txHash) {
  let receipt = null;
  while (!receipt) {
    receipt = await web3.eth.getTransactionReceipt(txHash);
    if (!receipt) {
      await new Promise(r => setTimeout(r, 10000));
    }
  }
  return receipt;
}

module.exports = async function (callback) {
  try {
    const instance = await WaitlistManager.deployed();
    const accounts = await web3.eth.getAccounts();
    const admin = accounts[0];

    // Save to project-root/results/latency
    const resultsDir = path.resolve("results/latency");

    // Create folder if it doesn't exist
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const filePath = path.join(resultsDir, "latency_addToWaitlist.csv");

    // Create CSV header if file doesn't exist
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, "Run,Timestamp,LatencySeconds\n");
    }

    let totalLatency = 0;

    for (let i = 1; i <= 20; i++) {

      console.log(`Run ${i} starting...`);

      // Generate unique valid Ethereum address
      const user = web3.eth.accounts.create().address;

      const submissionTime = Date.now();

      const tx = await instance.addToWaitlist(user, {
        from: admin,
        gas: 300000
      });

      const receipt = await waitForReceipt(tx.tx);
      const block = await web3.eth.getBlock(receipt.blockNumber);

      const latency = (block.timestamp * 1000 - submissionTime) / 1000;
      totalLatency += latency;

      console.log(`Run ${i} Latency: ${latency} sec`);

      fs.appendFileSync(
        filePath,
        `${i},${new Date().toISOString()},${latency}\n`
      );

      console.log("Waiting 3 minutes...");
      await new Promise(r => setTimeout(r, 180000));
    }

    console.log("Average Latency:", totalLatency / 20);
    console.log("Saved to latency_addToWaitlist.csv");

    callback();
  } catch (err) {
    console.error(err);
    callback(err);
  }
};