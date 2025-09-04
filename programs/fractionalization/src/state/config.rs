use anchor_lang::prelude::*;

use crate::errors::CustomError;

/// Represents "1" when working with basis points
pub static UNIT_BASIS_POINTS: u64 = 10_000;

#[account]
pub struct Config {
    pub authority: Pubkey,
    pub usdc_address: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug)]
pub struct UpdateConfigArgs {
    pub authority: Option<Pubkey>,
    pub usdc_address: Option<Pubkey>,
}

impl Config {
    pub const MAX_SIZE: usize = 8 + //discriminator
        32 + // authority
        32; // usdc_address

    pub fn init(&mut self, authority: Pubkey, usdc_address: Pubkey) {
        *self = Config {
            authority,
            usdc_address,
        }
    }

    pub fn validate_authority(&self, key: Pubkey) -> Result<()> {
        require_keys_eq!(key, self.authority, CustomError::InvalidAuthority);
        Ok(())
    }

    pub fn update_config(&mut self, args: UpdateConfigArgs) {
        *self = Config {
            authority: args.authority.unwrap_or(self.authority),
            usdc_address: args.usdc_address.unwrap_or(self.usdc_address),
        }
    }
}
