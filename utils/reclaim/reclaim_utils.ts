import {Keypair, PublicKey} from "@solana/web3.js"
import { Program } from "@coral-xyz/anchor";
import { Fractionalization } from "../../target/types/fractionalization";
import {ReclaimAccounts,  ReclaimArgs} from "./types"
import { getPrograms } from "../helper_funcs";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { getAssetWithProof } from "@metaplex-foundation/mpl-bubblegum";
import { publicKey, Umi } from "@metaplex-foundation/umi";
import * as anchor from "@coral-xyz/anchor"

/**
 * Gets the configs like accounts, proofAccounts, signers and input for the reclaim instruction
 *
 * @param program                  Fractionalization token program
 * @param umi                      umi to get the token information of the specified assetId
 * @param fractions                fractions publicKey(Should already be initialized, or else, this function will fail)
 * @param payer                    payer of the transaction
 * @param treeConfig               treeConfig for the assetId's merkle tree(Should already be initialized)
 *
 * @return Returns the accounts, proofAccounts, signers and input for the reclaim instructioin
 */
export async function getReclaimConfig( program: Program<Fractionalization>, umi: Umi,  fractions: PublicKey, leafDelegate: PublicKey, payer: Keypair, treeConfig: PublicKey): Promise<{accounts: ReclaimAccounts<PublicKey, Keypair>, args: ReclaimArgs, signers: Keypair[], proofAccounts: { isSigner: boolean, isWritable: boolean, pubkey: PublicKey }[]}> {

    const fractionPda = await program.account.fractionalizationData.fetch(fractions)

    const {merkleTree, fractionsTokenId, assetId} = fractionPda

    const assetProof = await getAssetWithProof(umi, publicKey(assetId));
    const {creatorHash, dataHash, nonce, index, root, rpcAssetProof} = assetProof

    const proof= rpcAssetProof.proof
    let proofAccounts: { isSigner: boolean, isWritable: boolean, pubkey: PublicKey }[]= []; 

    for (let i = 0; i < proof.length; i++) {
        proofAccounts.push({
            isSigner: false,
            isWritable: false,
            pubkey: new PublicKey(proof[i])
        })
    }

    const {associatedTokenProgram, compressionProgram, logWrapperProgram, mplBubblegumProgram, systemProgram, tokenProgram} = getPrograms()
    const payerFractionalizationAta = getAssociatedTokenAddressSync(fractionsTokenId, payer.publicKey, false, tokenProgram)

    const accounts: ReclaimAccounts<PublicKey, Keypair> = {
        assetId,
        associatedTokenProgram,
        tokenProgram,
        merkleTree,
        logWrapper: logWrapperProgram,
        bubblegumProgram: mplBubblegumProgram,
        compressionProgram,
        fractions,
        fractionalizationToken: fractionsTokenId,
        leafDelegate,
        payer,
        payerFractionalizationAta,
        systemProgram, 
        treeConfig
    }

    const args: ReclaimArgs = {
        transferInstructionArgs: {
            root: Array.from(root),
            creatorHash: Array.from(creatorHash),
            dataHash: Array.from(dataHash),
            index,
            nonce: new anchor.BN(nonce)
        }
    }

    const signers = [payer]

    return {
        accounts,
        args,
        signers,
        proofAccounts
    }

}