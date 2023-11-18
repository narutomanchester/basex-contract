import { ethers, upgrades } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ZeroAddress } from "ethers";

import { expect } from "chai";
import {
  BaseXToken,
  VotingEscrow,
  IUniProxy,
  ISwapRouter,
  TestToken,
  PermissionsRegistry,
  BribeFactoryV3,
  RewardsDistributor,
  MinterUpgradeable,
  GaugeExtraRewarder,
  IHypervisor,
  GaugeV2_CL,
  CLFeesVault,
  Bribe,
  VoterV3,
} from "../typechain-types";

const swapRouterAddress = "0xde2Bd2ffEA002b8E84ADeA96e5976aF664115E2c";

// token addresses
const wethAddress = "0x5FeaeBfB4439F3516c74939A9D04e95AFE82C4ae";
const usdcAddress = "0x976fcd02f7C4773dd89C309fBF55D5923B4c98a1";
// const BXTAddress = "0xB4f34879C2c3db50934E5069CE01fD5EcE3Aa051";
// const veBXTAddress = "0xb84De814F9834d600039a0151E7f0105e1Fcf923";

// const rewardDistributorAddress = "0x986aaa537b8cc170761FDAC6aC4fc7F9d8a20A8C";

const uniProxyAddress = "0x82e01223d51Eb87e16A03E24687EDF0F294da6f1";
const hyperWETHUSDCADddress = "0x32EEce76C2C2e8758584A83Ee2F522D4788feA0f";

// users
const BigHolder = ethers.getAddress(
  "0x8894E0a0c962CB723c1976a4421c95949bE2D4E3"
); //used to add liquidity and swaps

const UNISWAP_V3_FACTORY_ADDRESS = "0x4826533B4897376654Bb4d4AD88B7faFD0C98528";
const GAMMA_FEE_RECEIPIENT = "0xfbE533Ac756f65E783B00df7B860755959B51880";

let timestampBefore: number;
let owner: HardhatEthersSigner;
let BXT: BaseXToken;
let veBXT: VotingEscrow;
let uniProxy: IUniProxy;
let hyperWETHUSDC: IHypervisor;
let swapRouter: ISwapRouter;
let weth: TestToken;
let usdc: TestToken;
let permissionsRegistry: PermissionsRegistry;
let bribeFactoryV3: any;
let gaugeFactoryV2CL: any;
let voterV3: VoterV3;
let minter: MinterUpgradeable;
let lpBalanceDeposited: BigInt;
let gauge: GaugeV2_CL;
let feeVault: CLFeesVault;
let extBribe: Bribe;
let rewardsDistributor: RewardsDistributor;
let intBribe: Bribe;
let gaugeExtraRewarder: GaugeExtraRewarder;
let nftIDs: BigInt[];

