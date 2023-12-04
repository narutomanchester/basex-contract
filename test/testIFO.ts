import { ContractTransactionResponse, parseEther } from "ethers";
import { ethers } from "hardhat";
import { expect } from "chai";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import {
  IFODeployerV3,
  MockERC20,
  IFOInitializableV3,
} from "../typechain-types";
import exp from "constants";
const { BN, time } = require("@openzeppelin/test-helpers");
let _totalInitSupply = parseEther("5000000");

let _startBlock: typeof BN;
let _endBlock: typeof BN;

let offeringAmountPool0 = parseEther("50");
let raisingAmountPool0 = parseEther("5");
let limitPerUserInLP = parseEther("0.5");

let offeringAmountPool1 = parseEther("1000");
let raisingAmountPool1 = parseEther("100");

let offeringTotalAmount = offeringAmountPool0 + offeringAmountPool1;
let raisingAmountTotal = raisingAmountPool0 + raisingAmountPool1;

let mockLP: MockERC20, mockOC: MockERC20;

let deployer: IFODeployerV3;

let mockIFO: IFOInitializableV3;

let [alice, bob, carol, david, erin, frank] = [] as HardhatEthersSigner[];
let accounts = [] as HardhatEthersSigner[];
let rewardsStartBlock;

const REWARDS_START_BLOCK = 100;
describe("IFO DeployerV3", () => {
  before(async () => {
    [alice, bob, carol, david, erin, frank, ...accounts] =
      await ethers.getSigners();

    mockLP = await ethers.deployContract(
      "MockERC20",
      ["Mock LP", "LP", _totalInitSupply],
      { from: alice }
    );

    mockOC = await ethers.deployContract(
      "MockERC20",
      ["Mock Offering Coin", "OC", parseEther("100000000")],
      { from: alice }
    );

    rewardsStartBlock =
      (await time.latestBlock()).toNumber() + REWARDS_START_BLOCK;
  });

  describe("Initial contract parameters for all contracts", function () {
    it("Bob/Carol/David/Erin mint tokens", async () => {
      let i = 0;

      for (let thisUser of [bob, carol, david, erin]) {
        // Mints 10,000 LP tokens
        await mockLP.connect(thisUser).mintTokens(parseEther("10000"));

        i++;
      }

      // 4 generic accounts too
      for (let thisUser of accounts) {
        // Mints 1,000 LP tokens
        await mockLP.connect(thisUser).mintTokens(parseEther("1000"));

        i++;
      }
    });
  });

  describe("IFO DeployerV3 #0 - Initial set up", async () => {
    it("The IFODeployerV3 is deployed and initialized", async () => {
      deployer = await ethers.deployContract("IFODeployerV3", [], {
        from: alice,
      });

      await deployer.waitForDeployment();
    });
  });

  describe("IFO #1 - Initial set up", async () => {
    it("The IFO #1 is deployed and initialized", async () => {
      _startBlock = new BN(await time.latestBlock()).add(new BN("50"));
      _endBlock = new BN(await time.latestBlock()).add(new BN("250"));

      let result = await deployer.createIFO(
        mockLP.target,
        mockOC.target,
        _startBlock.toString(),
        _endBlock.toString(),
        alice,
        {
          from: alice,
        }
      );

      const receipt = await result.wait();
      let ifoAddress = (receipt?.logs[2] as any).args[0];

      expect(result).to.emit(deployer, "NewIFOContract").withArgs(ifoAddress);

      mockIFO = await ethers.getContractAt("IFOInitializableV3", ifoAddress);

      await expect(
        mockIFO.updateStartAndEndBlocks("195", "180", { from: alice })
      ).to.be.revertedWith(
        "Operations: New startBlock must be lower than new endBlock"
      );

      result = await mockIFO.updateStartAndEndBlocks(
        _startBlock.toString(),
        _endBlock.toString(),
        {
          from: alice,
        }
      );

      expect(result)
        .to.emit(mockIFO, "NewStartAndEndBlocks")
        .withArgs({ startBlock: _startBlock, endBlock: _endBlock });
    });

    it("Mock IFO is deployed without pools set", async () => {
      const res1 = await mockIFO.viewUserAllocationPools(alice, ["0", "1"]);
      expect(res1[0]).to.equal(0n);
      expect(res1[1]).to.equal(0n);

      const res = await mockIFO.viewUserInfo(alice, ["0", "1"]);

      const res2 = await mockIFO.viewUserInfo(alice, ["0", "1"]);

      expect(res2[0][0]).to.equal("0");
      expect(res2[0][1]).to.equal("0");
      expect(res2[1][0]).to.equal(false);
      expect(res2[1][1]).to.equal(false);

      const res3 = await mockIFO.viewUserOfferingAndRefundingAmountsForPools(
        alice,
        [0, 1]
      );

      expect(res3[0][0]).to.equal("0");
      expect(res3[0][1]).to.equal("0");
      expect(res3[0][2]).to.equal("0");
      expect(res3[1][0]).to.equal("0");
      expect(res3[1][1]).to.equal("0");
      expect(res3[1][2]).to.equal("0");
    });

    it("Pools are set", async () => {
      const price0 =
        Number((raisingAmountPool0 * 100n) / offeringAmountPool0) / 100;
      const price1 =
        Number((raisingAmountPool1 * 100n) / offeringAmountPool1) / 100;
      expect(price0).to.equal(price1, "MUST_BE_EQUAL_PRICES");

      expect(
        await mockIFO.setPool(
          offeringAmountPool0,
          raisingAmountPool0,
          limitPerUserInLP,
          false,
          "0",
          { from: alice }
        )
      )
        .to.emit(mockIFO, "PoolParametersSet")
        .withArgs({
          offeringAmountPool: offeringAmountPool0.toString(),
          raisingAmountPool: raisingAmountPool0.toString(),
          pid: "0",
        });

      expect(await mockIFO.totalTokensOffered()).to.equal(offeringAmountPool0);
      expect(await mockIFO.viewPoolTaxRateOverflow("0")).to.equal("0");

      const result = await mockIFO.setPool(
        offeringAmountPool1,
        raisingAmountPool1,
        "0",
        true,
        "1",
        { from: alice }
      );

      expect(await mockIFO.viewPoolTaxRateOverflow("1")).to.equal(
        "10000000000"
      );
      expect(result).to.emit(mockIFO, "PoolParametersSet").withArgs({
        offeringAmountPool: offeringAmountPool1.toString(),
        raisingAmountPool: raisingAmountPool1.toString(),
        pid: "1",
      });

      expect(await mockIFO.totalTokensOffered()).to.equal(offeringTotalAmount);
    });

    it("All users are approving the tokens to be spent by the IFO", async () => {
      for (let thisUser of [bob, carol, david, erin]) {
        await mockLP
          .connect(thisUser)
          .approve(mockIFO.target, parseEther("1000"));
      }

      // 14 generic accounts too
      for (let thisUser of accounts) {
        // Approves LP to be spent by mockIFO
        await mockLP
          .connect(thisUser)
          .approve(mockIFO.target, parseEther("1000"));
      }
    });
  });

  describe("IFO #1 - OVERFLOW FOR BOTH POOLS", async () => {
    it("User cannot deposit if tokens not deposited", async () => {
      await mockLP.connect(bob).approve(mockIFO.target, parseEther("100000"));

      await expect(
        mockIFO.connect(bob).depositPool(parseEther("0.6"), "0")
      ).to.be.revertedWith("Deposit: Too early");

      await expect(
        mockIFO.connect(bob).depositPool(parseEther("0.6"), "1")
      ).to.be.revertedWith("Deposit: Too early");
    });

    it("User cannot deposit in pools if amount is 0", async () => {
      await time.advanceBlockTo(_startBlock);
      await expect(
        mockIFO.connect(bob).depositPool(parseEther("0"), "0")
      ).to.be.revertedWith("Deposit: Amount must be > 0");
      await expect(
        mockIFO.connect(bob).depositPool(parseEther("0"), "1")
      ).to.be.revertedWith("Deposit: Amount must be > 0");
    });

    it("User cannot deposit in pools that don't exist", async () => {
      await expect(
        mockIFO.connect(bob).depositPool(parseEther("0"), "2")
      ).to.be.revertedWith("Deposit: Non valid pool id");
    });

    it("User cannot deposit if tokens not deposited", async () => {
      await expect(
        mockIFO.connect(bob).depositPool(parseEther("0.3"), "0")
      ).to.be.revertedWith("Deposit: Tokens not deposited properly");
      await expect(
        mockIFO.connect(bob).depositPool(parseEther("0.3"), "1")
      ).to.be.revertedWith("Deposit: Tokens not deposited properly");

      // Transfer the offering amount1 to the IFO contract
      await mockOC.transfer(mockIFO.target, offeringAmountPool1);

      await expect(
        mockIFO.connect(bob).depositPool(parseEther("0.3"), "0")
      ).to.be.revertedWith("Deposit: Tokens not deposited properly");
      await expect(
        mockIFO.connect(bob).depositPool(parseEther("0.3"), "1")
      ).to.be.revertedWith("Deposit: Tokens not deposited properly");

      // Transfer the offering amount0 to the IFO contract
      await mockOC.transfer(mockIFO.target, offeringAmountPool0);

      expect(await mockOC.balanceOf(mockIFO.target)).to.be.equal(
        offeringTotalAmount
      );
    });

    it("User cannot deposit in pool0 if amount higher than the limit", async () => {
      await expect(
        mockIFO.connect(bob).depositPool(parseEther("0.6"), "0")
      ).to.be.revertedWith("Deposit: New amount above user limit");
    });

    it("User (Bob) can deposit in pool0", async () => {
      expect(await mockIFO.connect(bob).depositPool(parseEther("0.3"), "0"))
        .to.emit(mockIFO, "Deposit")
        .withArgs({
          user: bob,
          amount: parseEther("0.3").toString(),
          pid: "0",
        });

      const result = await mockIFO.viewUserAllocationPools(bob, [0]);
      expect(result[0]).to.equal("1000000000000"); // 100% of the pool

      const expectedResult =
        (parseEther("0.3") * offeringAmountPool0) / raisingAmountPool0;

      const result2 = await mockIFO.viewUserOfferingAndRefundingAmountsForPools(
        bob,
        [0, 1]
      );

      expect(result2[0][0]).to.equal(expectedResult);
      expect(result2[0][1]).to.equal(parseEther("0"));
      expect(result2[0][2]).to.equal(parseEther("0"));
      expect(result2[1][0]).to.equal(parseEther("0"));
      expect(result2[1][1]).to.equal(parseEther("0"));
      expect(result2[1][2]).to.equal(parseEther("0"));

      const result3 = await mockIFO.viewUserInfo(bob, ["0", "1"]);
      expect(result3[0][0]).to.equal(parseEther("0.3"));
      expect(await mockLP.balanceOf(mockIFO.target)).to.equal(
        parseEther("0.3")
      );

      // TOTAL AMOUNT IN POOL0 is 0.3 LP token
      const result4 = await mockIFO.viewPoolInformation(0);
      expect(result4[4]).to.equal(parseEther("0.3"));
    });

    it("User cannot deposit more in pool0 if new amount + amount > limit", async () => {
      await expect(
        mockIFO.connect(bob).depositPool(parseEther("0.200001"), "0")
      ).to.be.revertedWith("Deposit: New amount above user limit");
    });

    it("User (Bob) deposits 0.1 LP ", async () => {
      expect(await mockIFO.connect(bob).depositPool(parseEther("0.1"), "0"))
        .to.emit(mockIFO, "Deposit")
        .withArgs({
          user: bob,
          amount: parseEther("0.1").toString(),
          pid: "0",
        });

      const result = await mockIFO.viewUserInfo(bob, ["0", "1"]);
      expect(result[0][0]).to.equal(parseEther("0.4"));
      expect(await mockLP.balanceOf(mockIFO.target)).to.equal(
        parseEther("0.4")
      );

      // TOTAL AMOUNT IN POOL0 is 0.4 LP token
      expect((await mockIFO.viewPoolInformation(0))[4]).to.equal(
        parseEther("0.4")
      );
    });

    it("User (Carol) deposits in pool0", async () => {
      await mockIFO.connect(carol).depositPool(parseEther("0.5"), "0");

      expect((await mockIFO.viewUserAllocationPools(bob, [0]))[0]).to.be.equal(
        "444444444444"
      );
      expect(
        (await mockIFO.viewUserAllocationPools(carol, [0]))[0]
      ).to.be.equal("555555555555");

      const expectedResult =
        (parseEther("0.5") * offeringAmountPool0) / raisingAmountPool0;

      const result = await mockIFO.viewUserOfferingAndRefundingAmountsForPools(
        carol,
        [0, 1]
      );

      expect(result[0][0]).to.equal(expectedResult);
      expect(result[0][1]).to.equal(parseEther("0"));
      expect(result[0][2]).to.equal(parseEther("0"));
      expect(result[1][0]).to.equal(parseEther("0"));
      expect(result[1][1]).to.equal(parseEther("0"));
      expect(result[1][2]).to.equal(parseEther("0"));

      const result2 = await mockIFO.viewUserInfo(carol, ["0", "1"]);
      expect(result2[0][0]).to.equal(parseEther("0.5"));
      expect(await mockLP.balanceOf(mockIFO.target)).to.equal(
        parseEther("0.9")
      );

      // TOTAL AMOUNT IN POOL0 is 0.3 LP token
      expect((await mockIFO.viewPoolInformation(0))[4]).to.equal(
        parseEther("0.9")
      );
    });

    it("User (David) deposits in pool0", async () => {
      await mockIFO.connect(david).depositPool(parseEther("0.1"), "0");

      // 0.4/1 * 1M = 400,000
      let expectedResult = (parseEther("0.4") * BigInt(1e12)) / parseEther("1");
      expect((await mockIFO.viewUserAllocationPools(bob, [0]))[0]).to.be.equal(
        expectedResult
      );

      // 0.5/1 * 1M = 500,000
      expectedResult = (parseEther("0.5") * BigInt(1e12)) / parseEther("1");
      expect(
        (await mockIFO.viewUserAllocationPools(carol, [0]))[0]
      ).to.be.equal(expectedResult);

      // 0.1/1 * 1M = 100,000
      expectedResult = (parseEther("0.1") * BigInt(1e12)) / parseEther("1");
      expect(
        (await mockIFO.viewUserAllocationPools(david, [0]))[0]
      ).to.be.equal(expectedResult);

      // TOTAL AMOUNT IN POOL0 is 0.4 LP token
      expect((await mockIFO.viewPoolInformation(0))[4]).to.equal(
        parseEther("1")
      );

      expectedResult =
        (parseEther("0.1") * offeringAmountPool0) / raisingAmountPool0;

      const result = await mockIFO.viewUserOfferingAndRefundingAmountsForPools(
        david,
        [0, 1]
      );

      expect(result[0][0]).to.equal(expectedResult);
      expect(result[0][1]).to.equal(parseEther("0"));
      expect(result[0][2]).to.equal(parseEther("0"));
      expect(result[1][0]).to.equal(parseEther("0"));
      expect(result[1][1]).to.equal(parseEther("0"));
      expect(result[1][2]).to.equal(parseEther("0"));

      expect((await mockIFO.viewUserInfo(david, ["0", "1"]))[0][0]).to.equal(
        parseEther("0.1").toString()
      );

      expect(await mockLP.balanceOf(mockIFO.target)).to.equal(parseEther("1"));
    });

    it("14 accounts deposit in pool0", async () => {
      for (let thisUser of accounts) {
        await mockIFO.connect(thisUser).depositPool(parseEther("0.5"), "0");
      }

      // No tax on overflow for pool 1
      expect(await mockIFO.viewPoolTaxRateOverflow("0")).to.be.equal("0");

      // TOTAL AMOUNT IN POOL0 is 0.5 * 14 + 1 = 8 LP tokens
      expect((await mockIFO.viewPoolInformation(0))[4]).to.equal(
        parseEther("8")
      );
    });

    it("User (Bob) can deposit in pool1", async () => {
      expect(await mockIFO.connect(bob).depositPool(parseEther("4"), "1"))
        .to.emit(mockIFO, "Deposit")
        .withArgs({
          user: bob,
          amount: parseEther("4").toString(),
          pid: "1",
        });

      expect((await mockIFO.viewUserAllocationPools(bob, [1]))[0]).to.be.equal(
        "1000000000000"
      );

      let expectedResult =
        (parseEther("4") * offeringAmountPool1) / raisingAmountPool1;

      const result = await mockIFO.viewUserOfferingAndRefundingAmountsForPools(
        bob,
        [0, 1]
      );

      expect(result[1][0]).to.equal(expectedResult);
      expect(result[1][1]).to.equal(parseEther("0"));
      expect(result[1][2]).to.equal(parseEther("0"));

      expect((await mockIFO.viewUserInfo(bob, [0, 1]))[0][1]).to.equal(
        parseEther("4").toString()
      );
    });

    it("User (Carol) deposits in pool1", async () => {
      expect(await mockIFO.connect(carol).depositPool(parseEther("5"), "1"))
        .to.emit(mockIFO, "Deposit")
        .withArgs({
          user: carol,
          amount: parseEther("5").toString(),
          pid: "1",
        });

      // 9 LP
      expect((await mockIFO.viewUserAllocationPools(bob, [1]))[0]).to.be.equal(
        "444444444444"
      );
      expect(
        (await mockIFO.viewUserAllocationPools(carol, [1]))[0]
      ).to.be.equal("555555555555");

      const expectedResult =
        (parseEther("5") * offeringAmountPool1) / raisingAmountPool1;

      const result = await mockIFO.viewUserOfferingAndRefundingAmountsForPools(
        carol,
        [0, 1]
      );

      expect(result[1][0]).to.equal(expectedResult);

      expect((await mockIFO.viewUserInfo(carol, [0, 1]))[0][1]).to.equal(
        parseEther("5")
      );
    });

    it("User (David) deposits in pool1", async () => {
      await mockIFO.connect(david).depositPool(parseEther("3"), "1");

      // 10 LP
      // 4/12 * 1M = 333,333
      let expectedResult = (parseEther("4") * BigInt(1e12)) / parseEther("12");
      expect((await mockIFO.viewUserAllocationPools(bob, [1]))[0]).to.be.equal(
        expectedResult
      );

      // 5/12 * 1M = 416,666
      expectedResult = (parseEther("5") * BigInt(1e12)) / parseEther("12");
      expect(
        (await mockIFO.viewUserAllocationPools(carol, [1]))[0]
      ).to.be.equal(expectedResult);

      // 3/12 * 1M = 250,000
      expectedResult = (parseEther("3") * BigInt(1e12)) / parseEther("12");
      expect(
        (await mockIFO.viewUserAllocationPools(david, [1]))[0]
      ).to.be.equal(expectedResult);

      expectedResult =
        (parseEther("3") * offeringAmountPool1) / raisingAmountPool1;

      expect(
        (
          await mockIFO.viewUserOfferingAndRefundingAmountsForPools(
            david,
            [0, 1]
          )
        )[1][0]
      ).to.equal(expectedResult);

      expect((await mockIFO.viewUserInfo(david, [0, 1]))[0][1]).to.equal(
        parseEther("3")
      );
    });

    it("Whale (account 0) deposits 88 LP in pool1", async () => {
      const amountDeposit = parseEther("88");
      await mockIFO.connect(accounts[0]).depositPool(amountDeposit, 1);

      // Tax overflow is 1%
      expect(await mockIFO.viewPoolTaxRateOverflow(1)).to.be.equal(
        "10000000000"
      );

      // NEW TOTAL AMOUNT IN POOL1 is 88 + 12 = 100 LP tokens
      expect((await mockIFO.viewPoolInformation(1))[4]).to.equal(
        parseEther("100")
      );

      const expectedResult = (amountDeposit * BigInt(1e12)) / parseEther("100");
      expect(
        (await mockIFO.viewUserAllocationPools(accounts[0], [1]))[0]
      ).to.equal(expectedResult);
    });

    it("Whale (account 1) deposits 300 LP in pool1", async () => {
      const amountDeposit = parseEther("300");
      await mockIFO.connect(accounts[1]).depositPool(amountDeposit, 1);

      // Tax overflow is 1%
      expect(await mockIFO.viewPoolTaxRateOverflow(1)).to.be.equal(
        "10000000000"
      );

      // NEW TOTAL AMOUNT IN POOL1 is 300 + 100 = 400 LP tokens
      expect((await mockIFO.viewPoolInformation(1))[4]).to.equal(
        parseEther("400")
      );

      const expectedResult = (amountDeposit * BigInt(1e12)) / parseEther("400");
      expect(
        (await mockIFO.viewUserAllocationPools(accounts[1], [1]))[0]
      ).to.equal(expectedResult);
    });

    it("Whale (account 2) deposits 600 LP in pool1", async () => {
      const amountDeposit = parseEther("600");
      await mockIFO.connect(accounts[2]).depositPool(amountDeposit, 1);

      // Tax overflow is 1%
      expect(await mockIFO.viewPoolTaxRateOverflow(1)).to.be.equal(
        "10000000000"
      );

      // NEW TOTAL AMOUNT IN POOL1 is 600 + 400 = 1,000 LP tokens
      expect((await mockIFO.viewPoolInformation(1))[4]).to.equal(
        parseEther("1000")
      );

      const expectedResult =
        (amountDeposit * BigInt(1e12)) / parseEther("1000");
      expect(
        (await mockIFO.viewUserAllocationPools(accounts[2], [1]))[0]
      ).to.equal(expectedResult);
    });

    it("Cannot harvest before end of the IFO", async () => {
      await expect(mockIFO.connect(bob).harvestPool(0)).to.be.revertedWith(
        "Harvest: Too early"
      );
      await time.advanceBlockTo(_endBlock);
    });

    it("Cannot harvest with wrong pool id", async () => {
      await expect(mockIFO.connect(bob).harvestPool(2)).to.be.revertedWith(
        "Harvest: Non valid pool id"
      );
    });

    it("Cannot deposit to any of the pools", async () => {
      await expect(
        mockIFO.connect(bob).depositPool(parseEther("1"), 0)
      ).to.be.revertedWith("Deposit: Too late");
      await expect(
        mockIFO.connect(bob).depositPool(parseEther("1"), 1)
      ).to.be.revertedWith("Deposit: Too late");
    });

    it("Cannot harvest if didn't participate", async () => {
      await expect(mockIFO.connect(frank).harvestPool(0)).to.be.revertedWith(
        "Harvest: Did not participate"
      );
      await expect(mockIFO.connect(frank).harvestPool(1)).to.be.revertedWith(
        "Harvest: Did not participate"
      );
    });
  });
});
