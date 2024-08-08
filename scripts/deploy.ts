import { ethers, upgrades } from "hardhat";
import { ZeroAddress } from "ethers";
import hre from "hardhat";

const UNISWAP_V3_FACTORY_ADDRESS = "0x8A74c5E686D33C5Fe5F98c361f6e24e35e899EF6";
const GAMMA_FEE_RECEIPIENT = "0x8381c90a455c162E0aCA3cBE80e7cE5D590C7703";

async function main() {
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  console.log("Deploying contracts...");

  // BXT
  // const BXT = await ethers.deployContract("BaseXToken");
  // await BXT.waitForDeployment();
  // console.log(`BXT deployed. Address: ${BXT.address}`);
  // await verifyContract(BXT.address, []);
  const FSX_ADDRESS = "0xF55a3cE00387A3BCD7f0FF74Bfdb07e445F110Ae";
  // const veArtProxy_ADDRESS = "0x83b1D50369D8C4dE4B78e60d705A66b1A94c96b7";
  // const veBXT_ADDRESS = "0xC34a168467641264F18Cf0Ea1D132AB4E4C95CEe";
  // const PermissionsRegistry_ADDRESS = "0x32C307651d3F50adeD6b59E00e5e0Fbba68F8C7C";
  // const rewardsDistributor_ADDRESS = "0x89711da2789a940c864e33EcD7EB299944893aa4";
  // const bribeFactoryV3_ADDRESS = "0x05e5226fa79f561dFe957AD18d7c1648A12a2866";
  // const gaugeFactoryV2CL_ADDRESS = "0x3a757209a89BECA685C56615c72E1B716c525E90";

  // veArtProxy
  const veArtProxy = await ethers.deployContract("VeArtProxyUpgradeable");
  await veArtProxy.deployed();
  await verifyContract(veArtProxy.address, []);

  // veBXT / VotingEscrow
  let input = [FSX_ADDRESS, veArtProxy.address];
  const veBXT = await ethers.deployContract("VotingEscrow", input);
  await veBXT.deployed();
  console.log(`veBXT deployed. Address: ${veBXT.address}`);
  await verifyContract(veBXT.address, input);

  // RewardsDistributor
  input = [veBXT.address];
  const rewardsDistributor = await ethers.deployContract(
    "RewardsDistributor",
    input
  );
  await rewardsDistributor.deployed();
  console.log(
    `rewardsDistributor deployed. Address: ${rewardsDistributor.address}`
  );
  await verifyContract(rewardsDistributor.address, input);

  // PERMISSIONS REGISTRY
  const permissionsRegistry = await ethers.deployContract(
    "PermissionsRegistry"
  );
  await permissionsRegistry.deployed();
  console.log(
    `Permissions Registry deployed. Address: ${permissionsRegistry.address}`
  );
  await verifyContract(permissionsRegistry.address, []);

  // BRIBE FACTORY
  input = [
    "0x0000000000000000000000000000000000000000",
    permissionsRegistry.address,
    [], // default reward tokens //TODO
  ];
  const bribeFactoryV3Contract = await ethers.getContractFactory(
    "BribeFactoryV3"
  );
  const bribeFactoryV3 = await upgrades.deployProxy(
    bribeFactoryV3Contract,
    input,
    {
      initializer: "initialize",
    }
  );
  // await bribeFactoryV3.waitForDeployment();
  let txDeployed = await bribeFactoryV3.deployed();
  console.log(`BribeFactoryV3 deployed. Address: ${bribeFactoryV3.address}`);
  await verifyContract(bribeFactoryV3.address, []);
  await sleep(30000);

  // GAUGE FACTORY V2 CL
  input = [permissionsRegistry.address, GAMMA_FEE_RECEIPIENT];
  const gaugeFactoryV2CLContract = await ethers.getContractFactory(
    "GaugeFactoryV2_CL"
  );
  const gaugeFactoryV2CL = await upgrades.deployProxy(
    gaugeFactoryV2CLContract,
    input,
    {
      initializer: "initialize",
    }
  );
  // await gaugeFactoryV2CL.waitForDeployment();
  await gaugeFactoryV2CL.deployed();
  console.log(`GaugeFactoryV2CL deployed. Address: ${gaugeFactoryV2CL.address}`);
  await verifyContract(gaugeFactoryV2CL.address, []);
  await sleep(30000);

  // Voter V3
  input = [
    veBXT.address,
    UNISWAP_V3_FACTORY_ADDRESS,
    gaugeFactoryV2CL.address,
    bribeFactoryV3.address,
  ];
  const voterV3Contract = await ethers.getContractFactory("VoterV3");
  const voterV3 = await upgrades.deployProxy(voterV3Contract, input, {
    initializer: "initialize",
  });
  // await voterV3.waitForDeployment();
  await voterV3.deployed();
  console.log(`VoterV3 deployed. Address: ${voterV3.address}`);
  await verifyContract(voterV3.address, []);
  // await sleep(30000);

  // Minter
  const MinterContract = await ethers.getContractFactory("MinterUpgradeable");
  const minter = await upgrades.deployProxy(
    MinterContract,
    [voterV3.address, veBXT.address, rewardsDistributor.address],
    {
      initializer: "initialize",
    }
  );

  // await minter.waitForDeployment();
  await minter.deployed();
  console.log(`Minter deployed. Address: ${minter.address}`);
  await verifyContract(minter.address, []);

  console.log("Print contract addresses ==============>");
  // console.log(`let BXTAddress = "${BXT.address}";`);
  console.log(`veArtProxyAddress = ${veArtProxy.address};`);
  console.log(`veBXTAddress = ${veBXT.address};`);
  console.log(
    `rewardsDistributorAddress = ${rewardsDistributor.address};`
  );
  console.log(
    `permissionsRegistryAddress = ${permissionsRegistry.address};`
  );
  console.log(`bribeFactoryV3Address = ${bribeFactoryV3.address};`);
  console.log(`gaugeFactoryV2CLAddress = ${gaugeFactoryV2CL.address};`);
  console.log(`voteV3Address = ${voterV3.address};`);
  console.log(`minterAddress = ${minter.address};`);
}

async function verifyContract(contractAddress: any, input: any[]) {
  try {
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: input,
    });
  } catch (error) {
    console.log(`Verify ${contractAddress} error`, error);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
