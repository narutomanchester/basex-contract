import { ethers, upgrades } from "hardhat";
import { ZeroAddress } from "ethers";

const GAMM_FEE_RECEIPIENT = "0xfbE533Ac756f65E783B00df7B860755959B51880";

const veBXT = "0x9E545E3C0baAB3E08CdfD552C960A1050f373042";

async function main() {
  console.log("Deploying contracts...");

  // PERMISSIONS REGISTRY
  const permissionsRegistry = await ethers.deployContract(
    "PermissionsRegistry"
  );
  await permissionsRegistry.waitForDeployment();

  console.log(
    `Permissions Registry deployed. Address: ${permissionsRegistry.target}`
  );

  // BRIBE FACTORY
  const bribeFactoryV3Contrac = await ethers.getContractFactory(
    "BribeFactoryV3"
  );
  const bribeFactoryV3 = await upgrades.deployProxy(
    bribeFactoryV3Contrac,
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

  console.log(`BribeFactoryV3 deployed. Address: ${bribeFactoryV3.target}`);

  // GAUGE FACTORY V2 CL
  const gaugeFactoryV2CLContract = await ethers.getContractFactory(
    "GaugeFactoryV2_CL"
  );
  const gaugeFactoryV2CL = await upgrades.deployProxy(
    gaugeFactoryV2CLContract,
    [permissionsRegistry.target, GAMM_FEE_RECEIPIENT],
    {
      initializer: "initialize",
    }
  );
  await gaugeFactoryV2CL.waitForDeployment();

  console.log(`GaugeFactoryV2CL deployed. Address: ${gaugeFactoryV2CL.target}`);

  // GAUGE FACTORY V2 CL
  const voterV3Contract = await ethers.getContractFactory("VoterV3");
  const voterV3 = await upgrades.deployProxy(
    voterV3Contract,
    [veBXT, gaugeFactoryV2CL.target, bribeFactoryV3.target],
    {
      initializer: "initialize",
    }
  );
  await voterV3.waitForDeployment();

  console.log(`VoterV3 deployed. Address: ${voterV3.target}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
