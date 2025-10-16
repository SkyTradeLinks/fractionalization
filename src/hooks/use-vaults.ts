/**
 * Hook for fetching and managing vault data
 */

import { useQuery } from '@tanstack/react-query';
import { Vault, VaultStatus } from '@/types';
import { mockVaults } from '@/mocks';

/**
 * Fetch all vaults from the program
 * TODO: Replace with actual on-chain call when program is deployed
 */
const fetchVaults = async (): Promise<Vault[]> => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));
  return mockVaults;
};

/**
 * Hook to fetch all vaults
 */
export const useVaults = () => {
  return useQuery({
    queryKey: ['vaults'],
    queryFn: fetchVaults,
    staleTime: 30000, // 30 seconds
  });
};

/**
 * Hook to fetch vaults filtered by status
 */
export const useVaultsByStatus = (status?: VaultStatus) => {
  return useQuery({
    queryKey: ['vaults', status],
    queryFn: async () => {
      const vaults = await fetchVaults();
      return status ? vaults.filter((v) => v.status === status) : vaults;
    },
    staleTime: 30000,
  });
};
