use crate::{
    constants::FRACTIONS_PREFIX, 
    errors::CustomError, 
    // state::Config, 
    AnchorTransferInstructionArgs, 
    FractionalizationData, 
    MplBubblegumProgramAccount,
    FractionStatus
};
use mpl_bubblegum::{instructions::{TransferCpi, TransferCpiAccounts, TransferInstructionArgs}, utils::get_asset_id};
use anchor_spl::{associated_token::AssociatedToken, token_interface::{burn, Burn, Token2022, TokenAccount}};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct ReclaimAccounts<'info> {
    #[account(mut)]
    payer: Signer<'info>,
    // config: Account<'info, Config>, // Commenting it off since it's not required

    /// CHECK: fractionalization token mint
    #[account(
        owner = token_program.key(),
        address = fractions.fractions_token_id
    )]
    fractionalization_token: AccountInfo<'info>,

    /// CHECK: Asset ID
    #[account(
        address = fractions.asset_id
    )]
    asset_id: AccountInfo<'info>,

    #[account(
        mut,
        associated_token::mint = fractionalization_token,
        associated_token::authority = payer,
        associated_token::token_program = token_program
    )]
    payer_fractionalization_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        close = payer, 
        seeds = [
            FRACTIONS_PREFIX.as_bytes(),
            fractions.asset_id.as_ref(),
        ],
        bump,
    )]
    fractions: Box<Account<'info, FractionalizationData>>,

    /// CHECK: Leaf delegate will be checked inside the CPI
    leaf_delegate: AccountInfo<'info>,
    /// CHECK: merkle tree will be checked inside the CPI
    merkle_tree: AccountInfo<'info>,
    /// CHECK: tree config will be checked inside the CPI
    tree_config: AccountInfo<'info>,

    bubblegum_program: Program<'info, MplBubblegumProgramAccount>,
    /// CHECK: Compression program checked inside the transfer cpi
    compression_program: AccountInfo<'info>,
    /// CHECK: NOOP checked inside the transfer cpi
    log_wrapper: AccountInfo<'info>,
    system_program: Program<'info, System>,
    associated_token_program: Program<'info, AssociatedToken>,
    token_program: Program<'info, Token2022>,
}

impl<'info> ReclaimAccounts<'info> {
    fn validate(&self, proof_account_len: usize, nonce: u64) -> Result<()> {

        require!(proof_account_len > 0, CustomError::InvalidProofAccLen);
        require!(self.payer_fractionalization_ata.amount >= 800_000, CustomError::InvalidFractionsOwned);

        let active = match self.fractions.status {FractionStatus::Active => true, FractionStatus::Reclaimed => false};

        require!(active, CustomError::AlreadyReclaimed);

        let expected_asset_id = get_asset_id(&self.merkle_tree.key(), nonce);

        require!(
            self.asset_id.key() == expected_asset_id,
            CustomError::InvalidAsset
        );

        Ok(())
    }
    pub fn transfer_cnft_to_reclaimer(&self, proof_accounts: Vec<(&AccountInfo<'info>, bool, bool)>, transfer_cnft_args: TransferInstructionArgs) -> Result<()> {
        let leaf_owner = (&self.fractions.to_account_info(), true);
        let binding = &self.payer.to_account_info();
        let transfer_cpi = TransferCpi::new(
            &self.bubblegum_program,
            TransferCpiAccounts {
                tree_config: &self.tree_config,
                leaf_owner,
                leaf_delegate: (&self.leaf_delegate, self.leaf_delegate.is_writable),
                new_leaf_owner: binding,
                merkle_tree: &self.merkle_tree,
                log_wrapper: &self.log_wrapper,
                compression_program: &self.compression_program,
                system_program: &self.system_program,
            },
            transfer_cnft_args
        );
        transfer_cpi.invoke_with_remaining_accounts(&proof_accounts)?;

        Ok(())
    }

    /// Burns fractions token owned by the the payer
    pub fn burn_fractions(&self) -> Result<()> {
        let burn_ix_accounts = Burn {
            authority: self.payer.to_account_info(),
            mint: self.fractionalization_token.to_account_info(),
            from: self.payer_fractionalization_ata.to_account_info()
        };
        
        let seeds = self.fractions.get_signer_seeds();     // [&[u8]; N]
        let signer_seeds: &[&[&[u8]]] = &[&seeds];

        let context = CpiContext::new_with_signer(self.token_program.to_account_info(), burn_ix_accounts, signer_seeds);

        burn(context, self.payer_fractionalization_ata.amount)?;

        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ReclaimArgs {
    pub transfer_instruction_args: AnchorTransferInstructionArgs,
}


pub fn handle_reclaim<'info>(
    ctx: Context<'_, '_, '_, 'info, ReclaimAccounts<'info>>,
    args: ReclaimArgs,
) -> Result<()> {
    let handler = ctx.accounts;

    let mut proof_accounts: Vec<(&AccountInfo<'info>, bool, bool)> =
        Vec::with_capacity(ctx.remaining_accounts.len());

    for account in ctx.remaining_accounts {
        proof_accounts.push((account, account.is_writable, account.is_signer));
    }
    handler.validate(ctx.remaining_accounts.len(), args.transfer_instruction_args.nonce)?;
    handler.transfer_cnft_to_reclaimer(proof_accounts, args.transfer_instruction_args.into_transfer_instruction_args()?)?;
    handler.burn_fractions()?;

    Ok(())
}
