/**
 * Mock vault data for development
 */

import { Vault, VaultStatus } from '@/types';

export const mockVaults: Vault[] = [
  {
    id: '1',
    publicKey: 'vault1PublicKey123456789',
    nftMint: 'nft1Mint123456789',
    nftMetadata: {
      name: 'Degen Ape #1234',
      symbol: 'DAPE',
      uri: 'https://arweave.net/mock-uri-1',
      image: 'https://picsum.photos/seed/nft1/400/400',
      description: 'A rare Degen Ape from the collection',
      attributes: [
        { trait_type: 'Background', value: 'Blue' },
        { trait_type: 'Fur', value: 'Golden' },
        { trait_type: 'Eyes', value: 'Laser' },
      ],
    },
    fractionalMint: 'frac1Mint123456789',
    totalSupply: 1000000,
    circulatingSupply: 750000,
    status: VaultStatus.Active,
    authority: 'authority1PublicKey123',
    createdAt: Date.now() - 86400000 * 7, // 7 days ago
    updatedAt: Date.now() - 86400000,
  },
  {
    id: '2',
    publicKey: 'vault2PublicKey123456789',
    nftMint: 'nft2Mint123456789',
    nftMetadata: {
      name: 'Okay Bear #5678',
      symbol: 'OBEAR',
      uri: 'https://arweave.net/mock-uri-2',
      image: 'https://picsum.photos/seed/nft2/400/400',
      description: 'An Okay Bear chilling on the blockchain',
      attributes: [
        { trait_type: 'Background', value: 'Purple' },
        { trait_type: 'Clothing', value: 'Hoodie' },
        { trait_type: 'Expression', value: 'Happy' },
      ],
    },
    fractionalMint: 'frac2Mint123456789',
    totalSupply: 500000,
    circulatingSupply: 500000,
    status: VaultStatus.Active,
    authority: 'authority2PublicKey123',
    createdAt: Date.now() - 86400000 * 14,
    updatedAt: Date.now() - 86400000 * 2,
  },
  {
    id: '3',
    publicKey: 'vault3PublicKey123456789',
    nftMint: 'nft3Mint123456789',
    nftMetadata: {
      name: 'SMB #9012',
      symbol: 'SMB',
      uri: 'https://arweave.net/mock-uri-3',
      image: 'https://picsum.photos/seed/nft3/400/400',
      description: 'Solana Monkey Business NFT',
      attributes: [
        { trait_type: 'Type', value: 'Gen2' },
        { trait_type: 'Hat', value: 'Crown' },
      ],
    },
    fractionalMint: 'frac3Mint123456789',
    totalSupply: 2000000,
    circulatingSupply: 1200000,
    status: VaultStatus.Redeemable,
    authority: 'authority3PublicKey123',
    createdAt: Date.now() - 86400000 * 30,
    updatedAt: Date.now() - 86400000 * 5,
  },
];

/**
 * Get a single vault by ID
 */
export const getMockVaultById = (id: string): Vault | undefined => {
  return mockVaults.find((vault) => vault.id === id);
};