describe("BaseX - Deployment Section", function () {
  beforeEach(async () => {
    await ethers.provider.send("evm_increaseTime", [5]);
    await ethers.provider.send("evm_mine");

    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    timestampBefore = blockBefore ? blockBefore.timestamp : 0;
  });

  it("Should load external contract for test (ERC20,LPs,..)", async function () {
    [owner] = await ethers.getSigners();

    BXT = await ethers.deployContract("BaseXToken");

    await BXT.waitForDeployment();

    console.log(`BXT deployed. Address: ${BXT.target}`);
    const veArtProxy = await ethers.deployContract("VeArtProxyUpgradeable");
    await veArtProxy.waitForDeployment();

    veBXT = await ethers.deployContract("VotingEscrow", [
      BXT.target,
      veArtProxy.target,
    ]);
    await veBXT.waitForDeployment();

    console.log(`veBXT deployed. Address: ${veBXT.target}`);

    rewardsDistributor = await ethers.deployContract("RewardsDistributor", [
      veBXT.target,
    ]);
    await rewardsDistributor.waitForDeployment();

    console.log(
      `rewardsDistributor deployed. Address: ${rewardsDistributor.target}`
    );

    uniProxy = await ethers.getContractAt("IUniProxy", uniProxyAddress);

    hyperWETHUSDC = await ethers.getContractAt(
      "IHypervisor",
      hyperWETHUSDCADddress
    );

    swapRouter = await ethers.getContractAt("ISwapRouter", swapRouterAddress);

    weth = await ethers.getContractAt("TestToken", wethAddress);
    usdc = await ethers.getContractAt("TestToken", usdcAddress);
  });

  it("Should deploy PermissionsRegistry.sol", async function () {
    permissionsRegistry = await ethers.deployContract("PermissionsRegistry");
    const accounts = await ethers.getSigners();
    owner = accounts[0];
    expect(await permissionsRegistry.baseXMultisig()).to.equals(owner.address);

    await permissionsRegistry.setRoleFor(owner.address, "GOVERNANCE");
    expect(
      await permissionsRegistry.hasRole(
        await permissionsRegistry.__helper_stringToBytes("GOVERNANCE"),
        owner.address
      )
    ).to.equal(true);

    await permissionsRegistry.setRoleFor(owner.address, "VOTER_ADMIN");
    expect(
      await permissionsRegistry.hasRole(
        await permissionsRegistry.__helper_stringToBytes("VOTER_ADMIN"),
        owner.address
      )
    ).to.equal(true);

    await permissionsRegistry.setRoleFor(owner.address, "GAUGE_ADMIN");
    expect(
      await permissionsRegistry.hasRole(
        await permissionsRegistry.__helper_stringToBytes("GAUGE_ADMIN"),
        owner.address
      )
    ).to.equal(true);

    await permissionsRegistry.setRoleFor(owner.address, "BRIBE_ADMIN");
    expect(
      await permissionsRegistry.hasRole(
        await permissionsRegistry.__helper_stringToBytes("BRIBE_ADMIN"),
        owner.address
      )
    ).to.equal(true);

    await permissionsRegistry.setRoleFor(owner.address, "FEE_MANAGER");
    expect(
      await permissionsRegistry.hasRole(
        await permissionsRegistry.__helper_stringToBytes("FEE_MANAGER"),
        owner.address
      )
    ).to.equal(true);

    await permissionsRegistry.setRoleFor(BigHolder, "FEE_MANAGER");
    expect(
      await permissionsRegistry.hasRole(
        await permissionsRegistry.__helper_stringToBytes("FEE_MANAGER"),
        BigHolder
      )
    ).to.equal(true);

    await permissionsRegistry.setRoleFor(owner.address, "CL_FEES_VAULT_ADMIN");
    expect(
      await permissionsRegistry.hasRole(
        await permissionsRegistry.__helper_stringToBytes("CL_FEES_VAULT_ADMIN"),
        owner.address
      )
    ).to.equal(true);
  });

  it("Should deploy BribeFactoryV3.sol", async function () {
    const BribeFactoryV3 = await ethers.getContractFactory("BribeFactoryV3");
    bribeFactoryV3 = await upgrades.deployProxy(
      BribeFactoryV3,
      [
        ZeroAddress,
        permissionsRegistry.target,
        [], // default reward tokens
      ],
      {
        initializer: "initialize",
      }
    );

    await bribeFactoryV3.waitForDeployment();

    console.log("BribeFactoryV3:", bribeFactoryV3.target);
    console.log("owner:", await bribeFactoryV3.owner());

    expect(await bribeFactoryV3.owner()).to.equal(owner.address);
  });

  it("Should deploy GaugeFactoryV2.sol", async function () {
    const GaugeFactoryV2CL = await ethers.getContractFactory(
      "GaugeFactoryV2_CL"
    );
    gaugeFactoryV2CL = await upgrades.deployProxy(
      GaugeFactoryV2CL,
      [permissionsRegistry.target, GAMMA_FEE_RECEIPIENT],
      {
        initializer: "initialize",
      }
    );

    await gaugeFactoryV2CL.waitForDeployment();

    console.log("GaugeFactoryV2_CL:", gaugeFactoryV2CL.target);

    expect(await gaugeFactoryV2CL.owner()).to.equal(owner.address);
  });

  it("Should deploy VoterV3.sol", async function () {
    const VoterV3 = await ethers.getContractFactory("VoterV3");

    voterV3 = (await upgrades.deployProxy(
      VoterV3,
      [
        veBXT.target,
        UNISWAP_V3_FACTORY_ADDRESS,
        gaugeFactoryV2CL.target,
        bribeFactoryV3.target,
      ],
      {
        initializer: "initialize",
      }
    )) as unknown as VoterV3;

    await voterV3.waitForDeployment();

    expect(await voterV3.owner()).to.equal(owner.address);
  });

  it("Should deploy Minter.sol", async function () {
    const Minter = await ethers.getContractFactory("MinterUpgradeable");

    minter = (await upgrades.deployProxy(
      Minter,
      [voterV3.target, veBXT.target, rewardsDistributor.target],
      {
        initializer: "initialize",
      }
    )) as unknown as MinterUpgradeable;

    await minter.waitForDeployment();

    expect(await minter.team()).to.equal(owner.address);

    console.log("BXT Minter before:", await BXT.minter());
    await BXT.setMinter(minter.target);
    console.log(
      "BXT Minter after:",
      await BXT.minter(),
      minter.target,
      owner.address
    );
  });

  it("Should set all", async function () {
    //voter
    await voterV3._init(
      [wethAddress, usdcAddress],
      permissionsRegistry.target,
      minter.target
    );

    //
    await minter._initialize(
      [owner.address],
      [BigInt(10_000 * 1e18).toString()],
      BigInt(50 * 1e6 * 1e18).toString()
    );

    await rewardsDistributor.setDepositor(minter.target);

    // set voter to veBXT
    await veBXT.setVoter(voterV3.target);
    expect(await veBXT.voter()).to.equal(voterV3.target);

    expect(await voterV3.isWhitelisted(usdcAddress)).to.equal(true);
    expect(await voterV3.permissionRegistry()).to.equal(
      permissionsRegistry.target
    );
    // await voterV3.addFactory(gaugeFactoryV2CL.target);
    expect(await voterV3.isGaugeFactory(gaugeFactoryV2CL.target)).to.equal(
      true
    );

    // bribe factory
    await bribeFactoryV3.setVoter(voterV3.target);
    expect(await bribeFactoryV3.voter()).to.equal(voterV3.target);
  });
});

