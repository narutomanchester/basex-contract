import { ethers } from "hardhat";

async function main() {
  const owner = "0x3404F40b1917ddBdb7D31Bf5f68345F60da8B2C2";
  const token0 = "0x88E1cE46b45CCD0a163D8D99b5a1C6C0503eeE59";
  const token1 = "0x3C77eF20C6F677DDB67362e1915E82a1439097d6";

  let hypervisorFactoryAddress = "0x2695a35ca2fABA37db1842276D735d24AB46fc31";
  let hyperWETHUSDCADddress = "0xC2f9dE78869E9182dcf799F099f53B09A61fd206";
  let uniProxyAddress = "0x0F60B1d6858716e332F7bb15fB1953c4f689bb98";

  let BXTAddress = "0xD110adcB2566af037eE2BD546Eb3566dE362D1D7";
  let veArtProxyAddress = "0x70D6ebB038D89B4cEE80c78DC131Aca1c411a7F8";
  let veBXTAddress = "0x2ED261A4E0390834D54137bC8eC240f60A0eC7Fb";
  let rewardsDistributorAddress = "0x7E342297C17b595d9f66889f99D30295a7739674";
  let permissionsRegistryAddress = "0xDca74c8F59D42F46A95c0AE081F8046C3e719d3D";
  let bribeFactoryV3Address = "0x2218C5eA9B03A199148A0cf7d30d5C494231bB50";
  let gaugeFactoryV2CLAddress = "0x16C75003730dBd1718bdD1DdA5D8a7389B7a341B";
  let voteV3Address = "0x6079f8B37980181b4aC09610f6Ff4088A87Bc282";
  let minterAddress = "0x04c191685443eAcDF65d3d474FD70B666A1691bC";

  // BXT
  const BXT = await ethers.getContractAt("BaseXToken", BXTAddress);
  console.log("BXT Minter before:", await BXT.minter());
  await BXT.initialMint(owner);

  const bxtBalance = await BXT.balanceOf(owner);
  console.log("BXT Balance:", bxtBalance);

  await BXT.setMinter(minterAddress);
  console.log("BXT Minter after:", await BXT.minter());

  //voter
  const voterV3 = await ethers.getContractAt("VoterV3", voteV3Address);
  await voterV3._init(
    [token0, token1],
    permissionsRegistryAddress,
    minterAddress
  );

  //minter
  const minter = await ethers.getContractAt("MinterUpgradeable", minterAddress);
  await minter._initialize([], [], 0);

  //   rewardsDistributor
  const rewardsDistributor = await ethers.getContractAt(
    "RewardsDistributor",
    rewardsDistributorAddress
  );
  await rewardsDistributor.setDepositor(minterAddress);

  // set voter to veBXT
  const veBXT = await ethers.getContractAt("VotingEscrow", veBXTAddress);
  await veBXT.setVoter(voteV3Address);

  // bribe factory
  const bribeFactoryV3 = await ethers.getContractAt(
    "BribeFactoryV3",
    bribeFactoryV3Address
  );
  await bribeFactoryV3.setVoter(voteV3Address);

  // gaugeExtraRewardser
  //   const voterV3 = await ethers.getContractAt("VoterV3", voteV3Address);
  //   const gaugeFactoryV2CL = await ethers.getContractAt(
  //     "GaugeFactoryV2_CL",
  //     gaugeFactoryV2CLAddress
  //   );

  //   const gaugeAddress = await voterV3.gauges(hyperWETHUSDCADddress);
  //   console.log("gaugeAddress", gaugeAddress)
  //   const gaugeExtraRewarder = await ethers.deployContract("GaugeExtraRewarder", [
  //     token0,
  //     gaugeAddress,
  //   ]);

  //   await gaugeFactoryV2CL.setGaugeRewarder(
  //     [gaugeAddress],
  //     [gaugeExtraRewarder.target]
  //   );

  //   await gaugeExtraRewarder.setDistributionRate(ethers.parseEther("0.015"));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
