const { ethers, deployments, getNamedAccounts, network } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")
const { assert, expect } = require("chai")

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Staging Test", function () {
          let raffle, raffleEntraceFee, deployer
          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              raffle = await ethers.getContract("Raffle", deployer)
              raffleEntraceFee = await raffle.getEntranceFee()
          })

          describe("fulfillRandomWords", function () {
              it("Works with live chainlink keepers and chainlink VRF, we get a random winner", async function () {
                  console.log("Setting up test")
                  const startingTimeStamp = await raffle.getLatestTimeStamp()
                  const accounts = await ethers.getSigners()
                  //set up listener first before we enter raffle
                  //just in case blockchain move  very fast
                  await new Promise(async (resolve, reject) => {
                      raffle.once("WinnerPicked", async function () {
                          console.log("WinnerPicked event fired!!")
                          try {
                              //add assert
                              const recentWinner =
                                  await raffle.getRecentWinner()
                              const raffleState = await raffle.getRaffleState()
                              const winnerEndingBalance =
                                  await accounts[0].getBalance() //our deployer
                              const endingTimeStamp =
                                  await raffle.getLatestTimeStamp()

                              await expect(raffle.getPlayer(0)).to.be.reverted
                              assert.equal(
                                  recentWinner.toString(),
                                  accounts[0].address
                              )
                              assert.equal(raffleState, 0)
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance
                                      .add(raffleEntraceFee)
                                      .toString()
                              )
                              assert(endingTimeStamp > startingTimeStamp)
                              resolve()
                          } catch (e) {
                              console.log(e)
                              reject(e)
                          }
                      })
                      //enter the raffle
                      console.log("Entering Raffle...")
                      const tx = await raffle.enterRaffle({
                          value: raffleEntraceFee
                      })
                      await tx.wait(1)
                      console.log("Ok, time to wait...")
                      const winnerStartingBalance =
                          await accounts[0].getBalance()
                      //this code wont complete until our listener has finished listening
                  })
              })
          })
      })
