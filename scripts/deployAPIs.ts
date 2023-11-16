import { ethers, upgrades } from "hardhat";

const voterV3 = "0x95401dc811bb5740090279Ba06cfA8fcF6113778";
const rewardDistributor = "0xa82fF9aFd8f496c3d6ac40E2a0F282E47488CFc9";
const uniswapV3Factory = "";

async function main() {
  console.log("Deploying APIs...");

  // PAIR API
  const pairAPIContract = await ethers.getContractFactory("PairAPI");
  const pairAPI = await upgrades.deployProxy(
    pairAPIContract,
    [voterV3, uniswapV3Factory],
    {
      initializer: "initialize",
    }
  );
  await pairAPI.waitForDeployment();

  console.log(`PairAPI deployed. Address: ${pairAPI.target}`);

  // REWARD API
  const rewardAPIContract = await ethers.getContractFactory("RewardAPI");
  const rewardAPI = await upgrades.deployProxy(rewardAPIContract, [voterV3], {
    initializer: "initialize",
  });
  await rewardAPI.waitForDeployment();

  console.log(`RewardAPI deployed. Address: ${rewardAPI.target}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
