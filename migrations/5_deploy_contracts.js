const WaitlistManager = artifacts.require("WaitlistManager");

module.exports = async function (deployer) {
  await deployer.deploy(WaitlistManager);
};