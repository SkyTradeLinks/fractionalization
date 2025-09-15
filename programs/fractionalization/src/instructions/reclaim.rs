use crate::state::{Config, FractionalizationData};
use crate::validation::{ValidatableContext, ValidateAccounts};
use crate::AnchorTransferInstructionArgs;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, TokenAccount, Token};
use anchor_lang::solana_program::{program::invoke_signed, instruction::{AccountMeta, Instruction}};

#[derive(Accounts)]
#[instruction(args: ReclaimArgs)]
pub struct ReclaimAccounts<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub config: Account<'info, Config>,

    /// Fractionalization state
    #[account(mut)]
    pub fractions: Account<'info, FractionalizationData>,

    /// The mint for the fractions
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
    pub fn transfer_cnft_to_reclaimer(&self, root: [u8; 32], data_hash: [u8; 32], creator_hash: [u8; 32], nonce: u64, index: u32, leaf_owner_bump: u8, remaining_accounts: &[AccountInfo]) -> Result<()> {
        // Build Bubblegum transfer instruction (manual CPI) as seen in examples on solana docs
        const TRANSFER_DISCRIMINATOR: &[u8; 8] = &[163, 52, 200, 231, 140, 3, 69, 186];

        let mut accounts = vec![
            AccountMeta::new_readonly(self.tree_authority.key(), false),
            AccountMeta::new_readonly(self.leaf_owner.key(), true),
            AccountMeta::new_readonly(self.leaf_owner.key(), false),
            AccountMeta::new_readonly(self.new_leaf_owner.key(), false),
            AccountMeta::new(self.merkle_tree.key(), false),
            AccountMeta::new_readonly(self.log_wrapper.key(), false),
            AccountMeta::new_readonly(self.compression_program.key(), false),
            AccountMeta::new_readonly(self.system_program.key(), false),
        ];
        let mut data: Vec<u8> = vec![];
        data.extend(TRANSFER_DISCRIMINATOR);
        data.extend(root);
        data.extend(data_hash);
        data.extend(creator_hash);
        data.extend(nonce.to_le_bytes());
        data.extend(index.to_le_bytes());

        let mut account_infos = vec![
            self.tree_authority.clone(),
            self.leaf_owner.clone(),
            self.leaf_owner.clone(),
            self.new_leaf_owner.clone(),
            self.merkle_tree.clone(),
            self.log_wrapper.clone(),
            self.compression_program.clone(),
            self.system_program.to_account_info(),
        ];
        for acc in remaining_accounts.iter() {
            accounts.push(AccountMeta::new_readonly(acc.key(), false));
            account_infos.push(acc.clone());
        }
        invoke_signed(
            &Instruction {
                program_id: self.bubblegum_program.key(),
                accounts,
                data,
            },
            &account_infos,
            &[&[b"cNFT-vault", &[leaf_owner_bump]]],
        )?;
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
    let accounts = &ctx.accounts;
    let fractions_supply = accounts.fractions.fractions_supply;
    let user_balance = accounts.payer_fractions_ata.amount;
    // 80% of 1_000_000 = 800_000
    require!(fractions_supply == 1_000_000, CustomError::InvalidSupply);
    require!(user_balance > 800_000, CustomError::NotEnoughFractions);

    // Burn all user's fractions
    accounts.burn_fractions(user_balance)?;

    // Transfer cNFT to reclaimer using Bubblegum manual CPI
    // The following args must be provided by the caller or derived:
    // - root, data_hash, creator_hash, nonce, index, leaf_owner_bump
    // - ctx.remaining_accounts for merkle proof
    let root = args.transfer_instruction_args.root;
    let data_hash = args.transfer_instruction_args.data_hash;
    let creator_hash = args.transfer_instruction_args.creator_hash;
    let nonce = args.transfer_instruction_args.nonce;
    let index = args.transfer_instruction_args.index;
    let leaf_owner_bump = args.transfer_instruction_args.leaf_owner_bump;
    accounts.transfer_cnft_to_reclaimer(
        root,
        data_hash,
        creator_hash,
        nonce,
        index,
        leaf_owner_bump,
        ctx.remaining_accounts,
    )?;

    Ok(())
}

#[error_code]
pub enum CustomError {
    #[msg("Not enough fractions to reclaim asset")] 
    NotEnoughFractions,
    #[msg("Invalid total supply")] 
    InvalidSupply,
}
