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

  // Mock balance data with different scenarios for testing 80% threshold
  // Vault 1 (frac1Mint): 90% of 1,000,000 = 900,000 (eligible to reclaim ✅)
  // Vault 2 (frac2Mint): 50% of 500,000 = 250,000 (not eligible ❌)
  // Vault 3 (frac3Mint): 85% of 2,000,000 = 1,700,000 (eligible to reclaim ✅)
  const mockBalances: Record<string, number> = {
    'frac1Mint123456789': 900000,   // 90% - Button ENABLED
    'frac2Mint123456789': 250000,   // 50% - Button DISABLED
    'frac3Mint123456789': 1700000,  // 85% - Button ENABLED
  };

  return {
    fractionalMint,
    balance: mockBalances[fractionalMint] || 50000, // Default 50k (5%)
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
