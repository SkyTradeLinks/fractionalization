#![allow(clippy::result_large_err)]
#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;
pub mod types;
pub mod validation;

pub use constants::*;
pub use errors::*;
pub use instructions::*;
pub use state::*;
pub use types::*;
pub use validation::*;

declare_id!("CgZgZcGNLyxQcFMHGmomQD5op5hW2ncVxDLt5DnZWn7g");

#[program]
pub mod fractionalization {

    use super::*;

    pub fn initialize_config(
        ctx: Context<InitializeConfigAccounts>,
        args: InitializeConfigArgs,
    ) -> Result<()> {
        handle_initialize_config(ctx, args)
    }

    pub fn update_config(ctx: Context<UpdateConfigAccounts>, args: UpdateConfigArgs) -> Result<()> {
        handle_update_config(ctx, args)
    }

    pub fn init_mint_metadata(ctx: Context<InitToken>, args: InitTokenParams) -> Result<()> {
        handle_init_mint_metadata(ctx, args)
    }

    pub fn fractionalize<'info>(
        ctx: Context<'_, '_, '_, 'info, FractionalizeAccounts<'info>>,
        args: FractionalizeArgs,
    ) -> Result<()> {
        handle_fractionalize(ctx, args)
    }

    pub fn reclaim<'info>(
        ctx: Context<'_, '_, '_, 'info, ReclaimAccounts<'info>>,
        args: ReclaimArgs,
    ) -> Result<()> {
        handle_reclaim(ctx, args)
    }

    pub fn buyback_swap(ctx: Context<BuybackSwapAccounts>, args: BuybackSwapArgs) -> Result<()> {
        handle_buyback_swap(ctx, args)
    }
}
