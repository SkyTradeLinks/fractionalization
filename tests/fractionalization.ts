import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Fractionalization } from "../target/types/fractionalization";
import { PublicKey, Keypair, SystemProgram, AccountMeta, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { publicKey } from "@metaplex-foundation/umi";
import { PROGRAM_ADDRESS, PROGRAM_ID } from "@metaplex-foundation/mpl-bubblegum";
import { dasApi } from "@metaplex-foundation/digital-asset-standard-api";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";


const user = [234,198,148,211,9,139,35,189,143,150,225,23,188,210,64,3,242,199,39,234,191,136,108,32,193,119,70,202,128,18,106,214,199,73,220,245,251,10,69,172,222,170,76,205,48,15,160,132,161,134,32,141,6,89,208,173,191,99,158,113,186,180,63,119];
const userKeypair = Keypair.fromSecretKey(new Uint8Array(user));

const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
const TOKEN_2022_ASSOCIATED_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

describe("fractionalize", () => {
  // Set up provider with userKeypair as wallet
  const endpoint = "https://api.devnet.solana.com"; // or try a private one if you have it
  const connection = new anchor.web3.Connection(endpoint, "confirmed");
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(userKeypair),
    anchor.AnchorProvider.defaultOptions()
  );
  anchor.setProvider(provider);
  const program = anchor.workspace.Fractionalization as Program<Fractionalization>;
  // Use userKeypair as payer
  const payer = provider.wallet;

  it("Is initialized!", async () => {
    const tx = await program.methods
      .initializeConfig({})
      .accounts({
        authority: payer.publicKey,
        usdcAddress: anchor.web3.Keypair.generate().publicKey,
        // systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("Your transaction signature", tx);
  });

  it("Fractionalizes a cNFT", async () => {
    
  // Use provided token address as assetId
  const assetId = new PublicKey("EL3kFKErsbWiDqodphshYmm8iYkWWJ1q3VdSBpkLQKDr");

    // fractions mint as generated pda with asset id seed
    const [fractionsMint, _] = await PublicKey.findProgramAddressSync(
      [Buffer.from("fractions_mint"), assetId.toBuffer()],
      program.programId
    );
    // const fractionsMintKeypair = Keypair.generate();
    // const fractionsMint = fractionsMintKeypair.publicKey;

    console.log("Using fractions mint:", fractionsMint.toBase58());

    // Program IDs
    const bubblegumProgram = PROGRAM_ID;
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
      false, // allowOwnerOffCurve
      TOKEN_2022_PROGRAM_ID, // tokenProgramId for Token 2022
      TOKEN_2022_ASSOCIATED_PROGRAM_ID
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
      collection: {
        verified: true,
        key: new PublicKey("A7Bn1SU9Qzi7KEFM79JSNBUXvN6LUgUeYp9m2b1L9G4b"),
      },
      creators:
        rpcAsset.creators?.map((creator) => ({
          address: new PublicKey(creator.address),
          verified: creator.verified,
          share: creator.share,
        })) ?? [],
    };

    // console.log("Original Metadata:", originalMetadata); // Remove verbose metadata log


    // ✅ Merkle tree from DAS compression info
    const merkleTree = new PublicKey(rpcAsset.compression.tree);

    // ✅ Derive Bubblegum tree config PDA
    const [treeConfig] = PublicKey.findProgramAddressSync(
      [Buffer.from("tree_config"), merkleTree.toBuffer()],
      bubblegumProgram
    );

    // Only log essential addresses
    console.log("Merkle tree:", merkleTree.toBase58());
    console.log("Tree config:", treeConfig.toBase58());
    console.log("Log wrapper:", logWrapper.toBase58());
    console.log("Compression wrapper:", compressionProgram.toBase58());



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
    const assetSymbol = originalMetadata.symbol;
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
      tokenProgram: new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"),
    };

    const connection = anchor.getProvider().connection;
  
    // Check if the metadata account exists before calling initFractionalizationData
    const metadataAccountInfo = await connection.getAccountInfo(fractionsMetadata);
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

    const treeAuthority = rpcAsset.authorities?.[0]?.address;
  
    const remainingAccounts = mapProof(rpcAssetProof);
    // console.log("Current owner:", rpcAsset.ownership.owner);
    // console.log("Payer:", payer.publicKey.toBase58());
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
      bubblegumProgram: bubblegumProgram,
      tokenProgram: TOKEN_2022_PROGRAM_ID, 
      associatedTokenProgram: TOKEN_2022_ASSOCIATED_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    };

    // Insert treeAuthority as the first remaining account (isSigner: false, isWritable: false)
    const allRemainingAccounts = [
      { pubkey: new PublicKey(treeAuthority), isSigner: false, isWritable: false },
      ...remainingAccounts
    ];

    const args = {
      transferCnftArgs,
      // merkleTree: merkleTree,
      fractionsSupply: fractionsSupply,
    };

    // --- SPLIT: Then, call fractionalize ---
    try {
      const tx = await program.methods
        .fractionalize(args)
        .accounts(fractionalizeAccounts)
        .signers([userKeypair])
        .remainingAccounts(allRemainingAccounts)
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
});
