use anchor_lang::prelude::*;
use crate::{FractionalizeArgs, FRACTIONS_PREFIX};

#[account]
/// Created by the Token owner, holds the most updated data of the FractionalizationData
pub struct FractionalizationData {
    pub bump: [u8; 1],
    pub asset_id: Pubkey,
    pub merkle_tree: Pubkey,
    pub fractions_supply: u64,
    pub fractionalization_time: i64,
    pub fractions_token_id: Pubkey,
    pub status: FractionStatus,
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize, Copy, Debug)]

pub enum FractionStatus {
    Active,
    Reclaimed,
}

impl FractionalizationData {
    pub const MAX_SIZE: usize = 8 + //discriminator
        1 + // bump
        32 + // asset_id
        32 + // merkle_tree
        8 + // fractions_supply
        8 + // fractionalization_time
        32 + // fractions_token_id
        2; // status

    #[inline(always)]
    pub fn get_signer_seeds(&self) -> [&[u8]; 2] {
        [FRACTIONS_PREFIX.as_bytes(), self.asset_id.as_ref()]
    }

    
    /// Inits the Account PDA with minimal args
    /// Inits the Account PDA
    #[allow(clippy::too_many_arguments)]
    pub fn init_fraction(
        &mut self,
        args: &crate::instructions::init_fractionalization_data::InitFractionalizationDataArgs,
        asset_id: Pubkey,
        bump: u8,
    ) {
        // use system clock to get current timestamp
        let clock = Clock::get().unwrap().unix_timestamp;
        *self = FractionalizationData {
            bump: [bump],
            asset_id,
            merkle_tree: args.merkle_tree,
            fractions_supply: 0,
            fractionalization_time: clock,
            fractions_token_id: Pubkey::default(),
            status: FractionStatus::Active,
        }
    }
    
}
