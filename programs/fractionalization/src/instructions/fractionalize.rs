use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface,
    token_interface::{ Mint, MintTo, Token2022, TokenAccount},
};
use mpl_bubblegum::{
    instructions::{TransferCpi, TransferCpiAccounts, TransferInstructionArgs},
};
use crate::types::mpl_anchor_wrappers::AnchorMetadataArgs;

use crate::{
    constants::FRACTIONS_PREFIX, AnchorTransferInstructionArgs, FractionalizationData,
    MplBubblegumProgramAccount,
};
use solana_program::{instruction::AccountMeta, program::invoke_signed};

#[derive(Accounts)]
#[instruction(args: FractionalizeArgs)]
pub struct FractionalizeAccounts<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: original asset identifier (cNFT asset id / leaf id)
    pub asset_id: AccountInfo<'info>,

    /// CHECK: Merkle tree config account (Bubblegum)
    pub tree_config: AccountInfo<'info>,

    /// CHECK: Merkle tree account (Bubblegum)
    pub merkle_tree: AccountInfo<'info>,

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

    /// CHECK: Metadata PDA for fraction token (Metaplex)
    #[account(mut)]
    pub fractions_metadata: AccountInfo<'info>,

    /// CHECK: Log wrapper program (Bubblegum)
    pub log_wrapper: AccountInfo<'info>,

    /// CHECK: Compression program (Bubblegum)
    pub compression_program: AccountInfo<'info>,

    /// Programs
    pub bubblegum_program: Program<'info, MplBubblegumProgramAccount>,
    pub token_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    /// CHECK: Token Metadata Program (Metaplex)
    pub token_metadata_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
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
        proof_accounts: Vec<(&AccountInfo<'info>, bool, bool)>,
    ) -> Result<()> {
        let binding = &self.fractions.to_account_info();
        let payer_account_info = self.payer.to_account_info();
        let transfer_cpi = TransferCpi::new(
            &self.bubblegum_program,
            TransferCpiAccounts {
                tree_config: &self.tree_config,
                leaf_owner: (&payer_account_info, true),
                leaf_delegate: (&payer_account_info, true),
                new_leaf_owner: &binding,
                merkle_tree: &self.merkle_tree,
                log_wrapper: &self.log_wrapper,
                compression_program: &self.compression_program,
                system_program: &self.system_program,
            },
            args,
        );
        transfer_cpi.invoke_with_remaining_accounts(&proof_accounts)?;

        Ok(())
    }

}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct FractionalizeArgs {
    pub root: [u8; 32],
    pub data_hash: [u8; 32],
    pub creator_hash: [u8; 32],
    pub nonce: u64,
    pub index: u32,
    pub merkle_tree: Pubkey,
    pub fractions_supply: u64,
    pub fractionalization_time: i64,
    pub original_metadata: AnchorMetadataArgs, // mirror original cNFT metadata
}


pub fn handle_fractionalize<'info>(
    ctx: Context<'_, '_, '_, 'info, FractionalizeAccounts<'info>>,
    args: FractionalizeArgs,
) -> Result<()> {
    msg!("attempting to deposit cNFT {} into tree {}", args.index, ctx.accounts.merkle_tree.key());

    // Build accounts vector for Bubblegum transfer CPI
    let mut accounts: Vec<AccountMeta> = vec![
        AccountMeta::new_readonly(ctx.accounts.tree_config.key(), false),
        AccountMeta::new_readonly(ctx.accounts.payer.key(), true), // leaf_owner
        AccountMeta::new_readonly(ctx.accounts.payer.key(), true), // leaf_delegate
        AccountMeta::new(ctx.accounts.fractions.key(), false),     // new_leaf_owner (escrow)
        AccountMeta::new(ctx.accounts.merkle_tree.key(), false),
        AccountMeta::new_readonly(ctx.accounts.log_wrapper.key(), false),
        AccountMeta::new_readonly(ctx.accounts.compression_program.key(), false),
        AccountMeta::new_readonly(ctx.accounts.system_program.key(), false),
    ];

    let mut account_infos: Vec<AccountInfo> = vec![
        ctx.accounts.tree_config.to_account_info(),
        ctx.accounts.payer.to_account_info(),
        ctx.accounts.payer.to_account_info(),
        ctx.accounts.fractions.to_account_info(),
        ctx.accounts.merkle_tree.to_account_info(),
        ctx.accounts.log_wrapper.to_account_info(),
        ctx.accounts.compression_program.to_account_info(),
        ctx.accounts.system_program.to_account_info(),
    ];

    // Add Merkle proof accounts from remaining_accounts
    for acc in ctx.remaining_accounts.iter() {
        accounts.push(AccountMeta::new_readonly(acc.key(), false));
        account_infos.push(acc.to_account_info());
    }

    // Build instruction data for Bubblegum transfer CPI
    // You may need to update TRANSFER_DISCRIMINATOR to match Bubblegum's transfer instruction
    const TRANSFER_DISCRIMINATOR: &[u8] = &[217, 246, 219, 186, 8, 0, 0, 0]; // Example, update as needed
    let mut data: Vec<u8> = vec![];
    data.extend(TRANSFER_DISCRIMINATOR);
    data.extend(args.root);
    data.extend(args.data_hash);
    data.extend(args.creator_hash);
    data.extend(args.nonce.to_le_bytes());
    data.extend(args.index.to_le_bytes());

    // Seeds for escrow PDA (fractions)
    let asset_id_key = ctx.accounts.asset_id.key();
    let bump = ctx.accounts.fractions.bump[0];
    let seeds: &[&[u8]] = &[
        FRACTIONS_PREFIX.as_bytes(),
        asset_id_key.as_ref(),
        &[bump],
    ];
    let signer_seeds: &[&[&[u8]]] = &[&seeds];

    // CPI: Transfer cNFT into escrow PDA
    msg!("manual cpi call for cNFT deposit");
    invoke_signed(
        &solana_program::instruction::Instruction {
            program_id: ctx.accounts.bubblegum_program.key(),
            accounts,
            data,
        },
        &account_infos[..],
        signer_seeds,
    )?;

    // Mint fractions to payer after cNFT transfer
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
        "Fractionalization complete. Fractions Mint: {}, Payer ATA: {}, Supply: {}",
        ctx.accounts.fractions_mint.key(),
        ctx.accounts.payer_fractions_ata.key(),
        args.fractions_supply
    );

    Ok(())
}

