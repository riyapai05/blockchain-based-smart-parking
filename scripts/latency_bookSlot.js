const fs = require("fs");
const ParkingSlots = artifacts.require("Parking");
const path = require("path");

module.exports = async function (callback) {
  try {
    const accounts = await web3.eth.getAccounts();
    const instance = await ParkingSlots.deployed();

    const runs = 20;
    const results = [];

    for (let i = 0; i < runs; i++) {
      console.log(`Run: ${i + 1}`);

      // Find a free slot
      let freeSlot = -1;
      const totalSlots = await instance.totalSlots();

      for (let s = 0; s < totalSlots; s++) {
        const status = await instance.getSlotStatus(s);
        if (status[0] === true) {
          freeSlot = s;
          break;
        }
      }

      if (freeSlot === -1) {
        console.log("No free slot available. Skipping run.\n");
        await new Promise(r => setTimeout(r, 60000));
        continue;
      }

      const start = Date.now();

      // Book slot
      const tx = await instance.bookSlot(
        freeSlot,
        `CAR-${i}`,
        { from: accounts[0] }
      );

      await web3.eth.getTransactionReceipt(tx.tx);

      const end = Date.now();
      const latency = (end - start) / 1000;
      results.push(latency);

      console.log(`Latency: ${latency} seconds`);
      console.log(`Slot Used: ${freeSlot}`);
      console.log(`Tx Hash: ${tx.tx}`);
      console.log("---------------------------");

      // Release slot immediately
      await instance.releaseSlot(freeSlot, { from: accounts[0] });

      // Wait 2–3 minutes (network spacing)
      await new Promise(r => setTimeout(r, 120000));
    }

    // Save to project-root/results/latency
    const resultsDir = path.resolve("results/latency");

    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const filePath = path.join(resultsDir, "latency_bookSlot.csv");

    fs.writeFileSync(filePath, results.join("\n"));

    console.log("BookSlot latency testing completed.");
    console.log("Saved to:", filePath);

    callback();

  } catch (err) {
    console.error("Error:", err);
    callback(err);
  }
};