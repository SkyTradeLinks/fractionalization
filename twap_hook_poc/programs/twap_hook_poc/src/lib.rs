use anchor_lang::prelude::*;

declare_id!("3GjNrEjVhntxTM4A8ZNX9L4DYCj7qrJqEpGW76TVRSMK");

pub mod state;
pub mod instructions;

use instructions::*;

#[program]
pub mod twap_hook_poc {
    use super::*;

    pub fn initialize_config(ctx: Context<InitializeConfig>) -> Result<()> {
        instructions::initialize_config(ctx)
    }

    pub fn initialize_ring_buffer(ctx: Context<InitializeRingBuffer>) -> Result<()> {
        instructions::initialize_ring_buffer(ctx)
    }

    pub fn process_transfer_hook(ctx: Context<ProcessTransferHook>) -> Result<()> {
        instructions::process_transfer_hook(ctx)
    }

    pub fn update_twap(ctx: Context<UpdateTwap>) -> Result<()> {
        instructions::update_twap(ctx)
    }

    pub fn get_twap(ctx: Context<GetTwap>) -> Result<()> {
        instructions::get_twap(ctx)
    }
}

#[derive(Accounts)]
pub struct Initialize {}
