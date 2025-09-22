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

declare_id!("DZ5qqnkwDnqCwZ8yXFF6EvT14fBzYiv1g3E4YEUxAvvN");

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

    // Initialize the FractionalizationData account
    pub fn init_fractionalization_data<'info>(
        ctx: Context<'_, '_, '_, 'info, InitFractionalizationDataAccounts<'info>>,
        args: InitFractionalizationDataArgs,
    ) -> Result<()> {
        handle_init_fractionalization_data(ctx, args)
    }

    pub fn fractionalize<'info>(
        ctx: Context<'_, '_, '_, 'info, FractionalizeAccounts<'info>>,

        args: FractionalizeArgs,
    ) -> Result<()> {
        handle_fractionalize(ctx, args)
    }

    pub fn buyback_swap(ctx: Context<BuybackSwapAccounts>, args: BuybackSwapArgs) -> Result<()> {
        handle_buyback_swap(ctx, args)
    }

    pub fn reclaim<'info>(
        ctx: Context<'_, '_, '_, 'info, ReclaimAccounts<'info>>,
        args: ReclaimArgs,
    ) -> Result<()> {
    handle_reclaim(validation::ValidatableContext(ctx), args)
    }
}
