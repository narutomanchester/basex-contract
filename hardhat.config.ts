/* eslint-disable global-require */
/* eslint-disable @typescript-eslint/no-var-requires */
import type { HardhatUserConfig, NetworkUserConfig } from "hardhat/types";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@openzeppelin/hardhat-upgrades";
// import "@typechain/hardhat";
import "hardhat-abi-exporter";
import "hardhat-contract-sizer";
import "solidity-coverage";
import "solidity-docgen";
import "dotenv/config";

require("dotenv").config({ path: require("find-config")(".env") });
const fs = require("fs");
// const deployer = fs.readFileSync(".secret_testnet").toString().trim();

const mantleSepolia: NetworkUserConfig = {
  url: "https://rpc.sepolia.mantle.xyz",
  chainId: 5003,
  accounts: [process.env.KEY_TESTNET!],
};
const mantleMainnet: NetworkUserConfig = {
  url: "https://rpc.mantle.xyz",
  chainId: 5000,
  accounts: [process.env.KEY_MANTLE_MAINNET!],
};
const bscTestnet: NetworkUserConfig = {
  url: "https://data-seed-prebsc-1-s1.binance.org:8545/",
  chainId: 97,
  accounts: [process.env.KEY_TESTNET!],
};

const bscMainnet: NetworkUserConfig = {
  url: "https://bsc-dataseed.binance.org/",
  chainId: 56,
  accounts: [process.env.KEY_MAINNET!],
};

const goerli: NetworkUserConfig = {
  url: "https://rpc.ankr.com/eth_goerli",
  chainId: 5,
  accounts: [process.env.KEY_GOERLI!],
};

const eth: NetworkUserConfig = {
  url: "https://eth.llamarpc.com",
  chainId: 1,
  accounts: [process.env.KEY_ETH!],
};

const localhost: NetworkUserConfig = {
  url: "HTTP://127.0.0.1:7545",
  chainId: 1337,
  accounts: [process.env.KEY_TESTNET!],
};

const mumbai: NetworkUserConfig = {
  url: "https://rpc-mumbai.maticvigil.com",
  chainId: 80001,
  accounts: [process.env.KEY_TESTNET!],
};

const config = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {},
    ...(process.env.KEY_TESTNET && { mumbai }),
    ...(process.env.KEY_TESTNET && { mantleSepolia }),
    ...(process.env.KEY_MANTLE_MAINNET && { mantleMainnet }),
    ...(process.env.KEY_TESTNET && { localhost }),
    ...(process.env.KEY_TESTNET && { bscTestnet }),
    ...(process.env.KEY_MAINNET && { bscMainnet }),
    ...(process.env.KEY_GOERLI && { goerli }),
    ...(process.env.KEY_ETH && { eth }),
    // testnet: bscTestnet,
    // mainnet: bscMainnet,
  },
  etherscan: {
    apiKey: {
      mantleMainnet: process.env.ETHERSCAN_API_KEY,
      mantleSepolia: process.env.ETHERSCAN_API_KEY,
    },
    customChains: [
      {
        network: "mantleMainnet",
        chainId: 5000,
        urls: {
          apiURL: "https://explorer.mantle.xyz/api",
          browserURL: "https://explorer.mantle.xyz/",
        },
      },
      {
        network: "mantleSepolia",
        chainId: 5003,
        urls: {
          apiURL: "https://explorer.sepolia.mantle.xyz/api",
          browserURL: "https://explorer.sepolia.mantle.xyz/",
        },
      },
    ],
  },
  solidity: {
    compilers: [
      {
        version: "0.8.13",
        settings: {
          optimizer: {
            enabled: true,
            runs: 999,
          },
        },
      },
      {
        version: "0.8.9",
        settings: {
          optimizer: {
            enabled: true,
            runs: 999,
          },
        },
      }
    ],
  },
  paths: {
    sources: "./contracts/",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  docgen: {
    pages: "files",
  },
};

export default config;
