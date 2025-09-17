use crate::state::{Config, FractionalizationData};
use crate::validation::{ValidatableContext, ValidateAccounts};
use crate::AnchorTransferInstructionArgs;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, TokenAccount, Token};
use anchor_lang::solana_program::{program::invoke_signed, instruction::{AccountMeta, Instruction}};
use mpl_bubblegum::instructions::{TransferCpi, TransferCpiAccounts, TransferInstructionArgs};
use crate::MplBubblegumProgramAccount;
use crate::{errors::CustomError};

#[derive(Accounts)]
#[instruction(args: ReclaimArgs)]
pub struct ReclaimAccounts<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub config: Account<'info, Config>,

    /// Fractionalization state
    #[account(mut)]
    pub fractions: Account<'info, FractionalizationData>,

    /// CHECK: The mint for the fractions
    #[account(mut)]
    pub fractions_mint: AccountInfo<'info>,

    /// The token account holding the payer's fractions
    #[account(mut)]
    pub payer_fractions_ata: Account<'info, TokenAccount>,

    // --- Bubblegum cNFT transfer accounts ---
    /// CHECK: Tree authority PDA
    pub tree_authority: AccountInfo<'info>,
    /// CHECK: leaf_owner PDA (the vault, program-owned)
    #[account(mut)]
    pub leaf_owner: AccountInfo<'info>,
    /// CHECK: new_leaf_owner (the reclaimer)
    #[account(mut)]
    pub new_leaf_owner: AccountInfo<'info>,
    /// CHECK: Merkle tree
    #[account(mut)]
    pub merkle_tree: AccountInfo<'info>,
    /// CHECK: Log wrapper
    pub log_wrapper: AccountInfo<'info>,
    /// CHECK: Compression program
    pub compression_program: AccountInfo<'info>,
    /// CHECK: Bubblegum program
    pub bubblegum_program: AccountInfo<'info>,
    /// System program
    pub system_program: Program<'info, System>,

    /// Token program
    pub token_program: Program<'info, Token>,
}

impl<'info> ReclaimAccounts<'info> {
    pub fn transfer_cnft_to_reclaimer(
        &self,
        args: crate::AnchorTransferInstructionArgs,
        _proof_accounts: Vec<(&AccountInfo<'info>, bool, bool)>,
        leaf_owner_bump: u8,
    ) -> Result<()> {
        let transfer_args: TransferInstructionArgs = args.into_transfer_instruction_args()?;
        let system_program_info = self.system_program.to_account_info();
        let transfer_cpi = TransferCpi::new(
            &self.bubblegum_program,
            TransferCpiAccounts {
                tree_config: &self.tree_authority,
                leaf_owner: (&self.leaf_owner, true),
                leaf_delegate: (&self.leaf_owner, true),
                new_leaf_owner: &self.new_leaf_owner,
                merkle_tree: &self.merkle_tree,
                log_wrapper: &self.log_wrapper,
                compression_program: &self.compression_program,
                system_program: &system_program_info,
            },
            transfer_args,
        );
        let seeds: &[&[u8]] = &[b"cNFT-vault", &[leaf_owner_bump]];
        let signer_seeds: &[&[&[u8]]] = &[seeds];
        transfer_cpi.invoke_signed(signer_seeds)?;
        Ok(())
    }

    pub fn burn_fractions(&self, amount: u64) -> Result<()> {
        let cpi_ctx = CpiContext::new(
            self.token_program.to_account_info(),
            Burn {
                mint: self.fractions_mint.clone(),
                from: self.payer_fractions_ata.to_account_info(),
                authority: self.payer.to_account_info(),
            },
        );
        token::burn(cpi_ctx, amount)?;
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
    ctx: ValidatableContext<'_, '_, '_, 'info, ReclaimAccounts<'info>>,
    args: ReclaimArgs,
) -> Result<()> {
    let ctx_ref = ctx.get_ctx();
    let accounts = &ctx_ref.accounts;
    let fractions_supply = accounts.fractions.fractions_supply;
    let user_balance = accounts.payer_fractions_ata.amount;
    require!(fractions_supply == 1_000_000, CustomError::InvalidSupply);
    require!(user_balance > 800_000, CustomError::NotEnoughFractions);

    accounts.burn_fractions(user_balance)?;

    // Use a hardcoded bump for now, or derive as needed
    let leaf_owner_bump: u8 = 0;
    let proof_accounts: Vec<(&AccountInfo, bool, bool)> = ctx_ref.remaining_accounts.iter().map(|acct| (acct, false, false)).collect();
    accounts.transfer_cnft_to_reclaimer(
        args.transfer_instruction_args,
        proof_accounts,
        leaf_owner_bump,
    )?;

    Ok(())
}

