const { ethers } = require("hardhat")
const { networkConfig, developmentChains } = require("../helper-hardhat-config") //require("dotenv").config()
const fs = require("fs")

const FRONT_END_ADDRESSES_FILE =
    "../nextjs-raffle/constants/contractAddress.json"
const FRONT_END_ABI_FILE = "../nextjs-raffle/constants/abi.json"

module.exports = async () => {
    if (process.env.UPDATE_FRONT_END) {
        console.log("Writing to front end...")
        await updateContractAddress()
        await updateAbi()
    }
}

async function updateAbi() {
    const raffle = await ethers.getContract("Raffle")
    fs.writeFileSync(
        FRONT_END_ABI_FILE,
        raffle.interface.format(ethers.utils.FormatTypes.json)
    )
}

async function updateContractAddress() {
    const raffle = await ethers.getContract("Raffle")
    const chainId = network.config.chainId.toString()
    const currentAddresses = JSON.parse(
        fs.readFileSync(FRONT_END_ADDRESSES_FILE, "utf8")
    )

    if (chainId in currentAddresses) {
        if (!currentAddresses[chainId].includes(raffle.address)) {
            currentAddresses[chainId].push(raffle.address)
        }
    } else {
        currentAddresses[chainId] = [raffle.address]
    }
    fs.writeFileSync(FRONT_END_ADDRESSES_FILE, JSON.stringify(currentAddresses))
}

module.exports.tags = ["all", "front-end"]
