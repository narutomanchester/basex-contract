import { ethers } from "hardhat";
import { encodePriceSqrt } from "../test/shared/utilities";
const WETH_ADDRESS = "0x5FeaeBfB4439F3516c74939A9D04e95AFE82C4ae";
const USDC_ADDRESS = "0x976fcd02f7C4773dd89C309fBF55D5923B4c98a1";
const UNISWAP_V3_FACTORY_ADDRESS = "0x4826533B4897376654Bb4d4AD88B7faFD0C98528";

const DEFAULT_FEE = 3000;

async function main() {
  console.log("Deploying test pool...");

  const weth = await ethers.getContractAt(
    "contracts/interfaces/IERC20.sol:IERC20",
    WETH_ADDRESS
  );
  const usdc = await ethers.getContractAt(
    "contracts/interfaces/IERC20.sol:IERC20",
    USDC_ADDRESS
  );

  const uniswapV3Factory = await ethers.getContractAt(
    "IUniswapV3Factory",
    UNISWAP_V3_FACTORY_ADDRESS
  );

  const createPoolTx = await uniswapV3Factory.createPool(
    WETH_ADDRESS,
    USDC_ADDRESS,
    DEFAULT_FEE
  );
  await createPoolTx.wait();
  console.log(`Pool created. Tx:`, createPoolTx.hash);

  const poolAddress = await uniswapV3Factory.getPool(
    WETH_ADDRESS,
    USDC_ADDRESS,
    DEFAULT_FEE
  );

  console.log(`WETH/USDC Pool Address: `, poolAddress);

  console.log("Initializing pool...");

  const pool = await ethers.getContractAt("IUniswapV3Pool", poolAddress);

  await pool.initialize(encodePriceSqrt("1", "1").toString());

  console.log("Pool initialized.");

  console.log("Transfer tokens to pool...");
  // adding extra liquidity into pool to make sure there's always
  // someone to swap with
  await weth.transfer(poolAddress, ethers.parseEther("1000000"));
  await usdc.transfer(poolAddress, ethers.parseEther("1000000"));

  console.log("Success.");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
