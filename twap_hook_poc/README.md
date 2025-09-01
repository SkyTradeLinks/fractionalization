# TWAP Hook Proof of Concept

A Solana program implementing a decentralized TWAP (Time-Weighted Average Price) oracle using transfer hooks.

## Overview

This PoC demonstrates a secure TWAP calculation system that:
- **Prevents spam attacks** by controlling when the ring buffer updates
- **Uses multiple parameters** (time, volume, price significance) to determine updates
- **Maintains time-weighted accuracy** over 24-hour periods
- **Supports multiple DEX sources** (Jupiter, Raydium V4, Raydium CLMM, Orca)

## Architecture

### Core Components

1. **TwapConfig**: Central configuration with update control parameters
2. **TwapRingBuffer**: 24-hour ring buffer storing price data in hourly buckets
3. **Transfer Hook Processing**: Analyzes DEX instructions to extract trade data
4. **Security Controls**: Multi-parameter validation before ring buffer updates

### Update Control Parameters

The ring buffer only updates when **ALL** conditions are met:

- **Time Window**: Minimum 10 minutes between updates
- **Volume Threshold**: Minimum $500 accumulated volume
- **Price Significance**: Minimum 1% price change
- **Rate Limiting**: Maximum 6 updates per hour
- **Emergency Updates**: Allowed for 10%+ price movements

### Security Features

- **Anti-spam**: Prevents manipulation of time-weighted aspect
- **Volume validation**: Ensures meaningful market activity
- **Price significance**: Filters out noise from small trades
- **Rate limiting**: Prevents excessive updates

## Usage

### 1. Initialize Configuration

```typescript
await program.methods
  .initializeConfig()
  .accounts({
    config: configPda,
    authority: authority.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .signers([authority])
  .rpc();
```

### 2. Initialize Ring Buffer for Token Pair

```typescript
await program.methods
  .initializeRingBuffer()
  .accounts({
    ringBuffer: ringBufferPda,
    config: configPda,
    baseMint: solMint.publicKey,
    quoteMint: usdcMint.publicKey,
    authority: authority.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .signers([authority])
  .rpc();
```

### 3. Process Transfer Hook

```typescript
await program.methods
  .processTransferHook()
  .accounts({
    ringBuffer: ringBufferPda,
    config: configPda,
    baseMint: solMint.publicKey,
    quoteMint: usdcMint.publicKey,
  })
  .rpc();
```

### 4. Get TWAP Price

```typescript
await program.methods
  .getTwap()
  .accounts({
    ringBuffer: ringBufferPda,
    config: configPda,
  })
  .rpc();
```

## Testing

Run the test suite:

```bash
anchor test
```

The tests verify:
- Configuration initialization with default parameters
- Ring buffer creation for token pairs
- Transfer hook processing with update controls
- TWAP calculation from accumulated data

## Integration with Fractionalization

This TWAP hook can be integrated into cNFT fractionalization protocols:

```rust
// In your fractionalization program
struct FractionalVault {
    twap_hook_program: Pubkey,  // This TWAP hook program
    price_store: Pubkey,        // PDA for this asset's price data
}

// When someone wants to reclaim
fn reclaim_asset(ctx: Context<ReclaimAsset>) -> Result<()> {
    // Get current TWAP price from the hook
    let twap_price = get_twap_price(&ctx.accounts.price_store)?;
    
    // Calculate compensation for minority holders
    let compensation = calculate_minority_compensation(twap_price)?;
    
    // Proceed with reclaim...
}
```

## Development Status

This is a **Proof of Concept** demonstrating the core concepts. For production use, additional features would be needed:

- [ ] Real DEX instruction parsing (Jupiter, Raydium, Orca)
- [ ] Comprehensive error handling and edge cases
- [ ] Gas optimization and cost analysis
- [ ] Audit and security review
- [ ] Integration with actual transfer hook programs

