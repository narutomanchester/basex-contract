import { ethers } from "hardhat";

async function main() {
  console.log("Deploying tokens and reward distributor...");

  const bxt = await ethers.deployContract("BaseXToken");
  await bxt.waitForDeployment();

  console.log(`BXT deployed. Address: ${bxt.target}`);

  const veArtProxy = await ethers.deployContract("VeArtProxyUpgradeable");
  await veArtProxy.waitForDeployment();

  console.log(`veArtProxy deployed. Address: ${veArtProxy.target}`);

  const veBXT = await ethers.deployContract("VotingEscrow", [
    bxt.target,
    veArtProxy.target,
  ]);
  await veBXT.waitForDeployment();

  console.log(`veBXT deployed. Address: ${veBXT.target}`);

  const rewardsDistributor = await ethers.deployContract("RewardsDistributor", [
    veBXT.target,
  ]);
  await rewardsDistributor.waitForDeployment();

  console.log(`RewardsDistributor deployed. Address: ${rewardsDistributor.target}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
