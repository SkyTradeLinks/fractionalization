import {Keypair, PublicKey} from "@solana/web3.js"
import { Program } from "@coral-xyz/anchor";
import { Fractionalization } from "../../target/types/fractionalization";
import {ReclaimAccounts,  ReclaimArgs} from "./types"
import { getPrograms } from "../helper_funcs";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { getAssetWithProof } from "@metaplex-foundation/mpl-bubblegum";
import { publicKey } from "@metaplex-foundation/umi";
import * as anchor from "@coral-xyz/anchor"

export async function getReclaimConfig( program: Program<Fractionalization>, umi: any,  fractions: PublicKey, leafDelegate: PublicKey, payer: Keypair, treeConfig: PublicKey): Promise<{accounts: ReclaimAccounts<PublicKey, Keypair>, args: ReclaimArgs, signers: Keypair[], proofAccounts: { isSigner: boolean, isWritable: boolean, pubkey: PublicKey }[]}> {

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