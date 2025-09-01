import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TwapHookPoc } from "../target/types/twap_hook_poc";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";

describe("twap-hook-poc", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.TwapHookPoc as Program<TwapHookPoc>;
  
  // Test accounts
  const authority = Keypair.generate();
  const baseMint = Keypair.generate();
  const quoteMint = Keypair.generate();

  before(async () => {
    // Airdrop SOL to authority
    const signature = await provider.connection.requestAirdrop(authority.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(signature);
  });

  it("Initializes TWAP config", async () => {
    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("twap_config")],
      program.programId
    );

    await program.methods
      .initializeConfig()
      .accounts({
        config: configPda,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([authority])
      .rpc();

    const configAccount = await program.account.twapConfig.fetch(configPda);
    console.log("Config initialized:", configAccount);
    
    // Verify default values
    assert.equal(configAccount.minUpdateInterval.toNumber(), 600); // 10 minutes
    assert.equal(configAccount.minVolumeThreshold.toNumber(), 500_000_000); // $500
    assert.equal(configAccount.minPriceChangeBps, 100); // 1%
    assert.equal(configAccount.twapHorizonHours, 24);
    assert.equal(configAccount.bucketCount, 24);
  });

  it("Initializes ring buffer for token pair", async () => {
    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("twap_config")],
      program.programId
    );

    const [ringBufferPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("twap_ring_buffer"),
        baseMint.publicKey.toBuffer(),
        quoteMint.publicKey.toBuffer()
      ],
      program.programId
    );

    await program.methods
      .initializeRingBuffer()
      .accounts({
        ringBuffer: ringBufferPda,
        config: configPda,
        baseMint: baseMint.publicKey,
        quoteMint: quoteMint.publicKey,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([authority])
      .rpc();

    const ringBufferAccount = await program.account.twapRingBuffer.fetch(ringBufferPda);
    console.log("Ring buffer initialized:", ringBufferAccount);
    
    // Verify initialization
    assert.equal(ringBufferAccount.baseMint.toString(), baseMint.publicKey.toString());
    assert.equal(ringBufferAccount.quoteMint.toString(), quoteMint.publicKey.toString());
    assert.equal(ringBufferAccount.currentBucketIndex, 0);
  });

  it("Processes transfer hook (simulated)", async () => {
    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("twap_config")],
      program.programId
    );

    const [ringBufferPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("twap_ring_buffer"),
        baseMint.publicKey.toBuffer(),
        quoteMint.publicKey.toBuffer()
      ],
      program.programId
    );

    // First call should update the ring buffer (first trade)
    await program.methods
      .processTransferHook()
      .accounts({
        ringBuffer: ringBufferPda,
        config: configPda,
        baseMint: baseMint.publicKey,
        quoteMint: quoteMint.publicKey,
      })
      .rpc();

    let ringBufferAccount = await program.account.twapRingBuffer.fetch(ringBufferPda);
    console.log("After first trade:", ringBufferAccount);
    
    // Second call should accumulate volume but not update (too soon)
    await program.methods
      .processTransferHook()
      .accounts({
        ringBuffer: ringBufferPda,
        config: configPda,
        baseMint: baseMint.publicKey,
        quoteMint: quoteMint.publicKey,
      })
      .rpc();

    ringBufferAccount = await program.account.twapRingBuffer.fetch(ringBufferPda);
    console.log("After second trade:", ringBufferAccount);
  });

  it("Gets TWAP price", async () => {
    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("twap_config")],
      program.programId
    );

    const [ringBufferPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("twap_ring_buffer"),
        baseMint.publicKey.toBuffer(),
        quoteMint.publicKey.toBuffer()
      ],
      program.programId
    );

    await program.methods
      .getTwap()
      .accounts({
        ringBuffer: ringBufferPda,
        config: configPda,
      })
      .rpc();
  });
});
