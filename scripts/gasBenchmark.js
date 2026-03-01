const fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const PriorityParking = artifacts.require("PriorityParking");

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function standardDeviation(arr) {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((sq, n) => sq + Math.pow(n - m, 2), 0) / (arr.length - 1));
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
  if (!fs.existsSync('results')) fs.mkdirSync('results');

  let gasValues = [];

  for (let i = 0; i < runs; i++) {
    const instance = await PriorityParking.new(10); // fresh instance
    const tx = await fn(instance);
    gasValues.push(tx.receipt.gasUsed);
  }

  const csvWriter = createCsvWriter({
    path: `results/gasused${label}_gas.csv`,
    header: [
      { id: 'run', title: 'run' },
      { id: 'gas', title: 'gas' }
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
    const user = accounts[1];
    const runs = 30;

    console.log("Benchmark bookSlot (free)...");
    const freeStats = await measureGas("bookSlot_free", async (instance) =>
      instance.bookSlot("KA01AB1234", false, { from: user })
    , runs);

    console.log("Benchmark bookSlot (waitlist)...");
    const waitStats = await measureGas("bookSlot_wait", async (instance) =>
      instance.bookSlot("KA01AB1234", true, { from: user })
    , runs);

    console.log("Benchmark releaseSlot (normal)...");
    const releaseStats = await measureGas("releaseSlot_normal", async (instance) => {
      await instance.bookSlot("KA01AB1234", false, { from: user });
      return instance.releaseSlot(0, { from: user });
    }, runs);

    console.log("----- GAS STATISTICS -----");
    console.log("bookSlot (free):", freeStats);
    console.log("bookSlot (wait):", waitStats);
    console.log("releaseSlot:", releaseStats);

  } catch (err) {
    console.error(err);
  }

  callback();
};