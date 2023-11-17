import { ethers } from "hardhat";
import { contracts } from "../typechain-types";
import { expect } from "chai";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

// users
const BigHolder = ethers.getAddress(
  "0x8894E0a0c962CB723c1976a4421c95949bE2D4E3"
); //used to add liquidity and swaps

describe("BaseX.fi - Deployment Section", function () {
  let permissionsRegistry: contracts.PermissionsRegistry;
  let owner: HardhatEthersSigner;
  beforeEach(async () => {
    await ethers.provider.send("evm_increaseTime", [5]);
    await ethers.provider.send("evm_mine");

    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const timestampBefore = blockBefore?.timestamp;

    console.log("Timestamp Before:", timestampBefore);
  });

  it("Should deploy PermissionsRegistry.sol", async function () {
    permissionsRegistry = await ethers.deployContract("PermissionsRegistry");
    const accounts = await ethers.getSigners();
    owner = accounts[0];
    expect(await permissionsRegistry.baseXMultisig()).to.equals(owner.address);

    await permissionsRegistry.setRoleFor(owner.address, "GOVERNANCE");
    expect(
      await permissionsRegistry.hasRole(
        await permissionsRegistry.__helper_stringToBytes("GOVERNANCE"),
        owner.address
      )
    ).to.equal(true);

    await permissionsRegistry.setRoleFor(owner.address, "VOTER_ADMIN");
    expect(
      await permissionsRegistry.hasRole(
        await permissionsRegistry.__helper_stringToBytes("VOTER_ADMIN"),
        owner.address
      )
    ).to.equal(true);

    await permissionsRegistry.setRoleFor(owner.address, "GAUGE_ADMIN");
    expect(
      await permissionsRegistry.hasRole(
        await permissionsRegistry.__helper_stringToBytes("GAUGE_ADMIN"),
        owner.address
      )
    ).to.equal(true);

    await permissionsRegistry.setRoleFor(owner.address, "BRIBE_ADMIN");
    expect(
      await permissionsRegistry.hasRole(
        await permissionsRegistry.__helper_stringToBytes("BRIBE_ADMIN"),
        owner.address
      )
    ).to.equal(true);

    await permissionsRegistry.setRoleFor(owner.address, "FEE_MANAGER");
    expect(
      await permissionsRegistry.hasRole(
        await permissionsRegistry.__helper_stringToBytes("FEE_MANAGER"),
        owner.address
      )
    ).to.equal(true);

    await permissionsRegistry.setRoleFor(BigHolder, "FEE_MANAGER");
    expect(
      await permissionsRegistry.hasRole(
        await permissionsRegistry.__helper_stringToBytes("FEE_MANAGER"),
        BigHolder
      )
    ).to.equal(true);

    await permissionsRegistry.setRoleFor(owner.address, "CL_FEES_VAULT_ADMIN");
    expect(
      await permissionsRegistry.hasRole(
        await permissionsRegistry.__helper_stringToBytes("CL_FEES_VAULT_ADMIN"),
        owner.address
      )
    ).to.equal(true);
  });

  it("Should rolesToString", async function () {
    console.log(
      "rolesToString:",
      (await permissionsRegistry.rolesToString()).toString()
    );
  });

  it("Should roles", async function () {
    console.log("roles:", (await permissionsRegistry.roles()).toString());
  });

  it("Should roleToAddresses", async function () {
    console.log(
      "roleToAddresses:",
      (await permissionsRegistry.roleToAddresses("FEE_MANAGER")).toString()
    );
  });

  it("Should addressToRole", async function () {
    console.log(
      "addressToRole:",
      await permissionsRegistry.addressToRole(owner.address)
    );
  });

  it("Should removeRoleFrom", async function () {
    console.log(
      "removeRoleFrom:",
      (await permissionsRegistry.addressToRole(BigHolder)).toString()
    );
    console.log(
      "removeRoleFrom:",
      (await permissionsRegistry.roleToAddresses("FEE_MANAGER")).toString()
    );

    await permissionsRegistry.removeRoleFrom(BigHolder, "FEE_MANAGER");

    console.log(
      "removeRoleFrom:",
      (await permissionsRegistry.addressToRole(BigHolder)).toString()
    );
    console.log(
      "removeRoleFrom:",
      (await permissionsRegistry.roleToAddresses("FEE_MANAGER")).toString()
    );
  });
});
