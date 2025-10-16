/**
 * Hook for fetching user's NFTs
 */

import { useQuery } from '@tanstack/react-query';
import { UserNFT } from '@/types';
import { mockUserNFTs } from '@/mocks';

/**
 * Fetch NFTs owned by the connected wallet
 * TODO: Replace with actual on-chain call when program is deployed
 */
const fetchUserNFTs = async (walletAddress?: string): Promise<UserNFT[]> => {
  if (!walletAddress) return [];
  
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 400));
  return mockUserNFTs;
};

/**
 * Hook to fetch user's NFTs
 */
export const useUserNFTs = (walletAddress?: string) => {
  return useQuery({
    queryKey: ['userNFTs', walletAddress],
    queryFn: () => fetchUserNFTs(walletAddress),
    enabled: !!walletAddress,
    staleTime: 60000, // 1 minute
  });
};
