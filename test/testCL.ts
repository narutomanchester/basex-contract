import { ethers, upgrades } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ZeroAddress } from "ethers";

import { expect } from "chai";
import {
  FusionXToken,
  VotingEscrow,
  IUniProxy,
  ISwapRouter,
  ERC20,
  PermissionsRegistry,
  BribeFactoryV3,
  RewardsDistributor,
  MinterUpgradeable,
  GaugeExtraRewarder,
  IPairInfo,
  GaugeV2_CL,
  CLFeesVault,
  Bribe,
  VoterV3,
} from "../typechain-types";

const swapRouterAddress = "0x9425F9c882b947Ef7be4ABFdbd08A68837fa6307";

// token addresses
const wmntAddress = "0xc0eeCFA24E391E4259B7EF17be54Be5139DA1AC7";
const usdcAddress = "0xeA911b76c5681Fd2A46Cf951B320C7e39186f3F0";

// const uniProxyAddress = "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318";
const WMNTUSDTAddress = "0x6aa9bee79239700068d91a3ac5e641c9bf1c4371";

const UNISWAP_V3_FACTORY_ADDRESS = "0x8A74c5E686D33C5Fe5F98c361f6e24e35e899EF6";
const GAMMA_FEE_RECEIPIENT = "0x8381c90a455c162E0aCA3cBE80e7cE5D590C7703";

// users
const BigHolder = "0x8381c90a455c162E0aCA3cBE80e7cE5D590C7703";

let timestampBefore: number;
let owner: HardhatEthersSigner;
let FSX: FusionXToken;
let veFSX: VotingEscrow;
let uniProxy: IUniProxy;
let hyperWETHUSDC: IPairInfo;
let swapRouter: ISwapRouter;
let wmnt: ERC20;
let usdc: ERC20;
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

