const { developmentChains } = require("../helper-hardhat-config");
const { network } = require("hardhat");
const BASE_FEE = ethers.utils.parseEther("0.25");
const GAS_PRICE_LINK = 1e9;

module.exports = async (hre) => {
  const { getNamedAccounts, deployments } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const args = [BASE_FEE, GAS_PRICE_LINK];

  if (developmentChains.includes(network.name)) {
    log("Local network detected! Deploying mocks...");
    //deploy a mock vrfcoordianator
    await deploy("VRFCoordinatorV2Mock", {
      from: deployer,
      args: args,
      log: true,
      waitConfirmation: network.config.blockConfirmations || 1,
    });
    log("Mocks deployed!");
    log("----------------------------");
  }
};
module.exports.tags = ["all", "mocks"];
