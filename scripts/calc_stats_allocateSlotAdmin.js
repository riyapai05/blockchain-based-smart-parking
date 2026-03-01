const fs = require("fs");

const fileName = "results/latency/latency_allocateSlotAdmin.csv";

let lines = fs.readFileSync(fileName, "utf8")
  .split("\n")
  .filter(Boolean);

const data = lines
  .slice(1)
  .map(x => parseFloat(x.split(",")[1]))
  .filter(x => !isNaN(x));

const n = data.length;

const mean = data.reduce((a,b)=>a+b,0)/n;
const variance = data.reduce((a,b)=>a+Math.pow(b-mean,2),0)/(n-1); // sample SD
const sd = Math.sqrt(variance);
const ci = 1.96*(sd/Math.sqrt(n));

const sorted=[...data].sort((a,b)=>a-b);
const p90=sorted[Math.floor(0.9*n)];
const p95=sorted[Math.floor(0.95*n)];

fs.appendFileSync(fileName, "\nStatistic,Value\n");
fs.appendFileSync(fileName, `Mean,${mean}\n`);
fs.appendFileSync(fileName, `SD,${sd}\n`);
fs.appendFileSync(fileName, `95% CI,${ci}\n`);
fs.appendFileSync(fileName, `p90,${p90}\n`);
fs.appendFileSync(fileName, `p95,${p95}\n`);

console.log("Statistics appended.");