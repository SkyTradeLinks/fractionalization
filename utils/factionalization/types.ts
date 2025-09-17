import { Collection, Creator } from "@metaplex-foundation/mpl-bubblegum"
import { Option } from "@metaplex-foundation/umi"
import {PublicKey} from "@solana/web3.js"
import BN from "bn.js"

// P=> PublicKey, K=> Keypair
export interface FractionalizeAccounts<P,K> {
    bubblegumProgram: P,
    mplMetadataProgram: P,
    compressionProgram: P,
    logWrapper: P,
    tokenProgram: P,
    systemProgram: P,
    associatedTokenProgram: P,
    systemInstruction: P,
    merkleTree: P,
    payerFractionalizationAta: P,
    fractionMetadata: P,
    fractionToken: K,
    fractions: P,
    assetId: P,
    payer: K,
    treeConfig: P,
    leafDelegate: P
}
export interface FractionalizeArgs{

    transferCnftArgs: AnchorTransferInstructionArgs,
    metadataArgs: AnchorMetadataArgs
}

interface AnchorTransferInstructionArgs {
    root: number[],
    dataHash: number[],
    creatorHash: number[],
    nonce: BN,
    index: number
}
interface AnchorMetadataArgs {
    name: string,
    symbol: string,
    uri: string,
    sellerFeeBasisPoints: number,
    primarySaleHappened: boolean,
    isMutable: boolean,
    collection: {verified: boolean, key: PublicKey} | null,
    creators: Array<{address: PublicKey, verified: boolean, share: number}>
}