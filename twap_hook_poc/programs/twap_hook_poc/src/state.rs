use anchor_lang::prelude::*;

/// Configuration for the TWAP hook
#[account]
pub struct TwapConfig {
    /// Authority that can update configuration
    pub authority: Pubkey,
    
    /// Update control parameters
    pub min_update_interval: u64,       
    pub max_updates_per_hour: u32,      
    pub min_volume_threshold: u64,     
    pub min_price_change_bps: u16,     
    
    /// Emergency update parameters
    pub emergency_update_threshold: u16, // emergency price change threshold
    pub max_emergency_updates_per_hour: u32,
    
    /// TWAP configuration
    pub twap_horizon_hours: u32,        // 24 hours
    pub bucket_count: u32,              // 24 buckets
    pub bucket_duration_slots: u64,     // slots per bucket
    
    /// Last update tracking
    pub last_update_slot: u64,
    pub updates_this_hour: u32,
    pub last_hour_slot: u64,
    
    /// Bump seed
    pub bump: u8,
}

/// Ring buffer storage for TWAP calculation
#[account]
pub struct TwapRingBuffer {
    /// Configuration account
    pub config: Pubkey,
    
    /// Base mint 
    pub base_mint: Pubkey,
    /// Quote mint 
    pub quote_mint: Pubkey,
    
    /// Current bucket index
    pub current_bucket_index: u32,
    
    /// Number of buckets in the ring buffer
    pub bucket_count: u32,
    
    /// Accumulated volume since last update
    pub volume_accumulator: u64,
    /// Last update price
    pub last_update_price: u128,
    
    /// Bump seed
    pub bump: u8,
}

impl TwapConfig {
    /// Check if enough time has passed since last update
    pub fn can_update_by_time(&self, current_slot: u64) -> bool {
        current_slot - self.last_update_slot >= self.min_update_interval
    }
    
    /// Check if volume threshold is met
    pub fn can_update_by_volume(&self, accumulated_volume: u64) -> bool {
        accumulated_volume >= self.min_volume_threshold
    }
    
    /// Check if price change is significant
    pub fn can_update_by_price(&self, current_price: u128, last_price: u128) -> bool {
        let price_change_bps = if last_price > 0 {
            ((current_price as i128 - last_price as i128).abs() * 10000 / last_price as i128) as u16
        } else {
            0
        };
        price_change_bps >= self.min_price_change_bps
    }
    
    /// Check if emergency update is needed
    pub fn needs_emergency_update(&self, current_price: u128, last_price: u128) -> bool {
        let price_change_bps = if last_price > 0 {
            ((current_price as i128 - last_price as i128).abs() * 10000 / last_price as i128) as u16
        } else {
            0
        };
        price_change_bps >= self.emergency_update_threshold
    }
    
    /// Check rate limiting
    pub fn can_update_by_rate(&self, current_slot: u64) -> bool {
        // Reset hourly counter if new hour
        if current_slot - self.last_hour_slot >= 3600 {
            return true;
        }
        self.updates_this_hour < self.max_updates_per_hour
    }
}

impl TwapRingBuffer {
    /// Get current bucket index
    pub fn get_current_bucket_index(&self) -> u32 {
        self.current_bucket_index
    }
    
    /// Move to next bucket
    pub fn advance_bucket(&mut self) {
        self.current_bucket_index = (self.current_bucket_index + 1) % self.bucket_count;
    }
    
    /// Calculate simple TWAP (simplified for PoC)
    pub fn calculate_twap(&self) -> Option<u128> {
        if self.last_update_price > 0 {
            Some(self.last_update_price)
        } else {
            None
        }
    }
}
