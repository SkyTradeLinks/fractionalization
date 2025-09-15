import BN from "bn.js"

export interface ReclaimAccounts<P, K> {
    payer: K,
    fractionalizationToken: P,
    payerFractionalizationAta: P,
    fractions: P,
    bubblegumProgram: P,
    compressionProgram: P,
    logWrapper: P,
    systemProgram: P,
    associatedTokenProgram: P,
    tokenProgram: P,
    treeConfig: P,
    leafDelegate: P,
    merkleTree: P,
    assetId: P
}

export interface ReclaimArgs {
    transferInstructionArgs: AnchorTransferInstructionArgs
}

interface AnchorTransferInstructionArgs {
    root: number[],
    dataHash: number[],
    creatorHash: number[],
    nonce: BN,
    index: number
}