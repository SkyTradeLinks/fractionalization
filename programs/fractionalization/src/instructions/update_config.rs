use crate::UpdateConfigArgs;
use crate::{constants::CONFIG_PREFIX, state::Config};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct UpdateConfigAccounts<'info> {
    authority: Signer<'info>,
    #[account(
        mut,
        seeds = [
            CONFIG_PREFIX.as_bytes(),
        ],
        bump,
        has_one = authority,
    )]
    config: Account<'info, Config>,
}

pub fn handle_update_config(
    ctx: Context<UpdateConfigAccounts>,
    args: UpdateConfigArgs,
) -> Result<()> {
    let config = &mut ctx.accounts.config;
    config.update_config(args);

    Ok(())
}
