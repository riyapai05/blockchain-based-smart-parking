const Contract = artifacts.require("SlotAllocationAdmin");
const fs = require("fs");
const path = require("path");

async function wait(txHash){
  let receipt = null;
  while(!receipt){
    receipt = await web3.eth.getTransactionReceipt(txHash);
    if(!receipt) await new Promise(r => setTimeout(r, 3000));
  }
  return receipt;
}

module.exports = async function(callback){
try{
  const runIndex = parseInt(process.argv[4]);
  if(!runIndex){
    console.log("Provide run number");
    return callback();
  }

  const accounts = await web3.eth.getAccounts();
  const admin = accounts[0];
  const user = accounts[1];

  // Fresh deployment (clean state)
  const instance = await Contract.new(50, { from: admin });

  // Required pre-condition
  await instance.submitMedicalDocument("hash"+runIndex, { from: user });

  const start = Date.now();

  const tx = await instance.verifyMedicalRecord(user, true, { from: admin });

  const receipt = await wait(tx.tx);
  const block = await web3.eth.getBlock(receipt.blockNumber);

  const latency = (block.timestamp * 1000 - start) / 1000;

  // Save to project-root/results/latency
  const resultsDir = path.resolve("results/latency");

  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const filePath = path.join(resultsDir, "latency_verifyMedicalRecord.csv");

  if(!fs.existsSync(filePath)){
    fs.writeFileSync(filePath,"Run,Latency(s),TxHash\n");
  }

  fs.appendFileSync(
    filePath,
    `${runIndex},${latency},${tx.tx}\n`
  );

  console.log("Run:", runIndex, "Latency:", latency);

  callback();
}catch(e){
  callback(e);
}
};