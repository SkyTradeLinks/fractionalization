use anchor_lang::prelude::*;
use crate::state::{Config, FractionalizationData};
use crate::validation::{ValidatableContext, ValidateAccounts};
use crate::AnchorTransferInstructionArgs;
use anchor_spl::token_interface::TokenAccount;
use anchor_spl::token_2022::{
    self,
    Token2022,
    Burn
};
use anchor_lang::solana_program::{program::invoke_signed, instruction::{AccountMeta, Instruction}};
use mpl_bubblegum::instructions::{TransferBuilder, TransferInstructionArgs};
use crate::MplBubblegumProgramAccount;
use crate::{errors::CustomError};

#[derive(Accounts)]
#[instruction(args: ReclaimArgs)]
pub struct ReclaimAccounts<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    // pub config: Account<'info, Config>,

    /// Fractionalization state
    #[account(mut)]
    pub fractions: Account<'info, FractionalizationData>,

    /// CHECK: The mint for the fractions
    #[account(mut)]
    pub fractions_mint: AccountInfo<'info>,

    /// The token account holding the payer's fractions (Token-2022)
    #[account(mut)]
    pub payer_fractions_ata: InterfaceAccount<'info, TokenAccount>,

    // --- Bubblegum cNFT transfer accounts ---
    /// CHECK: Tree config PDA
    pub tree_config: AccountInfo<'info>,

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

    /// Token-2022 program
    pub token_program: Program<'info, Token2022>,
}

impl<'info> ReclaimAccounts<'info> {
    pub fn transfer_cnft_to_reclaimer(
        &self,
        args: crate::AnchorTransferInstructionArgs,
        proof_accounts: Vec<(&AccountInfo<'info>, bool, bool)>,
    ) -> Result<()> {
        let transfer_args: TransferInstructionArgs = args.into_transfer_instruction_args()?;

        // Build the transfer instruction using TransferBuilder
        let mut transfer_builder = TransferBuilder::new();
        transfer_builder
            .tree_config(self.tree_config.key())
            // Use the fractions PDA as the leaf_owner and leaf_delegate (the vault holding the cNFT)
            .leaf_owner(self.fractions.key(), true)
            .leaf_delegate(self.fractions.key(), true)
            .new_leaf_owner(self.payer.key())
            .merkle_tree(self.merkle_tree.key())
            .log_wrapper(self.log_wrapper.key())
            .compression_program(self.compression_program.key())
            .system_program(self.system_program.key())
            .root(transfer_args.root)
            .data_hash(transfer_args.data_hash)
            .creator_hash(transfer_args.creator_hash)
            .nonce(transfer_args.nonce)
            .index(transfer_args.index);

        // Add proof accounts as readonly AccountMeta
        for (acct, _, _) in &proof_accounts {
            transfer_builder.add_remaining_account(AccountMeta::new_readonly(acct.key(), false));
        }

        let ix = transfer_builder.instruction();

        // Build the account_infos vector in the order Bubblegum expects
        let mut account_infos = vec![
            self.tree_config.clone(),
            self.fractions.to_account_info(), // leaf_owner
            self.fractions.to_account_info(), // leaf_delegate
            self.payer.to_account_info(), // new_leaf_owner
            self.merkle_tree.clone(),
            self.log_wrapper.clone(),
            self.compression_program.clone(),
            self.system_program.to_account_info(),
        ];
        for (acct, _, _) in &proof_accounts {
            account_infos.push((*acct).clone());
        }

        // If the vault is the fractions PDA, use the same seeds as in fractionalize:
        // [FRACTIONS_PREFIX.as_bytes(), asset_id.key().as_ref(), &[bump]]
        // Here, leaf_owner is the vault PDA (fractions)
        let asset_id = self.fractions.asset_id;
        let bump = self.fractions.bump[0];
        let seeds: &[&[u8]] = &[
            crate::constants::FRACTIONS_PREFIX.as_bytes(),
            asset_id.as_ref(),
            &[bump],
        ];
        let signer_seeds: &[&[&[u8]]] = &[seeds];
        invoke_signed(&ix, &account_infos, signer_seeds)?;
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
        token_2022::burn(cpi_ctx, amount)?;
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
    let user_balance = accounts.payer_fractions_ata.amount;
    // 800,000 fragments with 6 decimals = 800_000 * 10^6 = 800_000_000
    require!(user_balance > 800_000_000_000, CustomError::NotEnoughFractions);

    accounts.burn_fractions(user_balance)?;

    // Derive the bump for the fractions PDA (leaf_owner)
    let proof_accounts: Vec<(&AccountInfo, bool, bool)> = ctx_ref.remaining_accounts.iter().map(|acct| (acct, false, false)).collect();
    accounts.transfer_cnft_to_reclaimer(
        args.transfer_instruction_args,
        proof_accounts,
    )?;

    Ok(())
}

