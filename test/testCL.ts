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
  MinterUpgradeable,
  IHypervisor,
} from "../typechain-types";

const swapRouterAddress = "0xde2Bd2ffEA002b8E84ADeA96e5976aF664115E2c";

// token addresses
const wethAddress = "0x5FeaeBfB4439F3516c74939A9D04e95AFE82C4ae";
const usdcAddress = "0x976fcd02f7C4773dd89C309fBF55D5923B4c98a1";
const BXTAddress = "0x4bf010f1b9beDA5450a8dD702ED602A104ff65EE";
const veBXTAddress = "0x96F3Ce39Ad2BfDCf92C0F6E2C2CAbF83874660Fc";

const rewardDistributorAddress = "0x986aaa537b8cc170761FDAC6aC4fc7F9d8a20A8C";

const uniProxyAddress = "0x82e01223d51Eb87e16A03E24687EDF0F294da6f1";
const hyperWETHUSDCADddress = "0x32EEce76C2C2e8758584A83Ee2F522D4788feA0f";

// users
const BigHolder = ethers.getAddress(
  "0x8894E0a0c962CB723c1976a4421c95949bE2D4E3"
); //used to add liquidity and swaps

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
let voterV3: any;
let minter: any;
let lpBalanceDeposited: BigInt;

describe("BaseX.fi - Deployment Section", function () {
  beforeEach(async () => {
    await ethers.provider.send("evm_increaseTime", [5]);
    await ethers.provider.send("evm_mine");

    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    timestampBefore = blockBefore ? blockBefore.timestamp : 0;
    console.log("timestampBefore", timestampBefore);
  });

  it("Should load external contract for test (ERC20,LPs,..)", async function () {
    [owner] = await ethers.getSigners();

    BXT = await ethers.getContractAt("BaseXToken", BXTAddress);

    veBXT = await ethers.getContractAt("VotingEscrow", veBXTAddress);

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

    voterV3 = await upgrades.deployProxy(
      VoterV3,
      [veBXTAddress, gaugeFactoryV2CL.target, bribeFactoryV3.target],
      {
        initializer: "initialize",
      }
    );
    await voterV3.waitForDeployment();

    expect(await voterV3.owner()).to.equal(owner.address);
  });

  it("Should deploy Minter.sol", async function () {
    const Minter = await ethers.getContractFactory("MinterUpgradeable");

    minter = await upgrades.deployProxy(
      Minter,
      [voterV3.target, veBXTAddress, rewardDistributorAddress],
      {
        initializer: "initialize",
      }
    );

    await minter.waitForDeployment();

    expect(await minter.team()).to.equal(owner.address);
  });

  it("Should set all", async function () {
    //voter
    await voterV3._init(
      [wethAddress, usdcAddress],
      permissionsRegistry.target,
      minter.target
    );
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

describe("Thena - LP Section", function () {
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
