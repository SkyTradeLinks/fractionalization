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
    
    /// Buyback configuration
    pub buyback_discount_bps: u16,      // discount from TWAP for buyback (e.g., 500 = 5%)
    pub max_buyback_amount: u64,        // maximum amount that can be bought back
    
    /// Last update tracking
    pub last_update_slot: u64,
    pub updates_this_hour: u32,
    pub last_hour_slot: u64,
    
    /// Bump seed
    pub bump: u8,
}

/// Price and volume data for a time bucket
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct PriceBucket {
    pub price: u128,
    pub volume: u64,
    pub timestamp: u64,
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
    
    /// Price buckets for TWAP calculation
    pub price_buckets: Vec<PriceBucket>,
    
    /// Total volume across all buckets
    pub total_volume: u64,
    
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
    
    /// Calculate buyback price based on TWAP
    pub fn calculate_buyback_price(&self, twap_price: u128) -> u128 {
        let discount_multiplier = 10000 - self.buyback_discount_bps as u128;
        (twap_price * discount_multiplier) / 10000
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
        
        // Clear the new bucket
        if self.price_buckets.len() > self.current_bucket_index as usize {
            self.price_buckets[self.current_bucket_index as usize] = PriceBucket {
                price: 0,
                volume: 0,
                timestamp: 0,
            };
        }
    }
    
    /// Update current bucket with new price and volume
    pub fn update_current_bucket(&mut self, price: u128, volume: u64, timestamp: u64) {
        let bucket_index = self.current_bucket_index as usize;
        
        // Ensure we have enough buckets
        while self.price_buckets.len() <= bucket_index {
            self.price_buckets.push(PriceBucket {
                price: 0,
                volume: 0,
                timestamp: 0,
            });
        }
        
        // Update the current bucket
        self.price_buckets[bucket_index] = PriceBucket {
            price,
            volume,
            timestamp,
        };
        
        // Update total volume
        self.total_volume = self.price_buckets.iter().map(|b| b.volume).sum();
    }
    
    /// Calculate TWAP (Time-Weighted Average Price)
    pub fn calculate_twap(&self) -> Option<u128> {
        if self.price_buckets.is_empty() {
            return None;
        }
        
        let mut total_weighted_price = 0u128;
        let mut total_weight = 0u64;
        
        for bucket in &self.price_buckets {
            if bucket.volume > 0 && bucket.price > 0 {
                total_weighted_price += bucket.price * bucket.volume as u128;
                total_weight += bucket.volume;
            }
        }
        
        if total_weight > 0 {
            Some(total_weighted_price / total_weight as u128)
        } else {
            None
        }
    }
    
    /// Calculate VWAP (Volume-Weighted Average Price) for recent buckets
    pub fn calculate_vwap(&self, bucket_count: u32) -> Option<u128> {
        if self.price_buckets.is_empty() {
            return None;
        }
        
        let mut total_weighted_price = 0u128;
        let mut total_weight = 0u64;
        let mut buckets_processed = 0;
        
        // Start from current bucket and go backwards
        let mut index = self.current_bucket_index as i32;
        
        while buckets_processed < bucket_count && index >= 0 {
            let bucket_idx = index as usize;
            if bucket_idx < self.price_buckets.len() {
                let bucket = &self.price_buckets[bucket_idx];
                if bucket.volume > 0 && bucket.price > 0 {
                    total_weighted_price += bucket.price * bucket.volume as u128;
                    total_weight += bucket.volume;
                    buckets_processed += 1;
                }
            }
            index -= 1;
        }
        
        if total_weight > 0 {
            Some(total_weighted_price / total_weight as u128)
        } else {
            None
        }
    }
    
    /// Get price statistics
    pub fn get_price_stats(&self) -> (Option<u128>, Option<u128>, Option<u128>) {
        let mut prices: Vec<u128> = self.price_buckets
            .iter()
            .filter_map(|b| if b.price > 0 { Some(b.price) } else { None })
            .collect();
        
        if prices.is_empty() {
            return (None, None, None);
        }
        
        prices.sort();
        let min_price = prices.first().copied();
        let max_price = prices.last().copied();
        let median_price = if prices.len() % 2 == 0 {
            let mid = prices.len() / 2;
            Some((prices[mid - 1] + prices[mid]) / 2)
        } else {
            Some(prices[prices.len() / 2])
        };
        
        (min_price, max_price, median_price)
    }
}
