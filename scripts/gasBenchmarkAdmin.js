const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const SlotAllocationAdmin = artifacts.require("SlotAllocationAdmin");

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function standardDeviation(arr) {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((sq, n) => Math.pow(n - m, 2) + sq, 0) / (arr.length - 1));
}

function confidenceInterval95(arr) {
  const m = mean(arr);
  const sd = standardDeviation(arr);
  const margin = 1.96 * (sd / Math.sqrt(arr.length));
  return [m - margin, m + margin];
}

function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[index];
}

async function measureGas(label, fn, runs) {
  let gasValues = [];

  for (let i = 0; i < runs; i++) {
    const instance = await SlotAllocationAdmin.new(10);
    const tx = await fn(instance);
    gasValues.push(tx.receipt.gasUsed);
  }

  const csvWriter = createCsvWriter({
    path: `results/gasused/${label}_gas.csv`,
    header: [
      { id: 'run', title: 'Run' },
      { id: 'gas', title: 'GasUsed' }
    ]
  });

  const records = gasValues.map((g, i) => ({ run: i + 1, gas: g }));
  await csvWriter.writeRecords(records);

  return {
    mean: mean(gasValues),
    sd: standardDeviation(gasValues),
    ci: confidenceInterval95(gasValues),
    p90: percentile(gasValues, 90),
    p95: percentile(gasValues, 95)
  };
}

module.exports = async function (callback) {
  try {
    const accounts = await web3.eth.getAccounts();
    const admin = accounts[0];
    const user = accounts[1];
    const runs = 30;

    const submitStats = await measureGas("submitMedicalDocument", async (instance) =>
      instance.submitMedicalDocument("QmHash", { from: user })
    , runs);

    const verifyStats = await measureGas("verifyMedicalRecord", async (instance) => {
      await instance.submitMedicalDocument("QmHash", { from: user });
      return instance.verifyMedicalRecord(user, true, { from: admin });
    }, runs);

    const allocateStats = await measureGas("allocateSlot", async (instance) => {
      await instance.submitMedicalDocument("QmHash", { from: user });
      await instance.verifyMedicalRecord(user, true, { from: admin });
      return instance.allocateSlot(user, { from: admin });
    }, runs);

    const releaseStats = await measureGas("releaseSlot", async (instance) => {
      await instance.submitMedicalDocument("QmHash", { from: user });
      await instance.verifyMedicalRecord(user, true, { from: admin });
      await instance.allocateSlot(user, { from: admin });
      return instance.releaseSlot({ from: user });
    }, runs);

    console.log("SlotAllocationAdmin:");
    console.log("submitMedicalDocument:", submitStats);
    console.log("verifyMedicalRecord:", verifyStats);
    console.log("allocateSlot:", allocateStats);
    console.log("releaseSlot:", releaseStats);

  } catch (err) {
    console.error(err);
  }

  callback();
};