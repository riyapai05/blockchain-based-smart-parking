const PriorityParking = artifacts.require("PriorityParking");

module.exports = function (deployer) {
  deployer.deploy(PriorityParking, 20); // example: 20 slots
};