describe("FusionX - Deployment Section", function () {
  beforeEach(async () => {
    await ethers.provider.send("evm_increaseTime", [5]);
    await ethers.provider.send("evm_mine");

    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    timestampBefore = blockBefore ? blockBefore.timestamp : 0;
  });

  it("Should load external contract for test (ERC20,LPs,..)", async function () {
    [owner] = await ethers.getSigners();

    FSX = await ethers.deployContract("FusionX");

    // await FSX.deployed();
    let txDeployed = await FSX.deployed();

    console.log(`FSX deployed. Address: ${FSX.address}`);
    const veArtProxy = await ethers.deployContract("VeArtProxyUpgradeable");
    await veArtProxy.deployed();

    veFSX = await ethers.deployContract("VotingEscrow", [
      FSX.address,
      veArtProxy.address,
    ]);
    await veFSX.deployed();

    console.log(`veFSX deployed. Address: ${veFSX.address}`);

    rewardsDistributor = await ethers.deployContract("RewardsDistributor", [
      veFSX.address,
    ]);
    await rewardsDistributor.deployed();

    console.log(
      `rewardsDistributor deployed. Address: ${rewardsDistributor.address}`
    );

    // uniProxy = await ethers.getContractAt("IUniProxy", uniProxyAddress);

    // hyperWETHUSDC = await ethers.getContractAt(
    //   "IPairInfo",
    //   WMNTUSDTAddress
    // );

    // // swapRouter = await ethers.getContractAt("ISwapRouter", swapRouterAddress);

    // wmnt = await ethers.getContractAt("ERC20", wmntAddress);
    // usdc = await ethers.getContractAt("ERC20", usdcAddress);
  });

  it("Should deploy PermissionsRegistry.sol", async function () {
    permissionsRegistry = await ethers.deployContract("PermissionsRegistry");
    const accounts = await ethers.getSigners();
    owner = accounts[0];
    expect(await permissionsRegistry.fusionXMultisig()).to.equals(owner.address);

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
        "0x0000000000000000000000000000000000000000",
        permissionsRegistry.address,
        [], // default reward tokens
      ],
      {
        initializer: "initialize",
      }
    );

    await bribeFactoryV3.deployed();

    console.log("BribeFactoryV3:", bribeFactoryV3.address);
    console.log("owner:", await bribeFactoryV3.owner());

    expect(await bribeFactoryV3.owner()).to.equal(owner.address);
  });

  it("Should deploy GaugeFactoryV2.sol", async function () {
    const GaugeFactoryV2CL = await ethers.getContractFactory(
      "GaugeFactoryV2_CL"
    );
    gaugeFactoryV2CL = await upgrades.deployProxy(
      GaugeFactoryV2CL,
      [permissionsRegistry.address, GAMMA_FEE_RECEIPIENT],
      {
        initializer: "initialize",
      }
    );

    await gaugeFactoryV2CL.deployed();

    console.log("GaugeFactoryV2_CL:", gaugeFactoryV2CL.address);

    expect(await gaugeFactoryV2CL.owner()).to.equal(owner.address);
  });

  it("Should deploy VoterV3.sol", async function () {
    const VoterV3 = await ethers.getContractFactory("VoterV3");

    voterV3 = (await upgrades.deployProxy(
      VoterV3,
      [
        veFSX.address,
        UNISWAP_V3_FACTORY_ADDRESS,
        gaugeFactoryV2CL.address,
        bribeFactoryV3.address,
      ],
      {
        initializer: "initialize",
      }
    )) as unknown as VoterV3;

    await voterV3.deployed();

    console.log("VoterV3:", voterV3.address);

    expect(await voterV3.owner()).to.equal(owner.address);
  });

  it("Should deploy Minter.sol", async function () {
    const Minter = await ethers.getContractFactory("MinterUpgradeable");

    minter = (await upgrades.deployProxy(
      Minter,
      [voterV3.address, veFSX.address, rewardsDistributor.address],
      {
        initializer: "initialize",
      }
    )) as unknown as MinterUpgradeable;

    await minter.deployed();

    console.log("minter:", minter.address);

    expect(await minter.team()).to.equal(owner.address);
  });

  it("Should set all", async function () {
    // FSX
    console.log("FSX Minter before:", await FSX.minter());
    await FSX.initialMint(owner.address);

    const bxtBalance = await FSX.balanceOf(owner.address);
    console.log("FSX Balance:", bxtBalance);

    await FSX.setMinter(minter.address);
    console.log(
      "FSX Minter after:",
      await FSX.minter(),
      minter.address,
      owner.address
    );

    //voter
    await voterV3._init(
      [wmntAddress, usdcAddress],
      permissionsRegistry.address,
      minter.address
    );

    //minter
    await minter._initialize(
      [owner.address],
      [BigInt(10_000 * 1e18).toString()],
      BigInt(50 * 1e6 * 1e18).toString()
    );

    await rewardsDistributor.setDepositor(minter.address);

    // set voter to veFSX
    await veFSX.setVoter(voterV3.address);
    expect(await veFSX.voter()).to.equal(voterV3.address);

    expect(await voterV3.isWhitelisted(usdcAddress)).to.equal(true);
    expect(await voterV3.permissionRegistry()).to.equal(
      permissionsRegistry.address
    );
    // await voterV3.addFactory(gaugeFactoryV2CL.address);
    expect(await voterV3.isGaugeFactory(gaugeFactoryV2CL.address)).to.equal(
      true
    );

    // bribe factory
    await bribeFactoryV3.setVoter(voterV3.address);
    expect(await bribeFactoryV3.voter()).to.equal(voterV3.address);
  });
});

// describe("FusionX - LP Section", function () {
//   beforeEach(async () => {
//     await ethers.provider.send("evm_increaseTime", [5]);
//     await ethers.provider.send("evm_mine");

//     const blockNumBefore = await ethers.provider.getBlockNumber();
//     const blockBefore = await ethers.provider.getBlock(blockNumBefore);
//     timestampBefore = blockBefore ? blockBefore.timestamp : 0;
//   });

//   it("Should add Liquidity", async function () {
//     const amount0 = ethers.parseEther("10");

//     const [suggestedAmount] = await uniProxy.getDepositAmount(
//       WMNTUSDTAddress,
//       wmntAddress,
//       amount0
//     );

//     console.log("To deposit ", amount0, "WETH");
//     console.log("Hypervisor suggest deposit USDC amount:", suggestedAmount);

//     await wmnt.approve(WMNTUSDTAddress, amount0);
//     await usdc.approve(WMNTUSDTAddress, amount0);

