// use crate::state::Config;
use crate::validation::{ValidatableContext, ValidateAccounts};
use anchor_lang::prelude::*;

use mpl_bubblegum::instructions::{TransferCpi, TransferCpiAccounts, TransferInstructionArgs};

use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Burn, Mint, Token, TokenAccount}
};

use crate::{
    constants::{NoopProgramAccount, SplAccountCompressionProgramAccount, FRACTIONS_PREFIX},
    AnchorTransferInstructionArgs, FractionalizationData, MplBubblegumProgramAccount,
};

#[derive(Accounts)]
#[instruction(args: ReclaimArgs)]
pub struct ReclaimAccounts<'info> {
    #[account(mut)]
    payer: Signer<'info>,

    //config: Account<'info, Config>,
    /// CHECK: TODO
    asset_id: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [
            FRACTIONS_PREFIX.as_bytes(),
            asset_id.key().as_ref(),
        ],
        bump,
    )]
    fractions: Box<Account<'info, FractionalizationData>>,

    #[account(
        seeds = [merkle_tree.key().as_ref()],
        bump,
        seeds::program = mpl_bubblegum::ID
    )]
    /// CHECK: This account is neither written to nor read from.
    tree_config: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: This account is modified in the downstream program
    merkle_tree: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [b"fractions_mint", asset_id.key().as_ref()],
        bump,
    )]
    fractions_mint: Box<Account<'info, Mint>>,

    #[account(mut)]
    payer_token_account: Box<Account<'info, TokenAccount>>,

    token_program: Program<'info, Token>,

    log_wrapper: Program<'info, NoopProgramAccount>, // This creates log to track cNFTs
    compression_program: Program<'info, SplAccountCompressionProgramAccount>,
    bubblegum_program: Program<'info, MplBubblegumProgramAccount>,
    system_program: Program<'info, System>,
    associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> ReclaimAccounts<'info> {
    pub fn transfer_cnft_to_reclaimer(
        &self,
        args: TransferInstructionArgs,
        proof_accounts: Vec<(&AccountInfo<'info>, bool, bool)>,
    ) -> Result<()> {
        let binding = &self.fractions.to_account_info();
        let asset_id = &self.asset_id.key();
        let bump = self.fractions.bump[0];

        let seeds: [&[u8]; 3] = [FRACTIONS_PREFIX.as_bytes(), asset_id.as_ref(), &[bump]];
        let signer_seeds: &[&[&[u8]]] = &[&seeds];

        let transfer_cpi = TransferCpi::new(
            &self.bubblegum_program,
            TransferCpiAccounts {
                tree_config: &self.tree_config,
                leaf_owner: (binding, true),
                leaf_delegate: (binding, true),
                new_leaf_owner: &self.payer,
                merkle_tree: &self.merkle_tree,
                log_wrapper: &self.log_wrapper,
                compression_program: &self.compression_program,
                system_program: &self.system_program,
            },
            args,
        );

        transfer_cpi.invoke_signed_with_remaining_accounts(signer_seeds, &proof_accounts)?;

        Ok(())
    }

    pub fn burn_fractions(&self, balance: u64) -> Result<()> {
        let cpi_program = self.token_program.to_account_info();
        let cpi_accounts = Burn {
            mint: self.fractions_mint.to_account_info(),
            from: self.payer_token_account.to_account_info(),
            authority: self.payer.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::burn(cpi_ctx, balance)?;


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
    ctx: Context<'_, '_, '_, 'info, ReclaimAccounts<'info>>,
    args: ReclaimArgs,
) -> Result<()> {


    let balance = ctx.accounts.payer_token_account.amount;
    let total_supply = ctx.accounts.fractions_mint.supply;

    require!(
        balance * 100 > total_supply * 80,
        CustomError::NotEnoughForReclaim
    );

    ctx.accounts.burn_fractions(balance)?;

    let transfer_args = TransferInstructionArgs {
        root: args.transfer_instruction_args.root,
        data_hash: args.transfer_instruction_args.data_hash,
        creator_hash: args.transfer_instruction_args.creator_hash,
        nonce: args.transfer_instruction_args.nonce,
        index: args.transfer_instruction_args.index,
    };

    let proof_accounts: Vec<(&AccountInfo, bool, bool)> = ctx
        .remaining_accounts
        .iter()
        .map(|account| (account, false, false))
        .collect();

    ctx.accounts
        .transfer_cnft_to_reclaimer(transfer_args, proof_accounts)?;

    // close the PDA 
    ctx.accounts.fractions.close(ctx.accounts.payer.to_account_info())?;

    Ok(())
}

#[error_code]
pub enum CustomError {
    #[msg("User does not hold more than 80% of total supply.")]
    NotEnoughForReclaim,
}
