import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Fractionalization } from "../target/types/fractionalization";

describe("fractionalization", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Fractionalization as Program<Fractionalization>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initializeConfig({authority: anchor.web3.Keypair.generate().publicKey, usdcAddress: anchor.web3.Keypair.generate().publicKey}).rpc();
    console.log("Your transaction signature", tx);
  });
});
