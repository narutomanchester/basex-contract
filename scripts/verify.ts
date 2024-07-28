import { ethers, network, run } from "hardhat";
import * as fs from 'fs';
import hre from "hardhat";
import { ZeroAddress } from "ethers";


// const voterV3Contract_abiPath = './abi/contracts/VoterV3.sol/VoterV3.json';
// const voterV3Contract_abiString = fs.readFileSync(voterV3Contract_abiPath, 'utf-8');
// const voterV3Contract_abiJson = JSON.parse(voterV3Contract_abiString);



async function main() {
    // Get network data from Hardhat config (see hardhat.config.ts).
    // const provider = new ethers.providers.JsonRpcProvider("https://rpc.sepolia.mantle.xyz");
    // const GaugeVotingAdminUtil_contract = new ethers.Contract("0x98c6e6B113A9EB05eb4715c86299bc24848761f8", GaugeVotingAdminUtil_abiJson, provider);

    // await tryVerify(GaugeVotingAdminUtil_contract);


    // const voterV3Contract_contract = new ethers.Contract("0x7E4c87D8D49beeddDfA9BCE8cD4EcddD32378b9b", voterV3Contract_abiJson, provider);

    await verifyContract("0x48B6eDA6b031A59b7AbaD6EAd9887dDf39e35931", [
      "0xbd662b596D66f178Ae22c015E46e425D8F534faf",
      "0xC84ce331F8951f141217275B48C79AfD4186a155",
      "0x10C3CfBa5dB125fEda5B0E0DE23E660bF8cBDD50",
      "0x76022a51785F4Dad6e291ca933AfE252eDe9b3EA",
    ]);
}

async function verifyContract(contractAddress: any, input: any[]) {
  if (process.env.ETHERSCAN_API_KEY && process.env.NETWORK !== 'hardhat') {
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: input,
      });
    } catch (error) {
      console.log(`Verify ${contractAddress} error`, error);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
