import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Fractionalization } from "../../target/types/fractionalization";
import { getReclaimConfig } from "../../utils/reclaim/reclaim_utils"
import { getFractionalizeConfig } from "../../utils/factionalization/fractionalizeUtils"
import { FractionalizeAccounts, FractionalizeArgs } from "../../utils/factionalization/types"
import { ReclaimArgs, ReclaimAccounts } from "../../utils/reclaim/types"
import { PublicKey, Keypair, clusterApiUrl } from "@solana/web3.js"
import { dasApi, } from "@metaplex-foundation/digital-asset-standard-api";
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata'
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { getAssetWithProof, mplBubblegum } from "@metaplex-foundation/mpl-bubblegum";
import { publicKey, Umi } from "@metaplex-foundation/umi";
import { assert } from "chai";
import { getAccount } from "@solana/spl-token";


describe("fractionalization", () => {
    // Configure the client to use the local cluster.
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.Fractionalization as Program<Fractionalization>;

    let reclaimAccounts: ReclaimAccounts<PublicKey, Keypair>;
    let reclaimArgs: ReclaimArgs
    let reclaimSigners: Keypair[]
    let fractionalizeAccounts: FractionalizeAccounts<PublicKey, Keypair>;
    let fractionalizationArgs: FractionalizeArgs;
    let fractionalizationSigners: Keypair[]
    let reclaimProofAccounts: { isSigner: boolean, isWritable: boolean, pubkey: PublicKey }[]
    let fractionalizeProofAccounts: { isSigner: boolean, isWritable: boolean, pubkey: PublicKey }[]
    let umi: Umi

    before(async () => {
        umi = createUmi(clusterApiUrl("devnet"), "confirmed")
            .use(dasApi())
            .use(mplBubblegum())
            .use(mplTokenMetadata());
        const { accounts, signers, args, proofAccounts: proof } = await getFractionalizeConfig(provider.connection, program.programId, umi)

        fractionalizationArgs = args;
        fractionalizeAccounts = accounts
        fractionalizationSigners = signers
        fractionalizeProofAccounts = proof

        const ixAccount = { ...fractionalizeAccounts, payer: fractionalizeAccounts.payer.publicKey, fractionToken: fractionalizeAccounts.fractionToken.publicKey }

        await program.methods.fractionalize(fractionalizationArgs)
            .accountsStrict(ixAccount)
            .signers(fractionalizationSigners)
            .remainingAccounts(fractionalizeProofAccounts)
            .rpc({ commitment: "confirmed" })
        console.log("Fractionalized cNFT")

        const { accounts: reclaimAcc, args: reclaimArg, signers: reclaimSig, proofAccounts: reclaimProof } = await getReclaimConfig(program, umi, ixAccount.fractions, ixAccount.leafDelegate, fractionalizeAccounts.payer, fractionalizeAccounts.treeConfig)

        reclaimAccounts = reclaimAcc;
        reclaimArgs = reclaimArg
        reclaimSigners = reclaimSig
        reclaimProofAccounts = reclaimProof

    })

    it("Fails if invalid proof length", async () => {
        try {
            const ixAccounts = { ...reclaimAccounts, payer: reclaimAccounts.payer.publicKey }

            await program.methods.reclaim(reclaimArgs)
                .accountsStrict(ixAccounts)
                .signers(reclaimSigners)
                .rpc()

        } catch (err) {
            assert(err.error.errorCode.code === "InvalidProofAccLen", "Expected the ErrorCode to be InvalidProofAccLen")
        }
    })

    it("Fails if invalid assetId", async () => {
        try {
            const assetId = Keypair.generate().publicKey

            const fractions = PublicKey.findProgramAddressSync([Buffer.from("fractions"), assetId.toBuffer()], program.programId)[0]

            const ixAccounts = { ...reclaimAccounts, payer: reclaimAccounts.payer.publicKey, assetId, fractions }

            await program.methods.reclaim(reclaimArgs)
                .accountsStrict(ixAccounts)
                .signers(reclaimSigners)
                .remainingAccounts(reclaimProofAccounts)
                .rpc()

        } catch (err) {
            console.log(err)
            assert(err.error.errorCode.code === "InvalidAsset", "Expected the ErrorCode to be InvalidAsset")
        }
    })

    it("Runs with right values", async () => {
        const assetId = Keypair.generate().publicKey

        const fractions = PublicKey.findProgramAddressSync([Buffer.from("fractions"), assetId.toBuffer()], program.programId)[0]

        const ixAccounts = { ...reclaimAccounts, payer: reclaimAccounts.payer.publicKey, assetId, fractions }

        await program.methods.reclaim(reclaimArgs)
            .accountsStrict(ixAccounts)
            .signers(reclaimSigners)
            .remainingAccounts(reclaimProofAccounts)
            .rpc()

        const newAssetProof = await getAssetWithProof(umi, publicKey(reclaimAccounts.assetId.toString()))

        const { leafOwner } = newAssetProof;
        const payerAtaBalance = await getAccount(provider.connection, fractionalizeAccounts.payerFractionalizationAta, "confirmed", fractionalizeAccounts.tokenProgram)

        assert(leafOwner.toString() == fractionalizeAccounts.payer.publicKey.toString(), "Invalid cNFT owner")
        assert(parseInt(payerAtaBalance.amount.toString()) == 0, "Invalid payer ata balance")
    })



})  