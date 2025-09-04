use anchor_lang::prelude::*;
use anchor_spl::token::Token;
use mpl_bubblegum::instructions::TransferInstructionArgs;

use crate::{
    constants::FRACTIONS_PREFIX, AnchorTransferInstructionArgs, FractionalizationData,
    MplBubblegumProgramAccount,
};

#[derive(Accounts)]
#[instruction(args: FractionalizeArgs)]
pub struct FractionalizeAccounts<'info> {
    #[account(mut)]
    payer: Signer<'info>,

    /// CHECK: TODO
    asset_id: AccountInfo<'info>,
    #[account(
        init,
        payer = payer,
        space = FractionalizationData::MAX_SIZE,
        seeds = [
            FRACTIONS_PREFIX.as_bytes(),
            asset_id.key().as_ref(),
        ],
        bump
    )]
    fractions: Box<Account<'info, FractionalizationData>>,
    bubblegum_program: Program<'info, MplBubblegumProgramAccount>,
    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
}

impl<'info> FractionalizeAccounts<'info> {
    // fn mint_fractions(&self) -> CpiContext<'_, '_, '_, 'info, Mint> {
    //     CpiContext::new(
    //         self.token_program.to_account_info(),
    //         Mint {
    //             to: self.payer_ata.to_account_info(),
    //             authority: self.fractions.to_account_info(),
    //         },
    //     )
    // }

    pub fn transfer_cnft_to_fractions_escrow(
        &self,
        _args: TransferInstructionArgs,
        _proof_accounts: Vec<(&AccountInfo<'info>, bool, bool)>,
    ) -> Result<()> {
        // let binding = &self.fractions.to_account_info();
        // let transfer_cpi = TransferCpi::new(
        //     &self.bubblegum_program,
        //     TransferCpiAccounts {
        //         tree_config: &self.tree_config,
        //         leaf_owner: (&self.seller, true),
        //         leaf_delegate: (&self.seller, true),
        //         new_leaf_owner: &binding,
        //         merkle_tree: &self.merkle_tree,
        //         log_wrapper: &self.log_wrapper,
        //         compression_program: &self.compression_program,
        //         system_program: &self.system_program,
        //     },
        //     args,
        // );
        // transfer_cpi.invoke_with_remaining_accounts(&proof_accounts)?;

        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct FractionalizeArgs {
    pub transfer_cnft_args: AnchorTransferInstructionArgs,
    pub merkle_tree: Pubkey,
    pub fractions_supply: u64,
    pub fractionalization_time: i64,
}

pub fn handle_fractionalize(
    _ctx: Context<FractionalizeAccounts>,
    _args: FractionalizeArgs,
) -> Result<()> {
    Ok(())
}
