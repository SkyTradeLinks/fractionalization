/**
 * Vault-related type definitions for the fractionalization protocol
 */

import { PublicKey } from '@solana/web3.js';

/**
 * Status of a vault in the fractionalization protocol
 */
export enum VaultStatus {
  Active = 'active',
  Redeemable = 'redeemable',
  Closed = 'closed',
}

/**
 * NFT metadata structure
 */
export interface NFTMetadata {
  name: string;
  symbol: string;
  uri: string;
  image: string;
  description?: string;
  attributes?: Array<{
    trait_type: string;
    value: string;
  }>;
}

/**
 * Vault data structure representing a fractionalized NFT
 */
export interface Vault {
  id: string;
  publicKey: string;
  nftMint: string;
  nftMetadata: NFTMetadata;
  fractionalMint: string;
  totalSupply: number;
  circulatingSupply: number;
  status: VaultStatus;
  authority: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * User's position in a specific vault
 */
export interface UserVaultPosition {
  vaultId: string;
  fractionalTokenBalance: number;
  sharePercentage: number;
}

/**
 * Redemption request data
 */
export interface RedemptionRequest {
  id: string;
  vaultId: string;
  user: string;
  amount: number;
  timestamp: number;
  status: 'pending' | 'completed' | 'cancelled';
}
