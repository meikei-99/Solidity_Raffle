const { assert, expect } = require("chai")
const { ethers, deployments, network, getNamedAccounts } = require("hardhat")
const {
    networkConfig,
    developmentChains
} = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Tests", function () {
          let raffle,
              raffleContract,
              vrfCoordinatorV2Mock,
              raffleEntraceFee,
              interval,
              player,
              deployer
          const chainId = network.config.chainId

          beforeEach(async () => {
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["all"])
              raffle = await ethers.getContract("Raffle", deployer)
              vrfCoordinatorV2Mock = await ethers.getContract(
                  "VRFCoordinatorV2Mock",
                  deployer
              )
              raffleEntraceFee = await raffle.getEntranceFee()
              interval = await raffle.getInterval()
          })

          describe("constructor", function () {
              it("Initialize the raffle correctly", async function () {
                  const raffleState = await raffle.getRaffleState()
                  assert.equal(raffleState.toString(), "0")
                  assert.equal(
                      interval.toString(),
                      networkConfig[chainId]["interval"]
                  )
              })
          })

          describe("enterRaffle", function () {
              it("Fails if not enough entrance fee", async function () {
                  await expect(raffle.enterRaffle()).to.be.revertedWith(
                      "Raffle__NotEnoughETHEntered"
                  )
              })

              it("Record player when enter", async function () {
                  await raffle.enterRaffle({ value: raffleEntraceFee })
                  const playerFromContract = await raffle.getPlayer(0)
                  assert.equal(playerFromContract, deployer)
              })

              it("Emits an event on enter", async function () {
                  await expect(
                      raffle.enterRaffle({ value: raffleEntraceFee })
                  ).to.emit(raffle, "RaffleEnter")
              })

              it("Doesnt allow enterance when raffle is calculationg", async function () {
                  await raffle.enterRaffle({ value: raffleEntraceFee })
                  await network.provider.send("evm_increaseTime", [
                      interval.toNumber() + 1
                  ])
                  await network.provider.request({
                      method: "evm_mine",
                      params: []
                  })
                  await raffle.performUpkeep([])
                  expect(
                      raffle.enterRaffle({ value: raffleEntraceFee })
                  ).to.be.revertedWith("Raffle_NotOpen")
              })
          })

          describe("checkUpkeep", function () {
              it("Returns false if people havent send any ETH", async function () {
                  await network.provider.send("evm_increaseTime", [
                      interval.toNumber() + 1
                  ])
                  await network.provider.request({
                      method: "evm_mine",
                      params: []
                  })
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep(
                      []
                  )
                  assert.equal(upkeepNeeded, false)
              })

              it("Returns false if raffle not open", async function () {
                  await raffle.enterRaffle({ value: raffleEntraceFee })
                  await network.provider.send("evm_increaseTime", [
                      interval.toNumber() + 1
                  ])
                  await network.provider.request({
                      method: "evm_mine",
                      params: []
                  })
                  await raffle.performUpkeep([])
                  const raffleState = raffle.getRaffleState()
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep(
                      []
                  )
                  assert(raffleState.toString(), "1")
                  assert.equal(upkeepNeeded, false)
              })

              it("Return false if enough time hasnt paased", async function () {
                  await raffle.enterRaffle({ value: raffleEntraceFee })
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep(
                      []
                  )
                  assert.equal(upkeepNeeded, false)
              })

              it("Return true if time has passed, has players, eth and is open", async function () {
                  await raffle.enterRaffle({ value: raffleEntraceFee })
                  await network.provider.send("evm_increaseTime", [
                      interval.toNumber() + 1
                  ])
                  await network.provider.request({
                      method: "evm_mine",
                      params: []
                  })
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep(
                      []
                  )
                  await assert(upkeepNeeded)
              })
          })

          describe("performUpkeep", function () {
              it("can only be run if checkUpkeep is true", async function () {
                  await raffle.enterRaffle({ value: raffleEntraceFee })
                  await network.provider.send("evm_increaseTime", [
                      interval.toNumber() + 1
                  ])
                  await network.provider.request({
                      method: "evm_mine",
                      params: []
                  })
                  const tx = await raffle.performUpkeep([])
                  assert(tx)
              })

              it("reverts if checkUpkeep is false", async function () {
                  await expect(raffle.performUpkeep([])).to.be.revertedWith(
                      "Raffle__UpkeepNotNeeded"
                  )
              })

              it("updates the raffle state, emits event, calls vrf coordinator", async function () {
                  await raffle.enterRaffle({ value: raffleEntraceFee })
                  await network.provider.send("evm_increaseTime", [
                      interval.toNumber() + 1
                  ])
                  await network.provider.request({
                      method: "evm_mine",
                      params: []
                  })
                  const txResponse = await raffle.performUpkeep([])
                  const txReceipt = await txResponse.wait(1)
                  const requestId = txReceipt.events[1].args.requestId
                  const raffleState = raffle.getRaffleState()
                  assert(raffleState.toString(), "1")
                  assert(requestId.toNumber() > 0)
              })
          })

          describe("fullfillRandomWords", function () {
              beforeEach(async function () {
                  await raffle.enterRaffle({ value: raffleEntraceFee })
                  await network.provider.send("evm_increaseTime", [
                      interval.toNumber() + 1
                  ])
                  await network.provider.request({
                      method: "evm_mine",
                      params: []
                  })
              })

              it("can only be called after performUpkeep", async function () {
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address) // reverts if not fulfilled
                  ).to.be.revertedWith("nonexistent request")
              })

              it("picks a winner, resets, and sends money", async function () {
                  const additionalEntrances = 3 // to test
                  const startingIndex = 1
                  const accounts = await ethers.getSigners()

                  for (
                      let i = startingIndex;
                      i < startingIndex + additionalEntrances;
                      i++
                  ) {
                      const accountConnectedRaffle = raffle.connect(accounts[i]) // Returns a new instance of the Raffle contract connected to player
                      await accountConnectedRaffle.enterRaffle({
                          value: raffleEntraceFee
                      })
                  }
                  const startingTimeStamp = await raffle.getLatestTimeStamp()
                  await new Promise(async (resolve, reject) => {
                      raffle.once("WinnerPicked", async () => {
                          console.log("Found the winner")
                          try {
                              const recentWinner =
                                  await raffle.getRecentWinner()
                              const raffleState = await raffle.getRaffleState()
                              const endingTimeStamp =
                                  await raffle.getLatestTimeStamp()
                              const numOfPlayers =
                                  await raffle.getNumberOfPlayers()
                              const winnerEndingBalance =
                                  await accounts[1].getBalance()
                              await expect(raffle.getPlayer(0)).to.be.reverted
                              assert.equal(numOfPlayers.toString(), "0")
                              assert.equal(raffleState.toString(), "0")
                              assert(endingTimeStamp > startingTimeStamp)
                              assert(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance.add(
                                      raffleEntraceFee
                                          .mul(additionalEntrances)
                                          .add(raffleEntraceFee)
                                          .toString()
                                  )
                              )
                              resolve()
                          } catch (e) {
                              reject(e)
                          }
                      })
                      const tx = await raffle.performUpkeep([])
                      const txReceipt = await tx.wait(1)
                      const winnerStartingBalance =
                          await accounts[1].getBalance()
                      await vrfCoordinatorV2Mock.fulfillRandomWords(
                          txReceipt.events[1].args.requestId,
                          raffle.address
                      )
                  })
              })
          })
      })