describe("BaseX - LP Section", function () {
  beforeEach(async () => {
    await ethers.provider.send("evm_increaseTime", [5]);
    await ethers.provider.send("evm_mine");

    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    timestampBefore = blockBefore ? blockBefore.timestamp : 0;
  });

  it("Should add Liquidity", async function () {
    const amount0 = ethers.parseEther("10");

    const [suggestedAmount] = await uniProxy.getDepositAmount(
      hyperWETHUSDCADddress,
      wethAddress,
      amount0
    );

    console.log("To deposit ", amount0, "WETH");
    console.log("Hypervisor suggest deposit USDC amount:", suggestedAmount);

    await weth.approve(hyperWETHUSDCADddress, amount0);
    await usdc.approve(hyperWETHUSDCADddress, suggestedAmount.toString());

    await uniProxy.deposit(
      amount0.toString(),
      suggestedAmount.toString(),
      owner.address,
      hyperWETHUSDCADddress,
      [0, 0, 0, 0]
    );

    lpBalanceDeposited = await hyperWETHUSDC.balanceOf(owner.address);
    expect(lpBalanceDeposited).to.be.above(0);

    console.log("lpBalanceDeposited:", lpBalanceDeposited);
  });
});

describe("BaseX - Gauge Section", function () {
  beforeEach(async () => {
    await ethers.provider.send("evm_increaseTime", [5]);
    await ethers.provider.send("evm_mine");

    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    timestampBefore = blockBefore ? blockBefore.timestamp : 0;
  });

  it("Should create Gauge for Concentrated liqudity", async function () {
    await voterV3.createGauges([hyperWETHUSDCADddress], [0]);
    const gaugeAddress = await voterV3.gauges(hyperWETHUSDCADddress);
    const extBribeAddress = await voterV3.external_bribes(gaugeAddress);
    const intBribeAddress = await voterV3.internal_bribes(gaugeAddress);

    console.log("gaugeAddress:", gaugeAddress);
    console.log("extBribeAddress:", extBribeAddress);
    console.log("intBribeAddress:", intBribeAddress);
    expect(gaugeAddress).not.to.equal(ZeroAddress);
    expect(intBribeAddress).not.to.equal(ZeroAddress);
    expect(intBribeAddress).not.to.equal(ZeroAddress);

    gauge = await ethers.getContractAt("GaugeV2_CL", gaugeAddress);
    feeVault = await ethers.getContractAt(
      "CLFeesVault",
      await gauge.feeVault()
    );
    extBribe = await ethers.getContractAt("Bribe", extBribeAddress);
    intBribe = await ethers.getContractAt("Bribe", intBribeAddress);
    console.log("symbol: ", await intBribe.TYPE());
  });

  it("Should deploy extra rewarder for hypervisor gauge", async function () {
    // deploy
    gaugeExtraRewarder = await ethers.deployContract("GaugeExtraRewarder", [
      wethAddress,
      gauge.target,
    ]);

    await gaugeExtraRewarder.waitForDeployment();

    console.log("gaugeExtraRewarder: ", gaugeExtraRewarder.target);
    expect(await gaugeExtraRewarder.owner()).to.equal(owner.address);

    await gaugeFactoryV2CL.setGaugeRewarder(
      [gauge.target],
      [gaugeExtraRewarder.target]
    );

    const amountIn = ethers.parseEther("10000");
    expect(await weth.balanceOf(gaugeExtraRewarder.target)).to.be.equal(0);
    await weth.transfer(gaugeExtraRewarder.target, amountIn);
    expect(await weth.balanceOf(gaugeExtraRewarder.target)).to.be.equal(
      amountIn
    );

    await gaugeExtraRewarder.setDistributionRate(ethers.parseEther("0.015"));
  });

  it("Should deposit into the gauge", async function () {
    expect(await gauge.balanceOf(owner.address)).to.be.equal(0);
    await hyperWETHUSDC.approve(gauge.target, lpBalanceDeposited.toString());
    await gauge.depositAll();
    const balance = await gauge.balanceOf(owner.address);
    expect(balance).to.be.above(0);
    console.log("Deposited balance:", balance.toString());
  });

  it("Should send fees to vault", async function () {
    const amountIn = ethers.parseEther("100");
    let wethBalance = await weth.balanceOf(feeVault.target);
    let usdcBalance = await usdc.balanceOf(feeVault.target);
    expect(wethBalance).to.be.equal(0);
    expect(usdcBalance).to.be.equal(0);
    await weth.transfer(feeVault.target, amountIn);
    await usdc.transfer(feeVault.target, amountIn);
    wethBalance = await weth.balanceOf(feeVault.target);
    usdcBalance = await usdc.balanceOf(feeVault.target);
    expect(wethBalance).to.be.equal(amountIn);
    expect(usdcBalance).to.be.equal(amountIn);
    // await weth.transfer(feeVault.target, amountIn);

    console.log("FeeVault Address:", feeVault.target);
    console.log("WETH Balance of FeeVault:", wethBalance);
    console.log("USDC Balance of FeeVault:", usdcBalance);
  });

  it("Should claim fees from vault", async function () {
    const intBribeAddress = intBribe.target;
    let wethBalance = await weth.balanceOf(intBribeAddress);
    let usdcBalance = await usdc.balanceOf(intBribeAddress);
    console.log("IntBribe address:", intBribeAddress);
    console.log(
      "Balances before distribute fees:",
      "WETH:",
      wethBalance,
      "USDC:",
      usdcBalance
    );

    expect(wethBalance).to.equal(0);
    await voterV3.distributeFees([gauge.target]);
    wethBalance = await weth.balanceOf(intBribeAddress);
    usdcBalance = await usdc.balanceOf(intBribeAddress);
    expect(wethBalance).to.above(0);
    console.log(
      "Balances after distribute fees:",
      "WETH:",
      wethBalance,
      "USDC:",
      usdcBalance
    );
  });
});

