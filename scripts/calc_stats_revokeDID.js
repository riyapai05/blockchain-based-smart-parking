const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "results/latency/latency_revokeDID.csv");

// Read CSV
let lines = fs.readFileSync(filePath, "utf8")
  .split("\n")
  .filter(Boolean);

// Extract latency column (index 2)
const data = lines
  .slice(1)
  .map(line => parseFloat(line.split(",")[2]))
  .filter(x => !isNaN(x));

const n = data.length;

if (n < 2) {
  console.log("Not enough data to calculate statistics.");
  process.exit();
}

// ---- Mean ----
const mean = data.reduce((a, b) => a + b, 0) / n;

// ---- Sample Standard Deviation (n-1) ----
const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1);
const sd = Math.sqrt(variance);

// ---- 95% Confidence Interval ----
const ci = 1.96 * (sd / Math.sqrt(n));

// ---- Percentiles ----
const sorted = [...data].sort((a, b) => a - b);
const p90 = sorted[Math.floor(0.9 * n)];
const p95 = sorted[Math.floor(0.95 * n)];

// ---- Append statistics ----
fs.appendFileSync(filePath, "\n\nStatistic,Value\n");
fs.appendFileSync(filePath, `Mean,${mean}\n`);
fs.appendFileSync(filePath, `SD,${sd}\n`);
fs.appendFileSync(filePath, `95% CI,${ci}\n`);
fs.appendFileSync(filePath, `p90,${p90}\n`);
fs.appendFileSync(filePath, `p95,${p95}\n`);

console.log("Statistics appended successfully.");