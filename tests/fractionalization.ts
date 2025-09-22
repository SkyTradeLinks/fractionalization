import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Fractionalization } from "../target/types/fractionalization";
import { PublicKey, Keypair, SystemProgram, AccountMeta, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { publicKey } from "@metaplex-foundation/umi";
import { MPL_BUBBLEGUM_PROGRAM_ID, fetchTreeConfigFromSeeds, findMintAuthorityPda, getAssetWithProof, canTransfer } from "@metaplex-foundation/mpl-bubblegum";
import { dasApi } from "@metaplex-foundation/digital-asset-standard-api";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { min } from "bn.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";


const user = [234,198,148,211,9,139,35,189,143,150,225,23,188,210,64,3,242,199,39,234,191,136,108,32,193,119,70,202,128,18,106,214,199,73,220,245,251,10,69,172,222,170,76,205,48,15,160,132,161,134,32,141,6,89,208,173,191,99,158,113,186,180,63,119];
const userKeypair = Keypair.fromSecretKey(new Uint8Array(user));

const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
const TOKEN_2022_ASSOCIATED_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

describe("fractionalize", () => {

  let endpoint: string;
  let connection: anchor.web3.Connection;
  let provider: anchor.AnchorProvider;
  let program: Program<Fractionalization>;
  let payer: any;
  let assetId: PublicKey;
  let fractionsMint: PublicKey;
  let fractionsPda: PublicKey;
  let payerFractionsAta: PublicKey;
  let logWrapper: PublicKey;
  let compressionProgram: PublicKey;
  let TOKEN_METADATA_PROGRAM_ID: PublicKey;
  let fractionsMetadata: PublicKey;
  let metadataBump: number;
  let fractionsSupply: anchor.BN;
  let umi: ReturnType<typeof createUmi>;
  let assetWithProof: any;
  let merkleTree: PublicKey;
  let treeConfig: PublicKey;
  let treeConfigData: any;
  let root: number[];
  let dataHash: number[];
  let creatorHash: number[];
  let nonce: anchor.BN;
  let index: number;
  let remainingAccounts: AccountMeta[];

  beforeEach(async () => {
    endpoint = "https://api.devnet.solana.com";
    connection = new anchor.web3.Connection(endpoint, "confirmed");
    provider = new anchor.AnchorProvider(
      connection,
      anchor.Wallet.local(),
      anchor.AnchorProvider.defaultOptions()
    );
    anchor.setProvider(provider);
    program = anchor.workspace.Fractionalization as Program<Fractionalization>;
    payer = provider.wallet;

    // Use provided token address as assetId
    assetId = new PublicKey("AZmYVvcb2gUAtkGEYWm5qZTzgADSuhL4bdNzJYjDRjUU");

    // fractions mint as generated pda with asset id seed
    [fractionsMint] = await PublicKey.findProgramAddressSync(
      [Buffer.from("fractions_mint"), assetId.toBuffer()],
      program.programId
    );

    // Derive fractions PDA
    [fractionsPda] = await PublicKey.findProgramAddressSync(
      [Buffer.from("fractions"), assetId.toBuffer()],
      program.programId
    );

    // Derive payer's fractions ATA (Associated Token Account)
    payerFractionsAta = getAssociatedTokenAddressSync(
      fractionsMint,
      payer.publicKey,
      false, // allowOwnerOffCurve
      TOKEN_2022_PROGRAM_ID, // tokenProgramId for Token 2022
      TOKEN_2022_ASSOCIATED_PROGRAM_ID
    );

    // Program IDs
    logWrapper = new PublicKey("noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV");
    compressionProgram = new PublicKey("cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK");
    TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

    // Derive the metadata PDA using findProgramAddressSync
    [fractionsMetadata, metadataBump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        fractionsMint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    // Total supply of fractions to mint
    
    fractionsSupply = new anchor.BN(1000000 * 1e6);

    // UMI instance with DAS API plugin
    umi = createUmi(endpoint).use(dasApi());

    // ✅ Use getAssetWithProof with truncateCanopy for Bubblegum cNFTs
    assetWithProof = await getAssetWithProof(umi, publicKey(assetId), { truncateCanopy: true });

    // ✅ Merkle tree from DAS compression info
    merkleTree = new PublicKey(assetWithProof.merkleTree);

    // ✅ Derive Bubblegum tree config PDA
    treeConfigData = await fetchTreeConfigFromSeeds(umi, {
        merkleTree: publicKey(assetWithProof.merkleTree)
      });

    treeConfig = new PublicKey(treeConfigData.publicKey);

    root = Array.from(assetWithProof.root);
    dataHash = Array.from(assetWithProof.dataHash);
    creatorHash = Array.from(assetWithProof.creatorHash);
    nonce = new anchor.BN(assetWithProof.nonce);
    index = assetWithProof.index;
    
    remainingAccounts = assetWithProof.proof.map((node) => ({
      pubkey: new PublicKey(node),
      isSigner: false,
      isWritable: false,
    }));
  });

  // it("Is initialized!", async () => {
  //   const tx = await program.methods
  //     .initializeConfig({})
  //     .accounts({
  //       authority: payer.publicKey,
  //       usdcAddress: anchor.web3.Keypair.generate().publicKey,
  //       // systemProgram: SystemProgram.programId,
  //     })
  //     .rpc();
  //   console.log("Your transaction signature", tx);
  // });

  it("Fractionalizes a cNFT", async () => {
    // ✅ Proof args, convert to number[] for Anchor, camelCase
    const transferCnftArgs = {
      root: root,
      dataHash: dataHash,
      creatorHash: creatorHash,
      nonce: nonce,
      index: index,
    };

    console.log("Fractions Metadata PDA:", fractionsMetadata.toBase58());
    console.log("Metadata Bump:", metadataBump);

    // --- SPLIT: First, initialize the FractionalizationData PDA and fractions_mint ---
    const assetSymbol = assetWithProof.metadata?.symbol ?? "DAMI";
    const initArgs = {
      merkleTree: merkleTree,
      fractionalizationTime: new anchor.BN(Date.now()),
      assetSymbol,
    };
    const initAccounts = {
      payer: payer.publicKey,
      assetId: assetId,
      fractions: fractionsPda,
      fractionsMint: fractionsMint,
      fractionsMetadata: fractionsMetadata,
      tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
    };
  
    // Check if the metadata account exists before calling initFractionalizationData
    const metadataAccountInfo = await provider.connection.getAccountInfo(fractionsMetadata);
    if (!metadataAccountInfo) {
      try {
        const initTx = await program.methods
          .initFractionalizationData(initArgs)
          .accounts(initAccounts)
          .rpc();
        console.log("InitFractionalizationData tx:", initTx);
      } catch (e: any) {
        console.log("InitFractionalizationData error:", e.message);
      }
    } else {
      console.log("Fractions metadata account already exists, skipping initFractionalizationData.");
    }

    // ✅ Program accounts (fractionsMint is now only mut, not init)
    const fractionalizeAccounts = {
      payer: payer.publicKey,
      assetId: assetId,
      treeConfig: treeConfig,
      merkleTree: merkleTree,
      fractions: fractionsPda,
      fractionsMint: fractionsMint,
      payerFractionsAta: payerFractionsAta,
      logWrapper: logWrapper,
      compressionProgram: compressionProgram,
      bubblegumProgram: new PublicKey(MPL_BUBBLEGUM_PROGRAM_ID),
      tokenProgram: TOKEN_2022_PROGRAM_ID, 
      associatedTokenProgram: TOKEN_2022_ASSOCIATED_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    };

    const args = {
      transferCnftArgs,
      fractionsSupply: fractionsSupply,
    };

    // --- SPLIT: Then, call fractionalize ---
    try {
      const tx = await program.methods
        .fractionalize(args)
        .accounts(fractionalizeAccounts)
        .remainingAccounts(remainingAccounts)
        .rpc();

      console.log("Fractionalize tx:", tx);
    } catch (e: any) {
      console.log("Fractionalize error:", e.message);
      if (e.logs) {
        console.log("Transaction logs:", e.logs);
      }
      if (e.getLogs) {
        try {
          const logs = await e.getLogs();
          console.log("Full transaction logs:", logs);
        } catch (logErr) {
          console.log("Could not fetch logs:", logErr);
        }
      }
    }
  });

  it("Reclaims a cNFT", async () => {
    // ✅ Proof args, convert to number[] for Anchor, camelCase
    const reclaimCnftArgs = {
      root: root,
      dataHash: dataHash,
      creatorHash: creatorHash,
      nonce: nonce,
      index: index,
    };

    // ✅ Program accounts
    const reclaimAccounts = {
      payer: payer.publicKey,
      fractions: fractionsPda,
      fractionsMint: fractionsMint,
      payerFractionsAta: payerFractionsAta,
      treeConfig: treeConfig,
      merkleTree: merkleTree,
      logWrapper: logWrapper,
      compressionProgram: compressionProgram,
      bubblegumProgram: new PublicKey(MPL_BUBBLEGUM_PROGRAM_ID),
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
    };

    const args = {
      transferInstructionArgs: reclaimCnftArgs,
    };

    try {
      const tx = await program.methods
        .reclaim(args)
        .accounts(reclaimAccounts)
        .remainingAccounts(remainingAccounts)
        .rpc();

      console.log("Reclaim tx:", tx);
    } catch (e: any) {
      console.log("Reclaim error:", e.message);
      if (e.logs) {
        console.log("Transaction logs:", e.logs);
      }
      if (e.getLogs) {
        const logs = await e.getLogs();
        console.log("Transaction logs (getLogs):", logs);
      }
    }
  }
  );

});
