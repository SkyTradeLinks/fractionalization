use anchor_lang::prelude::Pubkey;
pub const FRACTIONS_PREFIX: &str = "fractions";
pub const BUYBACK_ESCROW_PREFIX: &str = "buyback_escrow";
pub const CONFIG_PREFIX: &str = "config";

#[derive(Clone)]
pub struct MplBubblegumProgramAccount;
impl anchor_lang::Id for MplBubblegumProgramAccount {
    fn id() -> Pubkey {
        mpl_bubblegum::programs::MPL_BUBBLEGUM_ID
    }
}

#[derive(Clone)]
pub struct SplAccountCompressionProgramAccount;
impl anchor_lang::Id for SplAccountCompressionProgramAccount {
    fn id() -> Pubkey {
        mpl_bubblegum::programs::SPL_ACCOUNT_COMPRESSION_ID
    }
}

#[derive(Clone)]
pub struct NoopProgramAccount;
impl anchor_lang::Id for NoopProgramAccount {
    fn id() -> Pubkey {
        mpl_bubblegum::programs::SPL_NOOP_ID
    }
}

pub struct MintCreator;
impl MintCreator {
    pub fn get_signer_seeds(bump: &[u8]) -> [&[u8]; 2] {
        [b"mint_creator", bump]
    }
}

pub struct VerificationCreator;
impl VerificationCreator {
    pub fn get_signer_seeds(bump: &[u8]) -> [&[u8]; 2] {
        [b"verification_creator", bump]
    }
}
