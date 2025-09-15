import {  Connection, Keypair, PublicKey, sendAndConfirmTransaction, SYSVAR_INSTRUCTIONS_PUBKEY, Transaction } from "@solana/web3.js";
import {  ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor"
import {MPL_BUBBLEGUM_PROGRAM_ID} from "@metaplex-foundation/mpl-bubblegum"

export interface Programs<P> {
  systemProgram: P;
  associatedTokenProgram: P;
  tokenProgram: P;
  mplBubblegumProgram: P,
  compressionProgram: P,
  mplMetadataProgram: P,
  logWrapperProgram: P,
  systemInstruction: P
}

export const fixedKeypairGenerator = (phase: string) :Keypair => {
    return Keypair.fromSeed(Buffer.from("0".repeat(32 - phase.length) + phase));
}

export async function airdrop(connection: anchor.web3.Connection, address: PublicKey, amount = 10000 * anchor.web3.LAMPORTS_PER_SOL) {
    await connection.confirmTransaction(await connection.requestAirdrop(address, amount), "confirmed");
}

export async function logTxn(txSignature: any, connection: anchor.web3.Connection) {
  // Confirm the transaction to ensure it's finalized
  const latestBlockhash = await connection.getLatestBlockhash();
  await connection.confirmTransaction(
    {
      signature: txSignature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    },
    "confirmed"
  );

  // Retrieve the transaction details
  const txDetails = await connection.getTransaction(txSignature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });

  const logs = txDetails?.meta?.logMessages;

  if (logs) {
    console.log("Transaction Logs:");
    logs.forEach((log) => console.log(log));
  } else {
    console.log("No logs found for this transaction.");
  }
}

export function logSignature(txSignature: String, connection: anchor.web3.Connection) {
  console.log(
    `Your transaction signature: https://explorer.solana.com/transaction/${txSignature}?cluster=custom&customUrl=${connection.rpcEndpoint}`
  );
}

export function getPrograms(): Programs<PublicKey> {
    const systemProgram = anchor.web3.SystemProgram.programId;
    const tokenProgram = TOKEN_2022_PROGRAM_ID;
    const associatedTokenProgram = ASSOCIATED_TOKEN_PROGRAM_ID;
    const systemInstruction = SYSVAR_INSTRUCTIONS_PUBKEY    

    return {
        systemProgram,
        tokenProgram,
        associatedTokenProgram,
        mplBubblegumProgram: new PublicKey(MPL_BUBBLEGUM_PROGRAM_ID),
        compressionProgram: new PublicKey("cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK"),
        mplMetadataProgram: new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"),
        logWrapperProgram: new PublicKey("noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV"),
        systemInstruction
    }
}


export async function runTxnRaw(txn: anchor.web3.TransactionInstruction, payer: PublicKey, signers: Keypair[], connection: Connection) {
      const tx = new Transaction().add(
        txn
      );
      tx.feePayer = payer;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      const sig = await sendAndConfirmTransaction(connection, tx, signers, {
        skipPreflight: true,
        commitment: "confirmed",
      }).catch(err => {
        console.log(err)
      })

      console.log(`https://solscan.io/tx/${sig}?cluster=devnet`)

}