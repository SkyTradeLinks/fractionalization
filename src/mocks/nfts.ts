/**
 * Mock NFT data for fractionalization workflow
 */

import { UserNFT } from '@/types';

export const mockUserNFTs: UserNFT[] = [
  {
    mint: 'userNft1Mint123',
    name: 'Mad Lads #123',
    symbol: 'MAD',
    image: 'https://picsum.photos/seed/usernft1/400/400',
    uri: 'https://arweave.net/user-nft-1',
  },
  {
    mint: 'userNft2Mint456',
    name: 'Tensorian #456',
    symbol: 'TNSR',
    image: 'https://picsum.photos/seed/usernft2/400/400',
    uri: 'https://arweave.net/user-nft-2',
  },
  {
    mint: 'userNft3Mint789',
    name: 'Claynosaurz #789',
    symbol: 'CLAY',
    image: 'https://picsum.photos/seed/usernft3/400/400',
    uri: 'https://arweave.net/user-nft-3',
  },
];
