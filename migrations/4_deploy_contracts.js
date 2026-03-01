const SlotAllocationAdmin = artifacts.require("SlotAllocationAdmin");

module.exports = async function (deployer) {
  // Deploy with 50 slots (you can change this)
  await deployer.deploy(SlotAllocationAdmin, 50);
};