describe("BaseX - Voter Section", function () {
  beforeEach(async () => {
    await ethers.provider.send("evm_increaseTime", [5]);
    await ethers.provider.send("evm_mine");

    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    timestampBefore = blockBefore ? blockBefore.timestamp : 0;
  });

  it("Should lock BXT to get veBXT", async function () {
    // await BXT.initialMint(owner.address);
    // const bxtBalance = await BXT.balanceOf(owner.address);
    // console.log("BXT Balance:", bxtBalance);

    // const lockAmount = ethers.parseEther("1000");
    // await BXT.approve(veBXT.target, lockAmount);

    // console.log("allowance:", await BXT.allowance(owner.address, veBXT.target));

    // await veBXT.create_lock(lockAmount, 2 * 7 * 86400); //create lock for 2 weeks

    const veBXTCount = await veBXT.balanceOf(owner.address);
    expect(veBXTCount).to.above(0);
    console.log("veBXT Count:", veBXTCount);
    const promises = [];
    for (let i = 0; i < veBXTCount; i++) {
      promises.push(veBXT.tokenOfOwnerByIndex(owner.address, i));
    }
    nftIDs = await Promise.all(promises);
    console.log("veBXT NFT IDs:", nftIDs);
  });

  it("Should vote", async function () {
    const toVoteNFTID = Number(nftIDs[nftIDs.length - 1]);
    const votingPower = await veBXT.balanceOfNFT(toVoteNFTID);
    console.log("To vote NFT ID", toVoteNFTID);
    console.log("Vote power:", votingPower);

    await voterV3.vote(toVoteNFTID, [hyperWETHUSDCADddress], [100]);
    console.log(await voterV3.totalWeight());
  });

  it("Should send rewards to voter and distribute", async function () {
    const amountIn = ethers.parseEther("1000");
    await BXT.approve(voterV3.target, amountIn);
    let blockNumBefore = await ethers.provider.getBlockNumber();
    let blockBefore = await ethers.provider.getBlock(blockNumBefore);
    console.log("Block timestamp before:", blockBefore?.timestamp);
    console.log("ActivePeriod:", await minter.active_period());
    await ethers.provider.send("evm_increaseTime", [7 * 86400]);
    await ethers.provider.send("evm_mine");
    blockNumBefore = await ethers.provider.getBlockNumber();
    blockBefore = await ethers.provider.getBlock(blockNumBefore);
    console.log("Block timestamp after:", blockBefore?.timestamp);
    console.log("checked:", await minter.check());
    await minter.update_period();

    const balance = await BXT.balanceOf(voterV3.target);
    console.log("BXT Balance of voter:", balance);
    // expect(balance).to.equal(amountIn);

    console.log("BXT Balance of minter:", await BXT.balanceOf(minter.target));

    console.log("Minter of BXT", await BXT.minter());

    await ethers.provider.send("evm_increaseTime", [5 * 86400]);
    await ethers.provider.send("evm_mine");

    // expect(await voterV3.totalWeightAt(1700299329)).to.above(0);
    // expect(await BXT.balanceOf(gauge.target)).to.equal(0);
  });
});
