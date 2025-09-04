use anchor_lang::prelude::*;

use crate::{constants::CONFIG_PREFIX, state::Config};

#[derive(Accounts)]
pub struct InitializeConfigAccounts<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: TODO
    pub authority: AccountInfo<'info>,
    #[account(
        init,
        seeds = [
            CONFIG_PREFIX.as_bytes(),
        ],
        payer = payer,
        space = Config::MAX_SIZE,
        bump
    )]
    pub config: Box<Account<'info, Config>>,
    /// CHECK: TODO
    pub usdc_address: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitializeConfigArgs {}

pub fn handle_initialize_config(
    ctx: Context<InitializeConfigAccounts>,
    _args: InitializeConfigArgs,
) -> Result<()> {
    let config = &mut ctx.accounts.config;
    config.init(
        ctx.accounts.authority.key(),
        ctx.accounts.usdc_address.key(),
    );

    Ok(())
}
