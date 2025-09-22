use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface,
    token_interface::{ Mint, MintTo, Token2022, TokenAccount},
};
use mpl_bubblegum::instructions::{TransferBuilder, TransferInstructionArgs};
use crate::types::mpl_anchor_wrappers::AnchorMetadataArgs;

use crate::{
    constants::FRACTIONS_PREFIX, AnchorTransferInstructionArgs, FractionalizationData,
    MplBubblegumProgramAccount,
};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct FractionalizeArgs {
    pub transfer_cnft_args: AnchorTransferInstructionArgs,
    pub fractions_supply: u64,
}

#[derive(Accounts)]
#[instruction(args: FractionalizeArgs)]
pub struct FractionalizeAccounts<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: original asset identifier (cNFT asset id / leaf id)
    pub asset_id: AccountInfo<'info>,

    /// CHECK: Merkle tree config account (Bubblegum)
    #[account(mut)]
    pub tree_config: AccountInfo<'info>,

    /// CHECK: Merkle tree account (Bubblegum)
    #[account(mut)]
    pub merkle_tree: AccountInfo<'info>,

    // / CHECK: that it is the right tree_authority
    // pub tree_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [
            FRACTIONS_PREFIX.as_bytes(),
            asset_id.key().as_ref(),
        ],
        bump
    )]
    pub fractions: Box<Account<'info, FractionalizationData>>,

    /// SPL-2022 mint for fraction tokens (PDA, stable)
    #[account(
        mut,
        seeds = [b"fractions_mint", asset_id.key().as_ref()],
        bump,
        mint::token_program = token_program
    )]
    pub fractions_mint: Box<InterfaceAccount<'info, Mint>>,

    /// ATA for payer to receive fraction supply
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = fractions_mint,
        associated_token::authority = payer,
        associated_token::token_program = token_program
    )]
    pub payer_fractions_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    /// CHECK: Log wrapper program (Bubblegum)
    pub log_wrapper: AccountInfo<'info>,

    /// CHECK: Compression program (Bubblegum)
    pub compression_program: AccountInfo<'info>,

    /// Programs
    pub bubblegum_program: Program<'info, MplBubblegumProgramAccount>,
    pub token_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> FractionalizeAccounts<'info> {
    // fn mint_fractions(&self) -> CpiContext<'_, '_, '_, 'info, Mint> {
    //     CpiContext::new(
    //         self.token_program.to_account_info(),
    //         Mint {
    //             to: self.payer_fractions_ata.to_account_info(),
    //             authority: self.fractions.to_account_info(),
    //         },
    //     )
    // }

    pub fn transfer_cnft_to_fractions_escrow(
        &self,
        args: TransferInstructionArgs,
        proof_accounts: Vec<AccountInfo<'info>>,
    ) -> Result<()> {
        use anchor_lang::solana_program::{program::invoke, instruction::AccountMeta};

        // Build the transfer instruction using TransferBuilder
        let mut transfer_builder = TransferBuilder::new();
        transfer_builder
            .tree_config(self.tree_config.key())
            .leaf_owner(self.payer.key(), true)
            .leaf_delegate(self.payer.key(), true)
            .new_leaf_owner(self.fractions.key())
            .merkle_tree(self.merkle_tree.key())
            .log_wrapper(self.log_wrapper.key())
            .compression_program(self.compression_program.key())
            .system_program(self.system_program.key())
            .root(args.root)
            .data_hash(args.data_hash)
            .creator_hash(args.creator_hash)
            .nonce(args.nonce)
            .index(args.index);

        // Add proof accounts as readonly AccountMeta
        for acct in &proof_accounts {
            transfer_builder.add_remaining_account(AccountMeta::new_readonly(acct.key(), false));
        }

        let ix = transfer_builder.instruction();

        // Build the account_infos vector in the order Bubblegum expects
        let mut account_infos = vec![
            self.tree_config.to_account_info(),
            self.payer.to_account_info(), // leaf_owner
            self.payer.to_account_info(), // leaf_delegate
            self.fractions.to_account_info(), // new_leaf_owner
            self.merkle_tree.to_account_info(),
            self.log_wrapper.to_account_info(),
            self.compression_program.to_account_info(),
            self.system_program.to_account_info(),
        ];
        for acct in &proof_accounts {
            account_infos.push(acct.clone());
        }

        // CPI does NOT need program signing here (payer signs)
        invoke(&ix, &account_infos)?;
        Ok(())
    }

}

pub fn handle_fractionalize<'info>(
    ctx: Context<'_, '_, '_, 'info, FractionalizeAccounts<'info>>,
    args: FractionalizeArgs,
) -> Result<()> {
    // 1. Transfer cNFT into escrow PDA
    let proof_accounts: Vec<AccountInfo> = ctx.remaining_accounts.iter().map(|acct| acct.clone()).collect();
    let bubblegum_transfer_args: TransferInstructionArgs = args.transfer_cnft_args.into_transfer_instruction_args()?;
    ctx.accounts.transfer_cnft_to_fractions_escrow(bubblegum_transfer_args, proof_accounts)?;

    // 2. Mint fractions to payer (fixed supply: 1_000_000) after cNFT transfer
    let asset_id_key = ctx.accounts.asset_id.key();
    let bump = ctx.accounts.fractions.bump[0];
    let seeds: &[&[u8]] = &[
        FRACTIONS_PREFIX.as_bytes(),
        asset_id_key.as_ref(),
        &[bump],
    ];
    let signer_seeds: &[&[&[u8]]] = &[&seeds];

    let mint_to_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        MintTo {
            mint: ctx.accounts.fractions_mint.to_account_info(),
            to: ctx.accounts.payer_fractions_ata.to_account_info(),
            authority: ctx.accounts.fractions.to_account_info(),
        },
        signer_seeds,
    );

    token_interface::mint_to(mint_to_ctx, args.fractions_supply)?;

    // Log addresses and info
    msg!(
        "Fractionalization complete. Fractiozns Mint: {}, Payer ATA: {}, Supply: {}",
        ctx.accounts.fractions_mint.key(),
        ctx.accounts.payer_fractions_ata.key(),
        args.fractions_supply
    );

    Ok(())
}
