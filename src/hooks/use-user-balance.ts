/**
 * Hook for fetching user's fractional token balance
 */

import { useQuery } from '@tanstack/react-query';

interface UserBalance {
  fractionalMint: string;
  balance: number;
  decimals: number;
}

/**
 * Fetch user's balance for a specific fractional token
 * TODO: Replace with actual on-chain call when program is deployed
 */
const fetchUserBalance = async (
  walletAddress?: string,
  fractionalMint?: string
): Promise<UserBalance | null> => {
  if (!walletAddress || !fractionalMint) return null;

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Mock balance data
  return {
    fractionalMint,
    balance: Math.floor(Math.random() * 100000),
    decimals: 6,
  };
};

/**
 * Hook to fetch user's fractional token balance
 */
export const useUserBalance = (walletAddress?: string, fractionalMint?: string) => {
  return useQuery({
    queryKey: ['userBalance', walletAddress, fractionalMint],
    queryFn: () => fetchUserBalance(walletAddress, fractionalMint),
    enabled: !!walletAddress && !!fractionalMint,
    staleTime: 10000, // 10 seconds
  });
};
