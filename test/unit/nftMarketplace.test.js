const { assert, expect } = require("chai")
const { network, deployments, ethers, getNamedAccounts } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")
// const { parseEther } = require("ethers").utils

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("NftMarketplace unit tests", async function () {
          let nftMarketplace, basicNft
          const PRICE = ethers.utils.parseEther("0.1")
          const TOKEN_ID = 1

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              accounts = await ethers.getSigners()
              user = accounts[1]
              await deployments.fixture(["all"])
              nftMarketplace = await ethers.getContract("NftMarketplace")
              basicNft = await ethers.getContract("BasicNFT")
              await basicNft.mintNft()
              await basicNft.approve(nftMarketplace.address, TOKEN_ID)
          })

          describe("listItem", function () {
              it("It lists and can be bought", async function () {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  const userConnectedNftMarketplace = nftMarketplace.connect(user)
                  await userConnectedNftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
                      value: PRICE,
                  })
                  const newOwner = await basicNft.ownerOf(TOKEN_ID)
                  const deployerProceeds = await nftMarketplace.getProceeds(deployer)
                  assert(newOwner.toString() == user.address)
                  assert(deployerProceeds.toString() == PRICE.toString())
              })

              it("Emits an event when NFT is listed", async function () {
                  expect(await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)).to.emit(
                      "ItemListed"
                  )
              })

              it("Reverts if NFT is already listed", async function () {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  const error = `AlreadyListed("${basicNft.address}", ${TOKEN_ID})`
                  await expect(
                      nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWith(error)
              })

              it("Reverts if price is not above 0", async function () {
                  await expect(
                      nftMarketplace.listItem(basicNft.address, TOKEN_ID, 0)
                  ).to.be.revertedWith("NftMarketplace__PriceMustBeAboveZero")
              })

              it("Reverts if token not approved", async function () {
                  await basicNft.approve(ethers.constants.AddressZero, TOKEN_ID)
                  await expect(
                      nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWith("NftMarketplace__NotApprovedForMarketplace")
              })

              it("onlyOwner can list an NFT", async function () {
                  notOwner = nftMarketplace.connect(user)
                  await expect(
                      notOwner.listItem(basicNft.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWith("NftMarketplace__NotOwner")
              })
          })

          describe("buyItem", function () {
              it("Reverts if NFT not listed", async function () {
                  await expect(
                      nftMarketplace.buyItem(basicNft.address, TOKEN_ID)
                  ).to.be.revertedWith("NftMarketplace__NotListed")
              })

              it("Reverts if price not met", async function () {
                  LOW_BALL = ethers.utils.parseEther("0.05")
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  const userConnectedNftMarketplace = nftMarketplace.connect(user)
                  await expect(
                      userConnectedNftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
                          value: LOW_BALL,
                      })
                  ).to.be.revertedWith("NftMarketplace__PriceNotMet")
              })

              it("transfers the nft to the buyer and updates internal proceeds record", async function () {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  nftMarketplaceUser = nftMarketplace.connect(user)
                  expect(
                      await nftMarketplaceUser.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
                  ).to.emit("ItemBought")
                  const newOwner = await basicNft.ownerOf(TOKEN_ID)
                  const seller = accounts[0]
                  const deployerProceeds = await nftMarketplace.getProceeds(seller.address)
                  assert(newOwner.toString() == user.address)
                  assert(deployerProceeds.toString() == PRICE.toString())
              })
          })
          describe("cancelItem", function () {
              it("reverts if item not listed", async function () {
                  await expect(
                      nftMarketplace.cancelItem(basicNft.address, TOKEN_ID)
                  ).to.be.revertedWith("NftMarketplace__NotListed")
              })

              it("OnlyOwner can call cancelItem", async function () {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  nftMarketplaceUser = nftMarketplace.connect(user)
                  await expect(
                      nftMarketplaceUser.cancelItem(basicNft.address, TOKEN_ID)
                  ).to.be.revertedWith("NftMarketplace__NotOwner")
              })

              it("Emits event and succesfully deletes listing after function called", async function () {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  expect(await nftMarketplace.cancelItem(basicNft.address, TOKEN_ID)).to.emit(
                      "ItemCanceled"
                  )
                  expect(nftMarketplace.getListing(basicNft.address, TOKEN_ID)).to.be.revertedWith(
                      "NftMarketplace__NotListed"
                  )
              })
          })

          describe("updateListing", function () {
              it("Emits event and succesfully updates price", async function () {
                  const NEW_PRICE = ethers.utils.parseEther("0.2")
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  expect(
                      await nftMarketplace.updateListing(basicNft.address, TOKEN_ID, NEW_PRICE)
                  ).to.emit("ItemListed")
              })
          })

          describe("withdrawProceeds", function () {
              it("Doesn't allow withdrawals if there are no proceeds", async function () {
                  await expect(nftMarketplace.withdrawProceeds()).to.be.revertedWith(
                      "NftMarketplace__NoProceeds"
                  )
              })

              it("Withdraws proceeds", async function () {
                  nftMarketplacecontract = await ethers.getContract("NftMarketplace")
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  nftMarketplace = nftMarketplacecontract.connect(user)
                  await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
                  nftMarketplace = nftMarketplacecontract.connect(accounts[0])

                  const deployerProceedsBefore = await nftMarketplace.getProceeds(
                      accounts[0].address
                  )
                  const deployerBalanceBefore = await accounts[0].getBalance()
                  const txResponse = await nftMarketplace.withdrawProceeds()
                  const transactionReciept = await txResponse.wait(1)
                  const { gasUsed, effectiveGasPrice } = transactionReciept
                  const gasCost = gasUsed.mul(effectiveGasPrice)
                  const deployerBalanceAfter = await accounts[0].getBalance()

                  assert(
                      deployerBalanceAfter.add(gasCost).toString() ==
                          deployerProceedsBefore.add(deployerBalanceBefore).toString()
                  )
              })
          })
      })
