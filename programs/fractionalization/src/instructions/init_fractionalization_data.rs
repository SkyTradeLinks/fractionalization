use anchor_lang::prelude::*;
use anchor_spl::token_interface::Token2022;
use mpl_token_metadata::{
    instructions::{ CreateV1, CreateV1InstructionArgs },
    types::{ DataV2, TokenStandard },
};
use anchor_lang::solana_program::sysvar;
use crate::{constants::FRACTIONS_PREFIX, FractionalizationData};

#[derive(Accounts)]
#[instruction(args: InitFractionalizationDataArgs)]
pub struct InitFractionalizationDataAccounts<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: original asset identifier (cNFT asset id)
    pub asset_id: AccountInfo<'info>,

    #[account(
        init_if_needed,
        payer = payer,
        space = FractionalizationData::MAX_SIZE,
        seeds = [
            FRACTIONS_PREFIX.as_bytes(),
            asset_id.key().as_ref(),
        ],
        bump
    )]
    pub fractions: Box<Account<'info, FractionalizationData>>,

    #[account(
        init_if_needed,
        payer = payer,
        seeds = [b"fractions_mint", asset_id.key().as_ref()],
        bump,
        mint::decimals = 6,
        mint::authority = fractions,
        mint::token_program = token_program
    )]
    pub fractions_mint: Box<InterfaceAccount<'info, anchor_spl::token_interface::Mint>>,

    /// CHECK: Metadata PDA for fraction token (Metaplex)
    /// Derived as: ["metadata", token_metadata_program.key(), fractions_mint.key()]
    #[account(mut)]
    pub fractions_metadata: UncheckedAccount<'info>,

    /// CHECK: Token Metadata Program (Metaplex)
    #[account(address = mpl_token_metadata::ID)]
    pub token_metadata_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
    /// CHECK: Sysvar instructions account
    #[account(address = sysvar::instructions::ID)]
    pub sysvar_instructions: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token2022>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitFractionalizationDataArgs {
    pub merkle_tree: Pubkey,
    pub fractionalization_time: i64,
    pub asset_symbol: String,
}

pub fn handle_init_fractionalization_data<'info>(
    ctx: Context<'_, '_, '_, 'info, InitFractionalizationDataAccounts<'info>>,
    args: InitFractionalizationDataArgs,
) -> Result<()> {
    let asset_key = ctx.accounts.asset_id.key();
    let fractions_bump = ctx.bumps.fractions;

    // Initialize fraction state
    ctx.accounts
        .fractions
        .init_fraction(&args, asset_key, fractions_bump);

    // Build metadata content
    let data = DataV2 {
        name: format!("Fract {}", args.asset_symbol),
        symbol: format!("f{}", args.asset_symbol),
        uri: "".to_string(),
        seller_fee_basis_points: 0,
        creators: None,
        collection: None,
        uses: None,
    };

    // Create the metadata instruction
    let create_metadata_ix = CreateV1 {
        metadata: ctx.accounts.fractions_metadata.key(),
        master_edition: None,
        mint: (ctx.accounts.fractions_mint.key(), false),
        authority: ctx.accounts.fractions.key(),
        payer: ctx.accounts.payer.key(),
        update_authority: (ctx.accounts.fractions.key(), true),
        system_program: ctx.accounts.system_program.key(),
        sysvar_instructions: sysvar::instructions::ID,
        spl_token_program: Some(ctx.accounts.token_program.key()),
    }.instruction(CreateV1InstructionArgs {
        name: format!("Fract {}", args.asset_symbol),
        symbol: format!("f{}", args.asset_symbol),
        uri: "".to_string(),
        seller_fee_basis_points: 0,
        creators: None,
        primary_sale_happened: false,
        is_mutable: true,
        token_standard: TokenStandard::Fungible, // or NonFungible, as needed
        collection: None,
        uses: None,
        collection_details: None,
        rule_set: None,
        decimals: Some(6),
        print_supply: None,
    });

    // PDA signer seeds for the fractions account
    let asset_id_key = ctx.accounts.asset_id.key();
    let fractions_signer_seeds: &[&[&[u8]]] = &[&[
        FRACTIONS_PREFIX.as_bytes(),
        asset_id_key.as_ref(),
        &[fractions_bump],
    ]];

    // Execute the CPI call
    anchor_lang::solana_program::program::invoke_signed(
        &create_metadata_ix,
        &[
            ctx.accounts.token_metadata_program.to_account_info(),
            ctx.accounts.fractions_metadata.to_account_info(),
            ctx.accounts.fractions_mint.to_account_info(),
            ctx.accounts.fractions.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.fractions.to_account_info(), // update_authority
            ctx.accounts.sysvar_instructions.to_account_info(), 
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
        ],
        fractions_signer_seeds,
    )?;

    msg!("Fractionalization data initialized successfully for asset: {}", asset_key);
    msg!("Fractions mint: {}", ctx.accounts.fractions_mint.key());
    msg!("Fractions metadata: {}", ctx.accounts.fractions_metadata.key());

    Ok(())
}