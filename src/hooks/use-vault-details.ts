/**
 * Hook for fetching individual vault details
 */

import { useQuery } from '@tanstack/react-query';
import { Vault } from '@/types';
import { getMockVaultById } from '@/mocks';

/**
 * Fetch a single vault by ID
 * TODO: Replace with actual on-chain call when program is deployed
 */
const fetchVaultById = async (id: string): Promise<Vault | null> => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300));
  const vault = getMockVaultById(id);
  return vault || null;
};

/**
 * Hook to fetch vault details by ID
 */
export const useVaultDetails = (id: string) => {
  return useQuery({
    queryKey: ['vault', id],
    queryFn: () => fetchVaultById(id),
    enabled: !!id,
    staleTime: 30000,
  });
};
