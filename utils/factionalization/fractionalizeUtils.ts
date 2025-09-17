import {PublicKey, Keypair, Connection, clusterApiUrl} from "@solana/web3.js"
import {FractionalizeAccounts, FractionalizeArgs} from "./types"
import { getPrograms } from "../helper_funcs"
import {getAssetWithProof, mintV1, createTree, mplBubblegum, parseLeafFromMintV1Transaction, fetchTreeConfigFromSeeds} from "@metaplex-foundation/mpl-bubblegum"
import { Umi, publicKey, generateSigner, none, createSignerFromKeypair, signerIdentity, PublicKey as umiPublicKey } from '@metaplex-foundation/umi';
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { BN } from "bn.js";
import secret from "../../secret.json"
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

/**
 * Gets the configs like accounts, proofAccounts, signers and input for the fractionalize instruction
 *
 * @param programId                programId of the fractionalization program
 * @param umi                      umi to get the token information of the specified assetId
 *
 * @return Returns the accounts, proofAccounts, signers and input for the fractionalization instruction 
 */
export const getFractionalizeConfig = async ( programId: PublicKey, umi: Umi): Promise<{accounts: FractionalizeAccounts<PublicKey, Keypair>, args: FractionalizeArgs, signers: Keypair[], proofAccounts: { isSigner: boolean, isWritable: boolean, pubkey: PublicKey }[]}> => {
    let payer =  Keypair.fromSecretKey(new Uint8Array(bs58.decode(secret.privateKey)));
    
    let keypair = umi.eddsa.createKeypairFromSecretKey(payer.secretKey);
    
    const signer = createSignerFromKeypair(umi, keypair);
    
    // Tell Umi to use the new signer.
    umi.use(signerIdentity(signer))
    const {assetId, treeConfig} =  await createAndMintCNFT(umi);
    console.log(assetId.toString())
    console.log(treeConfig.toString())

    const fractionToken = Keypair.generate()
    
    const assetIdPubkey = new PublicKey(assetId)
    const treeConfigPubkey = new PublicKey(treeConfig)

    const assetProof = await getAssetWithProof({rpc: umi.rpc}, publicKey(assetId));
    let { merkleTree, nonce, index, root, metadata, leafDelegate,rpcAssetProof } = assetProof;
;
    const proof= rpcAssetProof.proof
    let proofAccounts: { isSigner: boolean, isWritable: boolean, pubkey: PublicKey }[]= []; 

    for (let i = 0; i < proof.length; i++) {
        proofAccounts.push({
            isSigner: false,
            isWritable: false,
            pubkey: new PublicKey(proof[i])
        })
    }

    let {creators, collection, isMutable, name, uri, symbol, sellerFeeBasisPoints, primarySaleHappened } = metadata;

    const {associatedTokenProgram, mplBubblegumProgram: bubblegumProgram, systemProgram, tokenProgram, compressionProgram, mplMetadataProgram, logWrapperProgram, systemInstruction} = getPrograms();

    const fractions = PublicKey.findProgramAddressSync([Buffer.from("fractions"), assetIdPubkey.toBuffer()], programId)[0]
    const fractionMetadata = PublicKey.findProgramAddressSync([Buffer.from("metadata"), mplMetadataProgram.toBuffer(), fractionToken.publicKey.toBuffer()], mplMetadataProgram)[0]

    const payerFractionalizationAta = getAssociatedTokenAddressSync(fractionToken.publicKey, payer.publicKey, false, tokenProgram)

    const ixAccounts: FractionalizeAccounts<PublicKey, Keypair> = {
        payer: payer,
        assetId: assetIdPubkey,
        associatedTokenProgram,
        bubblegumProgram,
        systemProgram,
        tokenProgram,
        compressionProgram,
        fractions,
        fractionToken,
        fractionMetadata,
        merkleTree: new PublicKey(merkleTree),
        mplMetadataProgram,
        payerFractionalizationAta,
        logWrapper: logWrapperProgram,
        systemInstruction,
        treeConfig: treeConfigPubkey,
        leafDelegate: new PublicKey(leafDelegate)
    }

    let collectionVal;
    if (collection.__option == "Some") {
        collectionVal = {
            key: collection.value.key,
            verified: collection.value.verified
        }
    } else {
        collectionVal = null
    }

    let newCreators = creators.map((val) => {
        return {
            address: new PublicKey(val.address),
            share: val.share,
            verified: val.verified
        }
    })

    const ixArgs: FractionalizeArgs = {
        transferCnftArgs: {
            creatorHash: Array.from(assetProof.creatorHash),
            dataHash: Array.from(assetProof.dataHash),
            index,
            nonce: new BN(nonce),
            root: Array.from(root)
        },
        metadataArgs: {
            collection: collectionVal,
            creators: newCreators, 
            isMutable,
            name,
            uri, 
            symbol,
            primarySaleHappened, 
            sellerFeeBasisPoints
        }
    }

    const signers = [payer, fractionToken]

    return {
        accounts: ixAccounts,
        args: ixArgs,
        signers,
        proofAccounts
    }

}

/**
 * Creates a new cNFT
 *
 * @param umi                      umi to get the token information of the specified assetId
 * @param maxDepth                 maxDepth of the cNFT(The number of proofAccounts to prove a cNFT on-chain)
 * @param maxDepth                 the maximum number of changes that can occur to a tree with its Merkle root still being valid
 * Note: maxDepth and maxBufferSize defaults to 3 and 8 respectively so that the transaction doesn't fail due to transaction limit
 * @return Returns the accounts, proofAccounts, signers and input for the fractionalization instruction 
 */
const createAndMintCNFT = async (umi: Umi, maxDepth: number = 3, maxBufferSize: number = 8): Promise<{assetId: umiPublicKey,treeConfig: umiPublicKey }> => {
    const merkleTreeSigner = generateSigner(umi);

    const builder = await createTree(umi, {
        merkleTree: merkleTreeSigner,
        maxDepth,
        maxBufferSize,
        public: true,
      })
      await builder.sendAndConfirm(umi, {confirm: {commitment: "confirmed"}})

      const treeConfig = await fetchTreeConfigFromSeeds(umi, { merkleTree: merkleTreeSigner.publicKey })
      
    const {signature} = await mintV1(umi, {
        leafOwner: umi.identity.publicKey,
        merkleTree: merkleTreeSigner.publicKey,
        treeConfig: treeConfig.publicKey,
        metadata: {
            name: "Random",
            symbol: "RND",
            collection: none(),
            creators: [
                { address: umi.identity.publicKey, verified: true, share: 100 },
            ],
            uri: 'https://example.com/my-nft.json',
            sellerFeeBasisPoints: 500,
        }
    }).sendAndConfirm(umi, {confirm: {commitment: "confirmed"}});

    const leaf = await parseLeafFromMintV1Transaction(umi, signature);
    const assetId = leaf.id

    return {assetId, treeConfig: treeConfig.publicKey }
}

