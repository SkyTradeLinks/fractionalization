import * as anchor from "@coral-xyz/anchor";
import { Program, BN, AnchorProvider } from "@coral-xyz/anchor";
import { expect } from "chai";
import { Fractionalization } from "../target/types/fractionalization";
import { PublicKey, Keypair, SystemProgram, Connection, AccountMeta } from "@solana/web3.js";
import { generateSigner, keypairIdentity, none } from '@metaplex-foundation/umi'
import { mintV1, createTree, mplBubblegum, fetchTreeConfigFromSeeds, parseLeafFromMintV2Transaction, mintV2, LeafSchema, parseLeafFromMintV1Transaction, createTreeV2, getAssetWithProof } from '@metaplex-foundation/mpl-bubblegum'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { fetchMerkleTree } from "@metaplex-foundation/mpl-account-compression";
import fs from 'fs'
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata'
import bs58 from 'bs58'

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

describe("fractionalization", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  it("mint nft", async () => {

    const keypairFilePath = "/home/abel/.config/solana/id.json";
    const secretKey = new Uint8Array(
      JSON.parse(fs.readFileSync(keypairFilePath, "utf-8"))
    );

    const umi = createUmi('http://api.devnet.solana.com')
      .use(mplBubblegum())

    const keypair = umi.eddsa.createKeypairFromSecretKey(secretKey);

    umi.use(keypairIdentity(keypair)).use(mplTokenMetadata());

    const merkleTree = generateSigner(umi)

    const builder = await createTree(umi, {
      merkleTree,
      maxBufferSize: 64,
      maxDepth: 14,
    })

    await builder.sendAndConfirm(umi);

    await new Promise(resolve => setTimeout(resolve, 15000));

    const merkleTreeAccount = await fetchMerkleTree(umi, merkleTree.publicKey)

    const treeConfig = await fetchTreeConfigFromSeeds(umi, { merkleTree: merkleTree.publicKey });

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


    await new Promise(resolve => setTimeout(resolve, 15000));

    const leaf: LeafSchema = await parseLeafFromMintV1Transaction(umi, signature);
    const assetId = leaf.id;

    console.log("Starting to create fractions pda");

    const provider = anchor.getProvider() as AnchorProvider;
    const fractionalizationProgram = new Program<Fractionalization>(IDL, provider);

    const merkleTreeAddress = merkleTree.publicKey;

    const asset_id = new PublicKey(assetId);

    console.log("asset_id:", asset_id);

    const [fractionsPda, fractionsBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("fractions"), asset_id.toBuffer()],
      FractionalizationAddress
    );

    const { proof, root, node_index } = await umi.rpc.getAssetProof(assetId);

    const rpcAssets = await umi.rpc.getAsset(assetId)

    console.log("owner: ", rpcAssets.ownership.owner);

    const proofpathasAccounts = mapProof({ proof });

    const rootKey = new PublicKey(root);

    const args = {
      transferCnftArgs: {
        root: Array.from(rootKey.toBytes()),
        dataHash: Array.from(leaf.dataHash),
        creatorHash: Array.from(leaf.creatorHash),
        nonce: new BN(leaf.nonce.toString()),
        index: 0, // TODO: Get actual leaf index from merkle tree
      },
      merkleTree: new PublicKey(merkleTreeAddress),
      fractionsSupply: new BN(1000),
      fractionalizationTime: new BN(Math.floor(Date.now() / 1000)),
    }


    try {
      const tx = await fractionalizationProgram.methods
        .fractionalize(args)
        .accounts(
          {
            payer: provider.wallet.publicKey,
            assetId: asset_id,
            merkleTree: merkleTreeAddress,
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

    console.log("owner: ", rpcAsset.ownership.owner);


    // //expect(fractions.assetId.toBase58()).to.equal(assetId.toBase58());
    // //expect(fractions.merkleTree.toBase58()).to.equal(merkleTree.toBase58());
    // expect(fractions.fractionsSupply.eq(new BN(1000))).to.be.true;
    // expect(fractions.fractionalizationTime.toNumber()).to.be.greaterThan(0);
    // expect(fractions.bump[0]).to.equal(fractionsBump);



  });

  // it("fractionalizes an asset and initializes Fractions PDA", async () => {
  //   // Get the provider and program
  //   const provider = anchor.getProvider() as AnchorProvider;
  //   const fractionalizationProgram = new Program<Fractionalization>(IDL, provider);

  //   const assetKeypair = Keypair.generate();
  //   const assetId = assetKeypair.publicKey;
  //   const merkleTree = Keypair.generate().publicKey;

  //   const [fractionsPda, fractionsBump] = PublicKey.findProgramAddressSync(
  //     [Buffer.from("fractions"), assetId.toBuffer()],
  //     FractionalizationAddress
  //   );

  //   const args = {
  //     transferCnftArgs: {
  //       root: Array(32).fill(0),
  //       dataHash: Array(32).fill(0),
  //       creatorHash: Array(32).fill(0),
  //       nonce: new BN(0),
  //       index: 0,
  //     },
  //     merkleTree,
  //     fractionsSupply: new BN(1000),
  //     fractionalizationTime: new BN(Math.floor(Date.now() / 1000)),
  //   };

  //   const bubblegumProgram = new PublicKey(
  //     "BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY"
  //   );

  //   const tokenProgram = new PublicKey(
  //     "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
  //   );

  //   const tx = await fractionalizationProgram.methods
  //     .fractionalize(args)
  //     .accounts({
  //       payer: provider.wallet.publicKey,
  //       assetId,
  //       fractions: fractionsPda,
  //       bubblegumProgram,
  //       tokenProgram,
  //       systemProgram: SystemProgram.programId,
  //     } as any)
  //     .rpc();

  //   console.log("fractionalize tx:", tx);

  //   const fractions = await fractionalizationProgram.account.fractionalizationData.fetch(
  //     fractionsPda
  //   );

  //   console.log("fractions:", fractions);


  //   expect(fractions.assetId.toBase58()).to.equal(assetId.toBase58());
  //   expect(fractions.merkleTree.toBase58()).to.equal(merkleTree.toBase58());
  //   expect(fractions.fractionsSupply.eq(new BN(1000))).to.be.true;
  //   expect(fractions.fractionalizationTime.toNumber()).to.be.greaterThan(0);
  //   expect(fractions.bump[0]).to.equal(fractionsBump);
  // });
});