//     await uniProxy.deposit(
//       amount0.toString(),
//       amount0.toString(),
//       owner.address,
//       WMNTUSDTAddress,
//       [0, 0, 0, 0]
//     );

//     lpBalanceDeposited = await hyperWETHUSDC.balanceOf(owner.address);
//     expect(lpBalanceDeposited).to.be.above(0);

//     console.log("lpBalanceDeposited:", lpBalanceDeposited);
//   });
// });

describe("FusionX - Gauge Section", function () {
  beforeEach(async () => {
    await ethers.provider.send("evm_increaseTime", [5]);
    await ethers.provider.send("evm_mine");

    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    timestampBefore = blockBefore ? blockBefore.timestamp : 0;
  });

  it("Should create Gauge for Concentrated liqudity", async function () {
    await voterV3.createGauges([WMNTUSDTAddress], [0]);
    const gaugeAddress = await voterV3.gauges(WMNTUSDTAddress);
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
      wmntAddress,
      gauge.address,
    ]);

    await gaugeExtraRewarder.deployed();

    console.log("gaugeExtraRewarder: ", gaugeExtraRewarder.address);
    expect(await gaugeExtraRewarder.owner()).to.equal(owner.address);

    await gaugeFactoryV2CL.setGaugeRewarder(
      [gauge.address],
      [gaugeExtraRewarder.address]
    );

    const amountIn = ethers.parseEther("10000");
    expect(await wmnt.balanceOf(gaugeExtraRewarder.address)).to.be.equal(0);
    await wmnt.transfer(gaugeExtraRewarder.address, amountIn);
    expect(await wmnt.balanceOf(gaugeExtraRewarder.address)).to.be.equal(
      amountIn
    );

    await gaugeExtraRewarder.setDistributionRate(ethers.parseEther("0.015"));
  });

  it("Should deposit into the gauge", async function () {
    expect(await gauge.balanceOf(owner.address)).to.be.equal(0);
    await hyperWETHUSDC.approve(gauge.address, lpBalanceDeposited.toString());
    await gauge.depositAll();
    const balance = await gauge.balanceOf(owner.address);
    expect(balance).to.be.above(0);
    console.log("Deposited balance:", balance.toString());
  });

  it("Should send fees to vault", async function () {
    const amountIn = ethers.parseEther("100");
    let wmntBalance = await wmnt.balanceOf(feeVault.address);
    let usdcBalance = await usdc.balanceOf(feeVault.address);
    expect(wmntBalance).to.be.equal(0);
    expect(usdcBalance).to.be.equal(0);
    await wmnt.transfer(feeVault.address, amountIn);
    await usdc.transfer(feeVault.address, amountIn);
    wmntBalance = await wmnt.balanceOf(feeVault.address);
    usdcBalance = await usdc.balanceOf(feeVault.address);
    expect(wmntBalance).to.be.equal(amountIn);
    expect(usdcBalance).to.be.equal(amountIn);
    // await wmnt.transfer(feeVault.address, amountIn);

    console.log("FeeVault Address:", feeVault.address);
    console.log("WETH Balance of FeeVault:", wmntBalance);
    console.log("USDC Balance of FeeVault:", usdcBalance);
  });

  it("Should claim fees from vault", async function () {
    const intBribeAddress = intBribe.address;
    let wmntBalance = await wmnt.balanceOf(intBribeAddress);
    let usdcBalance = await usdc.balanceOf(intBribeAddress);
    console.log("IntBribe address:", intBribeAddress);
    console.log(
      "Balances before distribute fees:",
      "WETH:",
      wmntBalance,
      "USDC:",
      usdcBalance
    );

    expect(wmntBalance).to.equal(0);
    await voterV3.distributeFees([gauge.address]);
    wmntBalance = await wmnt.balanceOf(intBribeAddress);
    usdcBalance = await usdc.balanceOf(intBribeAddress);
    expect(wmntBalance).to.above(0);
    console.log(
      "Balances after distribute fees:",
      "WETH:",
      wmntBalance,
      "USDC:",
      usdcBalance
    );
  });
});

