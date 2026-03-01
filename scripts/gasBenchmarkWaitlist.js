const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const WaitlistManager = artifacts.require("WaitlistManager");

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
    const instance = await WaitlistManager.new();
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

    const addStats = await measureGas("addToWaitlist", async (instance) =>
      instance.addToWaitlist(user, { from: admin })
    , runs);

    const removeStats = await measureGas("removeFromWaitlist", async (instance) => {
      await instance.addToWaitlist(user, { from: admin });
      return instance.removeFromWaitlist(user, { from: admin });
    }, runs);

    const prioritizeStats = await measureGas("prioritize", async (instance) =>
      instance.prioritize(user, { from: admin })
    , runs);

    console.log("WaitlistManager:");
    console.log("addToWaitlist:", addStats);
    console.log("removeFromWaitlist:", removeStats);
    console.log("prioritize:", prioritizeStats);

  } catch (err) {
    console.error(err);
  }

  callback();
};