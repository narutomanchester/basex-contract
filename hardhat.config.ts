import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "@typechain/hardhat";
const dotenv = require("dotenv");
dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.13",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  defaultNetwork: "testnet",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    testnet: {
      url: "https://goerli.base.org",
      timeout: 200000000,
      gasPrice: 5100000000,
      gas: 5100000,
      accounts: [process.env.PRIVATEKEY as string],
    },

    mainnet: {
      url: "https://mainnet.base.org",
      timeout: 200000000,
      gasPrice: 5100000000,
      gas: 5100000,
      accounts: [process.env.PRIVATEKEY as string],
    },
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: {
      testnet: "abc",
      mainnet: process.env.APIKEY,
    } as any,
    customChains: [
      {
        network: "testnet",
        chainId: 84531,
        urls: {
          apiURL: "https://api-goerli.basescan.org/api",
          browserURL: "https://goerli.basescan.org/",
        },
      },
      {
        network: "mainnet",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org/",
        },
      },
    ],
  },
};

export default config;
