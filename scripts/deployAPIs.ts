import { ethers, upgrades } from "hardhat";
import hre from "hardhat";

const voterV3 = "0x6079f8B37980181b4aC09610f6Ff4088A87Bc282";
const rewardDistributor = "0x7E342297C17b595d9f66889f99D30295a7739674";

async function main() {
  console.log("Deploying APIs...");

  // PAIR API
  const pairAPIContract = await ethers.getContractFactory("PairAPI");
  const pairAPI = await upgrades.deployProxy(pairAPIContract, [voterV3], {
    initializer: "initialize",
  });
  await pairAPI.waitForDeployment();
  console.log(`PairAPI deployed. Address: ${pairAPI.target}`);

  await hre.run("verify:verify", {
    address: pairAPI.target,
    constructorArguments: [],
  });

  // veNFT API
  const veNFTAPIContract = await ethers.getContractFactory("veNFTAPI");
  const veNFTAPI = await upgrades.deployProxy(
    veNFTAPIContract,
    [voterV3, rewardDistributor, pairAPI.target],
    {
      initializer: "initialize",
    }
  );
  await veNFTAPI.waitForDeployment();
  console.log(`veNFTAPI deployed. Address: ${veNFTAPI.target}`);

  await hre.run("verify:verify", {
    address: veNFTAPI.target,
    constructorArguments: [],
  });

  // REWARD API
  const rewardAPIContract = await ethers.getContractFactory("RewardAPI");
  const rewardAPI = await upgrades.deployProxy(rewardAPIContract, [voterV3], {
    initializer: "initialize",
  });
  await rewardAPI.waitForDeployment();
  console.log(`RewardAPI deployed. Address: ${rewardAPI.target}`);

  await hre.run("verify:verify", {
    address: rewardAPI.target,
    constructorArguments: [],
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
