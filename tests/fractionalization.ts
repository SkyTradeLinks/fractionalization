import * as anchor from "@coral-xyz/anchor";
import { Program, BN, AnchorProvider } from "@coral-xyz/anchor";
//import { expect } from "chai";
import { Fractionalization } from "../target/types/fractionalization";
import {
  PublicKey, SystemProgram, AccountMeta, SYSVAR_RENT_PUBKEY
} from "@solana/web3.js";
import { generateSigner, keypairIdentity, none } from '@metaplex-foundation/umi'
import { mintV1, createTree, mplBubblegum, LeafSchema, parseLeafFromMintV1Transaction, getAssetWithProof } from '@metaplex-foundation/mpl-bubblegum'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import fs from 'fs'
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata'

const mapProof = (assetProof: { proof: any }): AccountMeta[] => {
  if (!assetProof.proof || assetProof.proof.length === 0) {
    throw new Error('Proof is empty');
  }
  return assetProof.proof.map((node) => ({
    pubkey: new PublicKey(node),
    isSigner: false,
    isWritable: false,
  }));
};

const IDL = require("../target/idl/fractionalization.json");

const FractionalizationAddress = new PublicKey("CgZgZcGNLyxQcFMHGmomQD5op5hW2ncVxDLt5DnZWn7g");

