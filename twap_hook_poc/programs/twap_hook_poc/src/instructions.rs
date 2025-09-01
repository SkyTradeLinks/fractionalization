use anchor_lang::prelude::*;
use crate::state::*;

pub fn initialize_config(ctx: Context<InitializeConfig>) -> Result<()> {
    let config = &mut ctx.accounts.config;
    
    // Set default values
    config.authority = ctx.accounts.authority.key();
    config.min_update_interval = 600; // 10 minutes (600 slots)
    config.max_updates_per_hour = 6;
    config.min_volume_threshold = 500_000_000; // $500 in lamports
    config.min_price_change_bps = 100; // 1%
    config.emergency_update_threshold = 1000; // 10%
    config.max_emergency_updates_per_hour = 2;
    config.twap_horizon_hours = 24;
    config.bucket_count = 24;
    config.bucket_duration_slots = 3600; // 1 hour
    config.last_update_slot = 0;
    config.updates_this_hour = 0;
    config.last_hour_slot = 0;
    config.bump = ctx.bumps.config;
    
    msg!("TWAP config initialized with secure parameters");
    Ok(())
}

pub fn initialize_ring_buffer(ctx: Context<InitializeRingBuffer>) -> Result<()> {
    let ring_buffer = &mut ctx.accounts.ring_buffer;
    
    ring_buffer.config = ctx.accounts.config.key();
    ring_buffer.base_mint = ctx.accounts.base_mint.key();
    ring_buffer.quote_mint = ctx.accounts.quote_mint.key();
    ring_buffer.current_bucket_index = 0;
    ring_buffer.bucket_count = 24;
    ring_buffer.volume_accumulator = 0;
    ring_buffer.last_update_price = 0;
    ring_buffer.bump = ctx.bumps.ring_buffer;
    
    msg!("Ring buffer initialized for {} / {}", 
        ctx.accounts.base_mint.key(), 
        ctx.accounts.quote_mint.key());
    Ok(())
}

pub fn process_transfer_hook(ctx: Context<ProcessTransferHook>) -> Result<()> {
    let ring_buffer = &mut ctx.accounts.ring_buffer;
    let _config = &ctx.accounts.config;
    let clock = Clock::get()?;
    
    // Simulate trade data (in real implementation,
    let simulated_price = 50_000_000; 
    let simulated_volume = 1_000_000; 
    
    // Check if we should update the ring buffer
    if should_update_ring_buffer(ring_buffer, _config, &clock, simulated_price, simulated_volume) {
        // Update the ring buffer
        ring_buffer.volume_accumulator = 0; // Reset accumulator
        ring_buffer.last_update_price = simulated_price;
        
        // Move to next bucket if needed
        if clock.slot >= _config.bucket_duration_slots {
            ring_buffer.advance_bucket();
        }
        
        msg!("Ring buffer updated with new price: {}", simulated_price);
    } else {
        // Just accumulate volume
        ring_buffer.volume_accumulator += simulated_volume;
        msg!("Volume accumulated: {}", ring_buffer.volume_accumulator);
    }
    
    Ok(())
}

pub fn update_twap(ctx: Context<UpdateTwap>) -> Result<()> {
    let ring_buffer = &mut ctx.accounts.ring_buffer;
    let _config = &ctx.accounts.config;
    
    // Calculate TWAP (simplified for PoC)
    if let Some(twap_price) = ring_buffer.calculate_twap() {
        msg!("TWAP calculated: {}", twap_price);
    } else {
        msg!("No TWAP available yet");
    }
    
    Ok(())
}

pub fn get_twap(ctx: Context<GetTwap>) -> Result<()> {
    let ring_buffer = &ctx.accounts.ring_buffer;
    
    // Get TWAP (simplified for PoC)
    if let Some(twap_price) = ring_buffer.calculate_twap() {
        msg!("Current TWAP: {}", twap_price);
    } else {
        msg!("No TWAP available yet");
    }
    
    Ok(())
}

/// Helper function to determine if ring buffer should be updated
fn should_update_ring_buffer(
    ring_buffer: &TwapRingBuffer,
    config: &TwapConfig,
    clock: &Clock,
    current_price: u128,
    current_volume: u64,
) -> bool {
    // Check time-based update
    if !config.can_update_by_time(clock.slot) {
        return false;
    }
    
    // Check volume threshold
    let total_volume = ring_buffer.volume_accumulator + current_volume;
    if !config.can_update_by_volume(total_volume) {
        return false;
    }
    
    // Check price significance
    if !config.can_update_by_price(current_price, ring_buffer.last_update_price) {
        return false;
    }
    
    // Check rate limiting
    if !config.can_update_by_rate(clock.slot) {
        return false;
    }
    
    true
}

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 8 + 4 + 8 + 2 + 2 + 4 + 4 + 8 + 4 + 8 + 1 + 100, 
        seeds = [b"twap_config"],
        bump
    )]
    pub config: Account<'info, TwapConfig>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeRingBuffer<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 32 + 4 + 4 + 8 + 16 + 1 + 100, 
        seeds = [b"twap_ring_buffer", base_mint.key().as_ref(), quote_mint.key().as_ref()],
        bump
    )]
    pub ring_buffer: Account<'info, TwapRingBuffer>,
    
    pub config: Account<'info, TwapConfig>,
    
    /// CHECK: This is just for the seed derivation
    pub base_mint: UncheckedAccount<'info>,
    /// CHECK: This is just for the seed derivation
    pub quote_mint: UncheckedAccount<'info>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ProcessTransferHook<'info> {
    #[account(mut)]
    pub ring_buffer: Account<'info, TwapRingBuffer>,
    
    pub config: Account<'info, TwapConfig>,
    
    /// CHECK: This is just for validation
    pub base_mint: UncheckedAccount<'info>,
    /// CHECK: This is just for validation
    pub quote_mint: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct UpdateTwap<'info> {
    pub ring_buffer: Account<'info, TwapRingBuffer>,
    pub config: Account<'info, TwapConfig>,
}

#[derive(Accounts)]
pub struct GetTwap<'info> {
    pub ring_buffer: Account<'info, TwapRingBuffer>,
    pub config: Account<'info, TwapConfig>,
}
