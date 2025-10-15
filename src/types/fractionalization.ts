/**
 * Fractionalization workflow type definitions
 */

/**
 * Step in the fractionalization process
 */
export enum FractionalizationStep {
  SelectNFT = 1,
  ConfigureTokens = 2,
}

/**
 * Form data for fractionalization
 */
export interface FractionalizationFormData {
  nftMint: string;
  tokenName: string;
  tokenSymbol: string;
  totalSupply: number;
}

/**
 * NFT owned by the user
 */
export interface UserNFT {
  mint: string;
  name: string;
  symbol: string;
  image: string;
  uri: string;
}
