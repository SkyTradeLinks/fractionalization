use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token::TokenAccount};

use anchor_spl::token::Token;

#[derive(Accounts)]
// #[instruction(bump: u8, fee_payer_bump: u8, treasury_bump: u8)]
pub struct CancelOfferAccounts<'info> {
    #[account(mut)]
    signer: Signer<'info>,
    fractionalization_data: Account<'info, TokenAccount>,
    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
    associated_token_program: Program<'info, AssociatedToken>,
    rent: Sysvar<'info, Rent>,
    /// CHECK: checked in IX
    #[account(mut)]
    fees_treasury: AccountInfo<'info>,
}

impl<'info> CancelOfferAccounts<'info> {
    // fn transfer_ctx(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
    //     CpiContext::new(
    //         self.token_program.to_account_info(),
    //         Transfer {
    //             from: self.fractionalization_data_ata.to_account_info(),
    //             to: self.signer_ata.to_account_info(),
    //             authority: self.fractionalization_data.to_account_info(),
    //         },
    //     )
    // }
}

pub fn handle_buyback_swap(ctx: Context<CancelOfferAccounts>) -> Result<()> {
    Ok(())
}
