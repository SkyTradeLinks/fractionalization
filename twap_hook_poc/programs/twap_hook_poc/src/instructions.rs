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
    config.buyback_discount_bps = 500; // 5% discount from TWAP
    config.max_buyback_amount = 1_000_000_000; // $1000 max buyback
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
    ring_buffer.price_buckets = Vec::new();
    ring_buffer.total_volume = 0;
    ring_buffer.bump = ctx.bumps.ring_buffer;
    
    msg!("Ring buffer initialized for {} / {}", 
        ctx.accounts.base_mint.key(), 
        ctx.accounts.quote_mint.key());
    Ok(())
}

pub fn process_transfer_hook(ctx: Context<ProcessTransferHook>) -> Result<()> {
    let ring_buffer = &mut ctx.accounts.ring_buffer;
    let config = &ctx.accounts.config;
    let clock = Clock::get()?;
    
    // Read actual transaction data from the hook context
    // In a real implementation, this would come from the transfer hook data
    // For now, we'll simulate reading from the transaction context
    
    // Extract price and volume from the transaction
    // This would typically come from the transfer hook data or transaction logs
    let transfer_data = &ctx.accounts.transfer_data;
    let current_price = transfer_data.price;
    let current_volume = transfer_data.volume;
    
    msg!("Processing transfer: price={}, volume={}", current_price, current_volume);
    
    // Check if we should update the ring buffer
    if should_update_ring_buffer(ring_buffer, config, &clock, current_price, current_volume) {
        // Update the ring buffer with new data
        ring_buffer.update_current_bucket(current_price, current_volume, clock.slot);
        ring_buffer.volume_accumulator = 0; // Reset accumulator
        ring_buffer.last_update_price = current_price;
        
        // Move to next bucket if needed
        if clock.slot >= config.bucket_duration_slots {
            ring_buffer.advance_bucket();
        }
        
        // Update config tracking
        let config_account = &mut ctx.accounts.config;
        config_account.last_update_slot = clock.slot;
        config_account.updates_this_hour += 1;
        
        // Reset hourly counter if needed
        if clock.slot - config_account.last_hour_slot >= 3600 {
            config_account.updates_this_hour = 1;
            config_account.last_hour_slot = clock.slot;
        }
        
        msg!("Ring buffer updated with new price: {}", current_price);
    } else {
        // Just accumulate volume
        ring_buffer.volume_accumulator += current_volume;
        msg!("Volume accumulated: {}", ring_buffer.volume_accumulator);
    }
    
    Ok(())
}

pub fn update_twap(ctx: Context<UpdateTwap>) -> Result<()> {
    let ring_buffer = &ctx.accounts.ring_buffer;
    let config = &ctx.accounts.config;
    
    // Calculate TWAP
    if let Some(twap_price) = ring_buffer.calculate_twap() {
        let buyback_price = config.calculate_buyback_price(twap_price);
        
        msg!("TWAP calculated: {}", twap_price);
        msg!("Buyback price ({}% discount): {}", 
            config.buyback_discount_bps as f64 / 100.0, 
            buyback_price);
        
        // Calculate VWAP for recent buckets
        if let Some(vwap_4h) = ring_buffer.calculate_vwap(4) {
            msg!("4-hour VWAP: {}", vwap_4h);
        }
        
        // Get price statistics
        let (min_price, max_price, median_price) = ring_buffer.get_price_stats();
        if let (Some(min), Some(max), Some(median)) = (min_price, max_price, median_price) {
            msg!("Price range: {} - {} (median: {})", min, max, median);
        }
    } else {
        msg!("No TWAP available yet");
    }
    
    Ok(())
}

pub fn get_twap(ctx: Context<GetTwap>) -> Result<()> {
    let ring_buffer = &ctx.accounts.ring_buffer;
    let config = &ctx.accounts.config;
    
    // Get TWAP and related data
    if let Some(twap_price) = ring_buffer.calculate_twap() {
        let buyback_price = config.calculate_buyback_price(twap_price);
        
        msg!("Current TWAP: {}", twap_price);
        msg!("Buyback price: {}", buyback_price);
        msg!("Total volume: {}", ring_buffer.total_volume);
        msg!("Current bucket: {}", ring_buffer.current_bucket_index);
        
        // Show recent bucket data
        let recent_buckets = ring_buffer.price_buckets
            .iter()
            .enumerate()
            .filter(|(_, bucket)| bucket.volume > 0)
            .take(5)
            .collect::<Vec<_>>();
        
        for (idx, bucket) in recent_buckets {
            msg!("Bucket {}: price={}, volume={}", idx, bucket.price, bucket.volume);
        }
    } else {
        msg!("No TWAP available yet");
    }
    
    Ok(())
}

pub fn create_transfer_data(ctx: Context<CreateTransferData>, price: u128, volume: u64) -> Result<()> {
    let transfer_data = &mut ctx.accounts.transfer_data;
    let clock = Clock::get()?;
    
    transfer_data.price = price;
    transfer_data.volume = volume;
    transfer_data.timestamp = clock.slot;
    transfer_data.bump = ctx.bumps.transfer_data;
    
    msg!("Transfer data created: price={}, volume={}", price, volume);
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
        space = 8 + 32 + 8 + 4 + 8 + 2 + 2 + 4 + 4 + 8 + 4 + 8 + 2 + 8 + 8 + 4 + 8 + 1 + 100, 
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
        space = 8 + 32 + 32 + 32 + 4 + 4 + 8 + 16 + 1 + 4 + 8 + 1 + 100, 
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
    
    #[account(mut)]
    pub config: Account<'info, TwapConfig>,
    
    /// CHECK: This is just for validation
    pub base_mint: UncheckedAccount<'info>,
    /// CHECK: This is just for validation
    pub quote_mint: UncheckedAccount<'info>,
    
    /// Transfer data containing price and volume information
    pub transfer_data: Account<'info, TransferData>,
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

#[derive(Accounts)]
pub struct CreateTransferData<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 16 + 8 + 8 + 1 + 100,
        seeds = [b"transfer_data", authority.key().as_ref()],
        bump
    )]
    pub transfer_data: Account<'info, TransferData>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

/// Account to store transfer data for testing purposes
/// In a real implementation, this would come from the transfer hook context
#[account]
pub struct TransferData {
    pub price: u128,
    pub volume: u64,
    pub timestamp: u64,
    pub bump: u8,
}
