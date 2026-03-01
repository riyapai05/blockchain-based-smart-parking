const ParkingSlots = artifacts.require("ParkingSlots");

module.exports = function (deployer) {
  deployer.deploy(ParkingSlots, 100); // 100 parking slots
};