describe("fractionalization", async () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  // use solana cli address 

  const keypairFilePath = "/home/abel/.config/solana/id.json";
  const secretKey = new Uint8Array(
    JSON.parse(fs.readFileSync(keypairFilePath, "utf-8"))
  );

  // use umi

  const umi = createUmi('https://api.devnet.solana.com')
    .use(mplBubblegum())

  const keypair = umi.eddsa.createKeypairFromSecretKey(secretKey);

  umi.use(keypairIdentity(keypair)).use(mplTokenMetadata());



  it("mint nft", async () => {
    // create  merkle tree

    const merkleTree = generateSigner(umi)

    const builder = await createTree(umi, {
      merkleTree,
      maxBufferSize: 64,
      maxDepth: 14,
    })

    await builder.sendAndConfirm(umi);

    console.log("Merkle Tree is created.");

    // waiting for transaction to reflect
    await new Promise(resolve => setTimeout(resolve, 15000));

    const { signature } = await mintV1(umi, {
      leafOwner: umi.identity.publicKey,
      merkleTree: merkleTree.publicKey,
      metadata: {
        name: 'My Compressed NFT',
        uri: 'https://example.com/my-cnft.json',
        sellerFeeBasisPoints: 500, // 5%
        collection: none(),
        creators: [
          { address: umi.identity.publicKey, verified: false, share: 100 },
        ],
      },
    }).sendAndConfirm(umi, { confirm: { commitment: "finalized" } });


    // waiting for transaction to reflect
    await new Promise(resolve => setTimeout(resolve, 15000));

    const leaf: LeafSchema = await parseLeafFromMintV1Transaction(umi, signature);
    const assetId = leaf.id;

    // provider
    const provider = anchor.getProvider() as AnchorProvider;
    const fractionalizationProgram = new Program<Fractionalization>(IDL, provider);

    const merkleTreeAddress = merkleTree.publicKey;

    const asset_id = new PublicKey(assetId);

    console.log("cNFT mint successful, asset_id:", asset_id);


    const [fractionsPda, fractionsBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("fractions"), asset_id.toBuffer()],
      FractionalizationAddress
    );

    const { proof, root } = await umi.rpc.getAssetProof(assetId);

    const rpcAssets = await umi.rpc.getAsset(assetId)

    const assetWithProofs = await getAssetWithProof(umi, assetId, {
      truncateCanopy: true,
    })

    console.log("owner of NFT: ", rpcAssets.ownership.owner);

    const proofpathasAccounts = mapProof({ proof });

    const rootKey = new PublicKey(root);

    const args = {
      transferCnftArgs: {
        root: Array.from(assetWithProofs.root),
        dataHash: Array.from(assetWithProofs.dataHash),
        creatorHash: Array.from(assetWithProofs.creatorHash),
        nonce: new BN(assetWithProofs.nonce),
        index: assetWithProofs.index, // TODO: Get actual leaf index from merkle tree
      },
      merkleTree: new PublicKey(merkleTreeAddress),
      fractionsSupply: new BN(1_000_000 * 10 ** 6),
      fractionalizationTime: new BN(Math.floor(Date.now() / 1000)),
    }

    // Initialize the SPL Token Mint


    // Metaplex constants
    const METADATA_SEED = "metadata";
    const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

    const MINT_SEED = "fractions_mint";

    const payer = provider.wallet.publicKey;

    const metadata = {
      merkleTree: new PublicKey(merkleTree.publicKey),
      assetId: new PublicKey(assetId),
      treeRoot: new PublicKey(root),
      name: "Alpha",
      symbol: "SKY",
      uri: "https://5vfxc4tr6xoy23qefqbj4qx2adzkzapneebanhcalf7myvn5gzja.arweave.net/7UtxcnH13Y1uBCwCnkL6APKsge0hAgacQFl-zFW9NlI",
    }

    const [mint, mintBump] = PublicKey.findProgramAddressSync(
      [Buffer.from(MINT_SEED), asset_id.toBuffer()],
      fractionalizationProgram.programId
    );

    const [metadataAddress, metadataBump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from(METADATA_SEED),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    const context = {
      payer,
      assetId,
      metadata: metadataAddress,
      mint,
      rent: SYSVAR_RENT_PUBKEY,
      systemProgram: SystemProgram.programId,
      tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
    };

    try {
      const varkey = await fractionalizationProgram.methods
        .initMintMetadata(metadata)
        .accounts(context)
        .rpc();
    } catch (err) {
      console.error("Init mint metadata failed:", err);
    }

    //create fractionalize pda

    try {
      const tx = await fractionalizationProgram.methods
        .fractionalize(args)
        .accounts(
          {
            payer: provider.wallet.publicKey,
            assetId: asset_id,
            merkleTree: merkleTreeAddress,
            ///tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          }
        )
        .remainingAccounts(proofpathasAccounts)
        .rpc();

      console.log("fractionalize tx:", tx);
    } catch (err) {
      console.error("Transaction failed:", err);
      if ("logs" in err) {
        console.log("Program logs:", err.logs);
      }
    }

    const fractions = await fractionalizationProgram.account.fractionalizationData.fetch(
      fractionsPda
    );


    await new Promise(resolve => setTimeout(resolve, 15000));

    const rpcAsset = await umi.rpc.getAsset(assetId)

    console.log("Current owner of NFT: ", rpcAsset.ownership.owner);

    const destination = await anchor.utils.token.associatedAddress({
      mint: mint,
      owner: payer,
    });

    const postBalance = (
      await provider.connection.getTokenAccountBalance(destination)
    ).value.uiAmount;

    console.log("Token balance of payer: ", postBalance)


    // Reclaim instructions

    const assetWithProof = await getAssetWithProof(umi, assetId, {
      truncateCanopy: true,
    });

    const nextProofpathasAccounts = mapProof({ proof: assetWithProof.proof });

    const transferInstructionArgs = {
      root: Array.from(assetWithProof.root),
      dataHash: Array.from(assetWithProof.dataHash),
      creatorHash: Array.from(assetWithProof.creatorHash),
      nonce: new BN(assetWithProof.nonce),
      index: assetWithProof.index, // TODO: Get actual leaf index from merkle tree
    };


    try {
      const nextTx = await fractionalizationProgram.methods.reclaim({ transferInstructionArgs })
        .accounts(
          {
            payer: provider.wallet.publicKey,
            assetId: asset_id,
            merkleTree: merkleTreeAddress,
            payerTokenAccount: destination,
          }
        )
        .remainingAccounts(nextProofpathasAccounts)
        .rpc();

      console.log("fractionalize tx:", nextTx);
    } catch (err) {
      console.error("Transaction failed:", err);
      if ("logs" in err) {
        console.log("Program logs:", err.logs);
      }
    }

    const { rpcAsset: aster } = await getAssetWithProof(umi, assetId, {
      truncateCanopy: true,
    });

    console.log("NFT Transfered back to ", aster.ownership.owner);


    const qpostBalance = (
      await provider.connection.getTokenAccountBalance(destination)
    ).value.uiAmount;

    console.log("Token balance of payer now: ", qpostBalance)
  });
});