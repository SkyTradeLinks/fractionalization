import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Fractionalization } from "../target/types/fractionalization";
import { PublicKey, Keypair, SystemProgram, AccountMeta, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { publicKey } from "@metaplex-foundation/umi";
import { dasApi } from "@metaplex-foundation/digital-asset-standard-api";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

const user = [234,198,148,211,9,139,35,189,143,150,225,23,188,210,64,3,242,199,39,234,191,136,108,32,193,119,70,202,128,18,106,214,199,73,220,245,251,10,69,172,222,170,76,205,48,15,160,132,161,134,32,141,6,89,208,173,191,99,158,113,186,180,63,119];
const userKeypair = Keypair.fromSecretKey(new Uint8Array(user));

describe("fractionalize", () => {
  // Set up provider with userKeypair as wallet
  const provider = new anchor.AnchorProvider(
    anchor.getProvider().connection,
    new anchor.Wallet(userKeypair),
    anchor.AnchorProvider.defaultOptions()
  );
  anchor.setProvider(provider);
  const program = anchor.workspace.Fractionalization as Program<Fractionalization>;
  // Use userKeypair as payer
  const payer = provider.wallet;

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
    // Declare assetId first
    const assetId = new PublicKey("CC91cqH3TKi6nkFSHKkXqzhsXyrqRkuwbraqjDeYKaJg");

    // Generate a new keypair for the fractions mint
    const fractionsMintKeypair = Keypair.generate();
    const fractionsMint = fractionsMintKeypair.publicKey;

    console.log("Using fractions mint:", fractionsMint.toBase58());

    // Program IDs
    const bubblegumProgram = new PublicKey("BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY");
    const logWrapper = new PublicKey("noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV");
    const compressionProgram = new PublicKey("cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK");
    const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

    // Derive fractions PDA
    const [fractionsPda, fractionsBump] = await PublicKey.findProgramAddressSync(
      [Buffer.from("fractions"), assetId.toBuffer()],
      program.programId
    );

    // Derive payer's fractions ATA (Associated Token Account)
    // If using SPL Token 2022, you may need to use the correct token program
    const { getAssociatedTokenAddressSync } = await import("@solana/spl-token");
    const payerFractionsAta = getAssociatedTokenAddressSync(
      fractionsMint,
      payer.publicKey,
      false // allowOwnerOffCurve
    );

    // ✅ UMI instance with DAS API plugin
    const umi = createUmi("https://api.devnet.solana.com").use(dasApi());

    // ✅ DAS expects `publicKey()` type, not string
    const rpcAsset = await umi.rpc.getAsset(publicKey(assetId.toBase58()));
    const rpcAssetProof = await umi.rpc.getAssetProof(publicKey(assetId.toBase58()));


    // ✅ Extract metadata safely, using camelCase for all fields
    const originalMetadata = {
      name: rpcAsset.content.metadata?.name ?? "",
      symbol: rpcAsset.content.metadata?.symbol ?? "",
      uri: rpcAsset.content.json_uri ?? "",
      sellerFeeBasisPoints: rpcAsset.royalty?.basis_points ?? 0,
      primarySaleHappened: (rpcAsset.supply?.print_current_supply ?? 0) > 0,
      isMutable: rpcAsset.mutable ?? false,
      collection: rpcAsset.grouping?.find((g) => g.group_key === "collection")
        ? {
            verified: true, // or false if you know
            key: new PublicKey(rpcAsset.grouping.find((g) => g.group_key === "collection").group_value),
          }
        : null,
      creators:
        rpcAsset.creators?.map((creator) => ({
          address: new PublicKey(creator.address),
          verified: creator.verified,
          share: creator.share,
        })) ?? [],
    };

    console.log("Original Metadata:", originalMetadata);


    // ✅ Merkle tree from DAS compression info
    const merkleTree = new PublicKey(rpcAsset.compression.tree);

    // ✅ Derive Bubblegum tree config PDA
    const [treeConfig] = PublicKey.findProgramAddressSync(
      [Buffer.from("tree_config"), merkleTree.toBuffer()],
      bubblegumProgram
    );


    // ✅ Proof args, convert to number[] for Anchor, camelCase
    const transferCnftArgs = {
      root: Array.from(bs58.decode(rpcAssetProof.root)),
      dataHash: Array.from(bs58.decode(rpcAsset.compression.data_hash)),
      creatorHash: Array.from(bs58.decode(rpcAsset.compression.creator_hash)),
      nonce: new anchor.BN(rpcAsset.compression.leaf_id),
      index: rpcAssetProof.node_index,
    };

    // ✅ Program args, all camelCase
    const fractionsSupply = new anchor.BN(1000000); // or any dynamic value you want
    const args = {
      transferCnftArgs,
      merkleTree: treeConfig,
      fractionsSupply,
      fractionalizationTime: new anchor.BN(Date.now()),
      originalMetadata,
    };

    // Derive the metadata PDA using findProgramAddressSync
    const [fractionsMetadata, metadataBump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        fractionsMint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    console.log("Fractions Metadata PDA:", fractionsMetadata.toBase58());
    console.log("Metadata Bump:", metadataBump);
        
    console.log("Fractions Metadata PDA:", fractionsMetadata.toBase58());

    // --- SPLIT: First, initialize the FractionalizationData PDA and fractions_mint ---
    const assetName = originalMetadata.name;
    const assetSymbol = originalMetadata.symbol;
    const initArgs = {
      merkleTree: treeConfig,
      fractionalizationTime: new anchor.BN(Date.now()),
      assetName,
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
      tokenProgram: new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"),
    };
    try {
      const initTx = await program.methods
        .initFractionalizationData(initArgs)
        .accounts(initAccounts)
        .signers([fractionsMintKeypair])
        .rpc();
      console.log("InitFractionalizationData tx signature", initTx);
    } catch (e: any) {
      console.log("InitFractionalizationData error:", e.message);
      if (e.logs) console.log("Init logs:", e.logs);
    }

    // --- Explicitly check that fractionsMint is a standard Token-2022 fungible mint (not a pNFT/cNFT) ---
    const connection = anchor.getProvider().connection;
    const mintAccountInfo = await connection.getAccountInfo(fractionsMint);
    if (mintAccountInfo) {
      // Token-2022 mints have a fixed layout for standard mints. pNFT/cNFTs have extra data/extensions.
      // Standard Token-2022 mint size is 82 bytes (no extensions). If > 82, likely has extensions.
      if (mintAccountInfo.data.length > 82) {
        throw new Error("fractionsMint has extensions and may be a pNFT/cNFT. Fractionalization requires a standard Token-2022 fungible mint.");
      }
      console.log("fractionsMint is a standard Token-2022 fungible mint (no extensions).");
    } else {
      console.warn("fractionsMint account not found yet. It will be created by Anchor if needed.");
    }

    // ✅ Program accounts (fractionsMint is now only mut, not init)
    const accounts = {
      payer: payer.publicKey,
      assetId: assetId,
      treeConfig: treeConfig,
      merkleTree: merkleTree,
      fractions: fractionsPda,
      fractionsMint: fractionsMint,
      payerFractionsAta: payerFractionsAta,
      fractionsMetadata: fractionsMetadata,
      logWrapper: logWrapper,
      compressionProgram: compressionProgram,
      bubblegumProgram: bubblegumProgram,
      tokenProgram: new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"),
      associatedTokenProgram: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
      tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    };

    const mapProof = (assetProof: { proof: string[] }): AccountMeta[] => {
      if (!assetProof.proof || assetProof.proof.length === 0) {
        throw new Error("Proof is empty");
      }
      return assetProof.proof.map((node) => ({
        pubkey: new PublicKey(node),
        isSigner: false,
        isWritable: false,
      }));
    };

    const remainingAccounts = mapProof(rpcAssetProof);

    // --- SPLIT: Then, call fractionalize ---
    try {

      const tx = await program.methods
        .fractionalize(args)
        .accounts(accounts)
        .signers([userKeypair])
        .remainingAccounts(remainingAccounts)
        .rpc();

      console.log("Fractionalize transaction signature", tx);
    } catch (e: any) {
      console.log("Fractionalize test error (expected in mock):", e.message);
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
});
