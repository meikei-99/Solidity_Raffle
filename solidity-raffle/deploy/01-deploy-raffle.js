const { network } = require("hardhat")
const { networkConfig, developmentChains } = require("../helper-hardhat-config") //
const { verify } = require("../utils/verify")

const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("3")
let vrfCoordinatorV2Address, subscriptionId, vrfCoordinatorV2Mock

module.exports = async (hre) => {
    const { getNamedAccounts, deployments } = hre
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    if (developmentChains.includes(network.name)) {
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
        const transactionResponse =
            await vrfCoordinatorV2Mock.createSubscription()
        const transactionReceipt = await transactionResponse.wait(1)
        subscriptionId = transactionReceipt.events[0].args.subId
        //Fund the subscription
        //Usually, we need link token on real network
        await vrfCoordinatorV2Mock.fundSubscription(
            subscriptionId,
            VRF_SUB_FUND_AMOUNT
        )
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"]
        subscriptionId = networkConfig[chainId]["subscriptionId"]
    }

    const entranceFee = networkConfig[chainId]["entranceFee"]
    const gasLane = networkConfig[chainId]["gasLane"]
    const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"]
    const interval = networkConfig[chainId]["interval"]

    const args = [
        vrfCoordinatorV2Address,
        entranceFee,
        gasLane,
        subscriptionId,
        callbackGasLimit,
        interval
    ]

    const raffle = await deploy("Raffle", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmation: network.config.blockConfirmations || 1
    })

    if (chainId == 31337) {
        await vrfCoordinatorV2Mock.addConsumer(
            subscriptionId.toNumber(),
            raffle.address
        )
    }

    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        await verify(raffle.address, args)
    }
    log("--------------------------------------")
}

module.exports.tags = ["all", "raffle"]
