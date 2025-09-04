use crate::state::Config;
use crate::validation::{ValidatableContext, ValidateAccounts};
use crate::AnchorTransferInstructionArgs;
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(args: ReclaimArgs)]
pub struct ReclaimAccounts<'info> {
    #[account(mut)]
    payer: Signer<'info>,
    config: Account<'info, Config>,
}

impl<'info> ReclaimAccounts<'info> {
    pub fn transfer_cnft_to_reclaimer(&self) -> Result<()> {
        Ok(())
    }

    pub fn burn_fractions(&self) -> Result<()> {
        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ReclaimArgs {
    pub transfer_instruction_args: AnchorTransferInstructionArgs,
}

impl<'info> ValidateAccounts for ReclaimAccounts<'info> {
    type Args = ReclaimArgs;

    fn validate(&self, _args: &ReclaimArgs) -> Result<()> {
        Ok(())
    }
}

pub fn handle_reclaim<'info>(
    _ctx: ValidatableContext<'_, '_, '_, 'info, ReclaimAccounts<'info>>,
    _args: ReclaimArgs,
) -> Result<()> {
    Ok(())
}
