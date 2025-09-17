use anchor_lang::{prelude::*, solana_program::program::invoke};
use anchor_spl::{
    token_2022::{mint_to, MintTo},
    token_interface::Mint,
};

use mpl_bubblegum::{
    instructions::{TransferCpi, TransferCpiAccounts},
    utils::get_asset_id,
};

use mpl_token_metadata::instructions::{CreateV1Cpi, CreateV1CpiAccounts};
use spl_associated_token_account::instruction::create_associated_token_account;

use crate::{
    constants::FRACTIONS_PREFIX, AnchorMetadataArgs, AnchorTransferInstructionArgs, CustomError,
    FractionalizationData, MplBubblegumProgramAccount, MplMetadataProgramAccount,
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
        init,
        payer = payer,
        mint::decimals = 6,
        mint::authority = fractions,
        mint::token_program = token_program
    )]
    fraction_token: Box<InterfaceAccount<'info, Mint>>,

    // #[account(
    //     associated_token::mint = fraction_token,
    //     associated_token::authority = payer,
    //     associated_token::token_program = token_program
    // )]
    /// CHECK: payer fractionalization ata
    #[account(mut)]
    payer_fractionalization_ata: AccountInfo<'info>,

    /// CHECK: fraction_metadata account
    #[account(
        mut,
        seeds = [b"metadata", mpl_metadata_program.key().as_ref(), fraction_token.key().as_ref()],
        seeds::program = mpl_metadata_program.key(),
        bump,
    )]
    fraction_metadata: UncheckedAccount<'info>,

    /// CHECK: Read for the Transfer ix, and later checked in the cpi
    tree_config: UncheckedAccount<'info>,
    /// CHECK: Read for the Transfer ix, and later checked in the cpi
    leaf_delegate: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: merkle_tree
    merkle_tree: AccountInfo<'info>,

    // Programs
    bubblegum_program: Program<'info, MplBubblegumProgramAccount>,
    mpl_metadata_program: Program<'info, MplMetadataProgramAccount>,
    /// CHECK: Compression program
    compression_program: AccountInfo<'info>,
    /// CHECK: NOOP program
    log_wrapper: AccountInfo<'info>,
    /// CHECK: Token 2022
    token_program: AccountInfo<'info>,
    /// CHECK: system program
    system_program: AccountInfo<'info>,
    /// CHECK: Associated token program
    associated_token_program: AccountInfo<'info>,

    /// CHECK: SYSTEM INSTRUCIONT
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    system_instruction: AccountInfo<'info>,
}

impl<'info> FractionalizeAccounts<'info> {
    /// Validates the ctx.remaining_accounts length, the validity of the metadata provided by the user and asset_id sent
    /// # Arguments
    ///
    /// * `proof_account_len` - The length of ctx.remaining_accounts.
    /// * `metadata_args` - cNFT metadata_args.
    /// * `root` - root hash of the cNFT
    /// * `index` - index of the cNFT.
    /// * `nonce` - nonce of the cNFT
    fn validate(
        &self,
        proof_account_len: usize,
        transfer_args: AnchorTransferInstructionArgs,
    ) -> Result<()> {
        require!(proof_account_len > 0, CustomError::InvalidProofAccLen);

        let expected_asset_id = get_asset_id(&self.merkle_tree.key(), transfer_args.nonce);

        require!(
            self.asset_id.key() == expected_asset_id,
            CustomError::InvalidAsset
        );

        msg!("validation passsed");

        Ok(())
    }

