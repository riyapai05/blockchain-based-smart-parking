const Contract = artifacts.require("ParkingSlots");
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
  const user = accounts[0];

  // Fresh deployment
  const instance = await Contract.new(10, { from: user });

  // Precondition: must book first
  await instance.bookSlot(
    0,
    "CAR"+runIndex,
    { from: user }
  );

  const start = Date.now();

  const tx = await instance.releaseSlot(
    0,
    { from: user }
  );

  const receipt = await wait(tx.tx);
  const block = await web3.eth.getBlock(receipt.blockNumber);

  const latency = (block.timestamp * 1000 - start) / 1000;

  // Save to project-root/results/latency
  const resultsDir = path.resolve("results/latency");
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const filePath = path.join(resultsDir, "latency_releaseSlot.csv");

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