use anchor_lang::prelude::*;
use anchor_spl::{
    metadata::{create_metadata_accounts_v3, CreateMetadataAccountsV3, Metadata as Metaplex, mpl_token_metadata::types::DataV2},
    token::{mint_to, Mint, MintTo, Token, TokenAccount}
};

use crate::{
    FractionalizationData,
    constants::FRACTIONS_PREFIX
};


#[derive(Accounts)]
pub struct InitToken<'info> {

    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: TODO
    asset_id: AccountInfo<'info>,

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

    /// CHECK: New Metaplex Account being created
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,

    #[account(
        init,
        seeds = [b"fractions_mint", asset_id.key().as_ref()],
        bump,
        payer = payer,
        mint::decimals = 6,
        mint::authority = fractions,
        mint::token_program = token_program
    )]
    pub fractions_mint: Box<Account<'info, Mint>>,
    
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub token_metadata_program: Program<'info, Metaplex>,
}

pub fn handle_init_mint_metadata(ctx: Context<InitToken>, metadata: InitTokenParams) -> Result<()> {

    // Initialize the Fractions PDA data
    // let fractions = &mut ctx.accounts.fractions;
    let asset_id = ctx.accounts.asset_id.key();
    let bump = ctx.bumps.fractions;

    // let fractions_token_id = Pubkey::default();

    // fractions.init(&args, asset_id, fractions_token_id, bump);

    let seeds: [&[u8]; 3] = [
        FRACTIONS_PREFIX.as_bytes(),
        asset_id.as_ref(),
        &[bump],
    ];
    let signer_seeds: &[&[&[u8]]] = &[&seeds];

    let token_data: DataV2 = DataV2 {
        name: metadata.name,
        symbol: metadata.symbol,
        uri: metadata.uri,
        seller_fee_basis_points: 0,
        creators: None,
        collection: None,
        uses: None,
    };

    let metadata_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_metadata_program.to_account_info(),
        CreateMetadataAccountsV3 {
            payer: ctx.accounts.payer.to_account_info(),
            update_authority: ctx.accounts.fractions.to_account_info(),
            mint: ctx.accounts.fractions_mint.to_account_info(),
            metadata: ctx.accounts.metadata.to_account_info(),
            mint_authority: ctx.accounts.fractions.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            rent: ctx.accounts.rent.to_account_info(),
        },
        &signer_seeds,
    );

    create_metadata_accounts_v3(metadata_ctx, token_data, true, true, None)?;

    msg!("Token mint created successfully.");

    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct InitTokenParams {
    pub merkle_tree: Pubkey,
    pub asset_id: Pubkey,
    pub tree_root: Pubkey,
    pub name: String,
    pub symbol: String,
    pub uri: String,
}