    /// Creates the token-metadata_account, and then creates the user ata(Since metadata cpi is incompatible with initializing the ata and making the mint at ths same time)
    /// then mints tokens equal to fractions_supply from instruction
    /// # Arguments
    ///
    /// * `metadata_args` - args.metadata_args provided in the instruction data.
    /// * `asset_id` - asset_id calculated using merkle_tree and the nonce
    /// * `fraction_bump` - fractions pda bump
    /// * `fraction_supply` - fraction token supply
    fn mint_fractions(
        &mut self,
        metadata_args: AnchorMetadataArgs,
        fractions_supply: u64,
    ) -> Result<()> {
        let seeds = self.fractions.get_signer_seeds(); // [&[u8]; N]
        let signer_seeds: &[&[&[u8]]] = &[&seeds];

        CreateV1Cpi::new(
            &self.mpl_metadata_program.to_account_info(),
            CreateV1CpiAccounts {
                metadata: &self.fraction_metadata.to_account_info(),
                master_edition: None,
                mint: (&self.fraction_token.to_account_info(), false),
                authority: &self.fractions.to_account_info(),
                payer: &self.payer.to_account_info(),
                update_authority: (&self.fractions.to_account_info(), false),
                system_program: &self.system_program.to_account_info(),
                sysvar_instructions: &self.system_instruction.to_account_info(),
                spl_token_program: Some(&self.token_program.to_account_info()),
            },
            metadata_args.to_metadata_create_cpi_args(),
        )
        .invoke_signed(signer_seeds)?;

        self.fraction_token.reload()?;

        if self.payer_fractionalization_ata.data_is_empty() {
            msg!("Creating ATA using create_associated_token_account instruction");

            // Create the ATA instruction
            let create_ata_ix = create_associated_token_account(
                &self.payer.key(),
                &self.payer.key(),
                &self.fraction_token.key(),
                &self.token_program.key(),
            );

            // Invoke the instruction
            invoke(
                &create_ata_ix,
                &[
                    self.payer.to_account_info(),
                    self.payer_fractionalization_ata.to_account_info(),
                    self.payer.to_account_info(),
                    self.fraction_token.to_account_info(),
                    self.system_program.to_account_info(),
                    self.token_program.to_account_info(),
                    self.associated_token_program.to_account_info(),
                ],
            )?;
        }

        let mint_accounts = MintTo {
            authority: self.fractions.to_account_info(),
            mint: self.fraction_token.to_account_info(),
            to: self.payer_fractionalization_ata.to_account_info(),
        };

        let cpi_context = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            mint_accounts,
            signer_seeds,
        );

        mint_to(cpi_context, fractions_supply)
    }

    /// Initializes the fractions pda and send the cNFT to fractions
    /// # Arguments
    ///
    /// * `proof_accounts` - proof_accounts provided in ctx.remaining_accounts
    /// * `asset_id` - fractionalizeArgs to initializ the fractions pda
    /// * `fraction_bump` - fractions bump
    pub fn transfer_cnft_to_fractions_escrow(
        &mut self,
        proof_accounts: Vec<(&AccountInfo<'info>, bool, bool)>,
        fractionalize_args: &FractionalizeArgs,
        fractionalize_bump: u8,
    ) -> Result<()> {
        // Initialize the data inside the fraction pda
        let fractions = &mut self.fractions;

        let clock = Clock::get()?;
        fractions.init(
            self.asset_id.key(),
            self.fraction_token.key(),
            fractionalize_bump,
            clock.unix_timestamp,
        );
        let leaf_owner = (&self.payer.to_account_info(), true);
        let binding = &self.fractions.to_account_info();

        msg!("transfering cNFT to the PDA");
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
            fractionalize_args
                .transfer_cnft_args
                .into_transfer_instruction_args()
                .unwrap(),
        );
        transfer_cpi.invoke_with_remaining_accounts(&proof_accounts)?;
        msg!("transfed cNFT to the PDA");
        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct FractionalizeArgs {
    pub transfer_cnft_args: AnchorTransferInstructionArgs,
    pub metadata_args: AnchorMetadataArgs,
}

pub fn handle_fractionalize<'info>(
    ctx: Context<'_, '_, '_, 'info, FractionalizeAccounts<'info>>,
    args: FractionalizeArgs,
) -> Result<()> {
    ctx.accounts.validate(
        ctx.remaining_accounts.len(),
        args.transfer_cnft_args.clone(),
    )?;
    let mut proof_accounts: Vec<(&AccountInfo<'info>, bool, bool)> =
        Vec::with_capacity(ctx.remaining_accounts.len());

    for account in ctx.remaining_accounts {
        proof_accounts.push((account, account.is_writable, account.is_signer));
    }

    // Transfer the cNFT ownership to the fractions pda
    ctx.accounts
        .transfer_cnft_to_fractions_escrow(proof_accounts, &args, ctx.bumps.fractions)?;

    let fraction_supply = 1_000_000u64.checked_mul(10u64.pow(6)).unwrap();
    // Create the mpl-token-metadata and mint token == args.fractions_supply
    ctx.accounts
        .mint_fractions(args.metadata_args, fraction_supply)?;

    Ok(())
}