describe("FusionX - Voter Section", function () {
  beforeEach(async () => {
    await ethers.provider.send("evm_increaseTime", [5]);
    await ethers.provider.send("evm_mine");

    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    timestampBefore = blockBefore ? blockBefore.timestamp : 0;
  });

  it("Should lock FSX to get veFSX", async function () {
    // const lockAmount = ethers.parseEther("1000");
    // await FSX.approve(veFSX.address, lockAmount);

    // console.log("allowance:", await FSX.allowance(owner.address, veFSX.address));

    // await veFSX.create_lock(lockAmount, 2 * 7 * 86400); //create lock for 2 weeks

    const veFSXCount = await veFSX.balanceOf(owner.address);
    expect(veFSXCount).to.above(0);
    console.log("veFSX Count:", veFSXCount);
    const promises = [];
    for (let i = 0; i < veFSXCount; i++) {
      promises.push(veFSX.tokenOfOwnerByIndex(owner.address, i));
    }
    nftIDs = await Promise.all(promises);
    console.log("veFSX NFT IDs:", nftIDs);
  });

  it("Should vote", async function () {
    const toVoteNFTID = Number(nftIDs[nftIDs.length - 1]);
    const votingPower = await veFSX.balanceOfNFT(toVoteNFTID);
    console.log("To vote NFT ID", toVoteNFTID);
    console.log("Vote power:", votingPower);

    await voterV3.vote(toVoteNFTID, [WMNTUSDTAddress], [100]);
    console.log("total weight:", await voterV3.totalWeight());
  });

  it("Should send rewards to voter and distribute", async function () {
    const amountIn = ethers.parseEther("1000");
    await FSX.approve(voterV3.address, amountIn);
    let blockNum = await ethers.provider.getBlockNumber();
    let block = await ethers.provider.getBlock(blockNum);
    const activePeriod = await minter.active_period();
    console.log("Block timestamp before:", block?.timestamp);
    console.log("ActivePeriod:", activePeriod);
    await ethers.provider.send("evm_increaseTime", [7 * 86400]);
    await ethers.provider.send("evm_mine");
    blockNum = await ethers.provider.getBlockNumber();
    block = await ethers.provider.getBlock(blockNum);
    console.log("Block timestamp after:", block?.timestamp);
    console.log("checked:", await minter.check());
    await minter.update_period();

    const balance = await FSX.balanceOf(voterV3.address);
    console.log("FSX Balance of voter:", balance);
    // expect(balance).to.equal(amountIn);

    console.log("FSX Balance of minter:", await FSX.balanceOf(minter.address));

    console.log("Minter of FSX", await FSX.minter());

    expect(await FSX.balanceOf(gauge.address)).to.equal(0);

    await voterV3.distributeAll();

    const balanceOfGauge = await FSX.balanceOf(gauge.address);
    expect(balanceOfGauge).to.above(0);

    console.log("Gauge FSX balance after distribute all:", balanceOfGauge);
  });
});

describe("Thena - Claim rewards Section", function () {
  beforeEach(async () => {
    await ethers.provider.send("evm_increaseTime", [5]);
    await ethers.provider.send("evm_mine");

    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    timestampBefore = blockBefore ? blockBefore.timestamp : 0;
  });

  it("Should harvest from gauge + extra rewarder", async function () {
    const balanceBefore = await FSX.balanceOf(owner.address);
    console.log("FSX balance before getReward: ", balanceBefore);
    await gauge["getReward()"]();
    const balancAfter = await FSX.balanceOf(owner.address);
    console.log("FSX balance after getReward: ", balancAfter);
    expect(balancAfter).to.above(balanceBefore);
  });

  it("Should get intBribes", async function () {
    await ethers.provider.send("evm_increaseTime", [8 * 86400]);
    await ethers.provider.send("evm_mine");
    await voterV3.distributeAll();
    await ethers.provider.send("evm_increaseTime", [8 * 86400]);
    await ethers.provider.send("evm_mine");
    await voterV3.distributeAll();

    const balanceBefore = await wmnt.balanceOf(owner.address);
    console.log("WETH balance before get intBribes: ", balanceBefore);
    await intBribe["getReward(address[])"]([wmnt.address]);
    const balancAfter = await wmnt.balanceOf(owner.address);
    console.log("WETH balance after get intBribes: ", balancAfter);
    expect(balancAfter).to.above(balanceBefore);

    // claimFees()
  });
});
