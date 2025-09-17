import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Fractionalization } from "../../target/types/fractionalization";
import { getFractionalizeConfig } from "../../utils/factionalization/fractionalizeUtils"
import { FractionalizeAccounts, FractionalizeArgs } from "../../utils/factionalization/types"
import { PublicKey, Keypair, clusterApiUrl } from "@solana/web3.js"
import { assert } from "chai";
import {publicKey, Umi, } from "@metaplex-foundation/umi"
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { getAssetWithProof, mplBubblegum } from "@metaplex-foundation/mpl-bubblegum";
import { getAccount } from "@solana/spl-token";
import { dasApi, } from "@metaplex-foundation/digital-asset-standard-api";
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata'

describe("fractionalization", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Fractionalization as Program<Fractionalization>;

  let fractionalizeAccounts: FractionalizeAccounts<PublicKey, Keypair>;
  let fractionalizationArgs: FractionalizeArgs;
  let fractionalizationSigners: Keypair[]
  let proofAccounts: { isSigner: boolean, isWritable: boolean, pubkey: PublicKey }[];
  let umi: Umi

  before(async () => {
    umi = createUmi(clusterApiUrl("devnet"), "confirmed")
        .use(dasApi())
        .use(mplBubblegum())
        .use(mplTokenMetadata());

    const { accounts, signers, args, proofAccounts: proof } = await getFractionalizeConfig(program.programId, umi)

    fractionalizationArgs = args;
    fractionalizeAccounts = accounts
    fractionalizationSigners = signers
    proofAccounts = proof


  })

  it("fails if remaining accounts length incorrect", async () => {
    const ixAccount = { ...fractionalizeAccounts, payer: fractionalizeAccounts.payer.publicKey, fractionToken: fractionalizeAccounts.fractionToken.publicKey }
    console.log(JSON.stringify(ixAccount))
    try {
      const txn = await program.methods.fractionalize(fractionalizationArgs)
        .accountsStrict(ixAccount)
        .signers(fractionalizationSigners)
        .rpc()
        // .instruction()
      // await runTxnRaw(txn, fractionalizeAccounts.payer.publicKey, fractionalizationSigners, provider.connection)
    } catch (err) {
      assert(err.error.errorCode.code === "InvalidProofAccLen", "Expected the ErrorCode to be InvalidParameter") 
    }
  });
  
  it("fails if provided wrong accountId", async () => {
    const assetId =  Keypair.generate().publicKey

    const fractions = PublicKey.findProgramAddressSync([Buffer.from("fractions"), assetId.toBuffer()], program.programId)[0]

    const ixAccount = {...fractionalizeAccounts, payer: fractionalizeAccounts.payer.publicKey, fractionToken: fractionalizeAccounts.fractionToken.publicKey, assetId, fractions}

    try {
      await program.methods.fractionalize(fractionalizationArgs)
      .accountsStrict(ixAccount)
      .signers(fractionalizationSigners)
      .remainingAccounts([{isSigner: false, isWritable: false, pubkey: Keypair.generate().publicKey}, {isSigner: false, isWritable: false, pubkey: Keypair.generate().publicKey}]) // Mock value to pass the test
      .rpc()

      assert(false, "Expected the program to fail if provided wrong index")
    } catch(err) {
        assert(err.error.errorCode.code === "InvalidAsset", "Expected the ErrorCode to be InvalidAsset") 
    }
  })  
  it("Runs the ix successfully and sends the appropriate amounts to user", async () => {
    const ixAccount = {...fractionalizeAccounts, payer: fractionalizeAccounts.payer.publicKey, fractionToken: fractionalizeAccounts.fractionToken.publicKey}

      await program.methods.fractionalize(fractionalizationArgs)
      .accountsStrict(ixAccount)
      .signers(fractionalizationSigners)
      .remainingAccounts(proofAccounts) 
      .rpc()

      const newAssetProof = await getAssetWithProof(umi, publicKey(fractionalizeAccounts.assetId.toString()))

      const {leafOwner} = newAssetProof;
      const payerAtaBalance = await getAccount(provider.connection, fractionalizeAccounts.payerFractionalizationAta, "confirmed", fractionalizeAccounts.tokenProgram)

      assert(leafOwner.toString() == fractionalizeAccounts.fractions.toString(), "Invalid cNFT owner")
      assert(parseInt(payerAtaBalance.amount.toString()) == 1_000_000 * 10 ** 6, "Invalid payer ata balance") 
  })

});
