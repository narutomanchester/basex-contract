import { ethers } from "hardhat";
import hre from "hardhat";

async function main() {
  console.log("Deploying test tokens...");

  const [owner] = await ethers.getSigners();

  const weth = await ethers.deployContract("TestToken", [
    "Wrapped Ethereum",
    "WETH",
  ]);

  console.log(`WETH deployed. Address: ${weth.target}`);
  let balance = await weth.balanceOf(owner.address);
  console.log(`WETH Balance of Owner: ${balance}`);

  await hre.run("verify:verify", {
    address: weth.target,
    constructorArguments: ["Wrapped Ethereum", "WETH"],
    contract: "contracts/TestToken.sol:TestToken"
  });

  const usdc = await ethers.deployContract("TestToken", ["USD Coin", "USDC"]);

  console.log(`USDC deployed. Address: ${usdc.target}`);
  balance = await usdc.balanceOf(owner.address);
  console.log(`USDC Balance of Owner: ${balance}`);

  await hre.run("verify:verify", {
    address: usdc.target,
    constructorArguments: ["USD Coin", "USDC"],
    contract: "contracts/TestToken.sol:TestToken"
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
