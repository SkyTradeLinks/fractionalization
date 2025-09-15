use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::Token,
    token_interface::{self, Mint, MintTo, TokenAccount, TokenInterface},
};

use mpl_bubblegum::instructions::{TransferCpi, TransferCpiAccounts, TransferInstructionArgs};

use crate::{
    constants::{NoopProgramAccount, SplAccountCompressionProgramAccount, FRACTIONS_PREFIX},
    AnchorTransferInstructionArgs, FractionalizationData, MplBubblegumProgramAccount,
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
    

    log_wrapper: Program<'info, NoopProgramAccount>, // This creates log to track cNFTs
    compression_program: Program<'info, SplAccountCompressionProgramAccount>,
    bubblegum_program: Program<'info, MplBubblegumProgramAccount>,

    #[account(
        init,
        payer = payer,
        mint::decimals = 6,
        mint::authority = fractions,
        mint::freeze_authority = fractions,
        seeds = [b"mintsdsd"],
        bump
    )]
    pub fractions_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = fractions_mint,
        associated_token::authority = payer,
        associated_token::token_program = token_program
    )]
    pub payer_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    token_program: Interface<'info, TokenInterface>,
    system_program: Program<'info, System>,
    associated_token_program: Program<'info, AssociatedToken>,
}


impl<'info> FractionalizeAccounts<'info> {

    fn mint_fractions(&self) -> CpiContext<'_, '_, '_, 'info, MintTo<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            MintTo {
                mint: self.fractions_mint.to_account_info(),
                to: self.payer_token_account.to_account_info(),
                authority: self.fractions.to_account_info(),
            },
        )
    }

    pub fn transfer_cnft_to_fractions_escrow(
        &self,
        args: TransferInstructionArgs,
        proof_accounts: Vec<(&AccountInfo<'info>, bool, bool)>,
    ) -> Result<()> {
        let binding = &self.fractions.to_account_info();
        let transfer_cpi = TransferCpi::new(
            &self.bubblegum_program,
            TransferCpiAccounts {
                tree_config: &self.tree_config,
                leaf_owner: (&self.payer, true),
                leaf_delegate: (&self.payer, true),
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
    pub transfer_cnft_args: AnchorTransferInstructionArgs,
    pub merkle_tree: Pubkey,
    pub fractions_supply: u64,
    pub fractionalization_time: i64,
}

pub fn handle_fractionalize<'info>(
    ctx: Context<'_, '_, '_, 'info, FractionalizeAccounts<'info>>,
    args: FractionalizeArgs,
) -> Result<()> {
    // Initialize the Fractions PDA data
    let fractions = &mut ctx.accounts.fractions;
    let asset_id = ctx.accounts.asset_id.key();
    let bump = ctx.bumps.fractions;

    // Placeholder fractions_token_id until mint is created/linked
    let fractions_token_id = Pubkey::default();

    fractions.init(&args, asset_id, fractions_token_id, bump);

    // Send the CNFT to the fractions escrow

    let transfer_args = TransferInstructionArgs {
        root: args.transfer_cnft_args.root,
        data_hash: args.transfer_cnft_args.data_hash,
        creator_hash: args.transfer_cnft_args.creator_hash,
        nonce: args.transfer_cnft_args.nonce,
        index: args.transfer_cnft_args.index,
    };

    let proof_accounts: Vec<(&AccountInfo, bool, bool)> = ctx
        .remaining_accounts
        .iter()
        .map(|account| (account, false, false))
        .collect();

    ctx.accounts
        .transfer_cnft_to_fractions_escrow(transfer_args, proof_accounts)?;

    // Mint Tokens to account

    token_interface::mint_to(
        ctx.accounts.mint_fractions(),
        args.fractions_supply, // number of fractions
    )?;

    Ok(())
}
