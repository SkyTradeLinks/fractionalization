/**
 * Hook for redeeming fractional tokens
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface RedeemParams {
  vaultId: string;
  amount: number;
}

interface ReclaimParams {
  vaultId: string;
}

/**
 * Redeem fractional tokens for the underlying NFT
 * TODO: Replace with actual on-chain transaction when program is deployed
 */
const redeemTokens = async (params: RedeemParams): Promise<string> => {
  // Simulate transaction delay
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const signature = `mock_redeem_tx_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  console.log('Redeeming tokens:', params);
  return signature;
};

/**
 * Reclaim NFT from vault (for vault authority)
 * TODO: Replace with actual on-chain transaction when program is deployed
 */
const reclaimNFT = async (params: ReclaimParams): Promise<string> => {
  // Simulate transaction delay
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const signature = `mock_reclaim_tx_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  console.log('Reclaiming NFT:', params);
  return signature;
};

/**
 * Hook to redeem fractional tokens
 */
export const useRedeem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: redeemTokens,
    onSuccess: (signature) => {
      toast.success('Tokens redeemed successfully!', {
        description: `Transaction: ${signature.substring(0, 20)}...`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['vaults'] });
      queryClient.invalidateQueries({ queryKey: ['userBalance'] });
    },
    onError: (error: Error) => {
      toast.error('Failed to redeem tokens', {
        description: error.message,
      });
    },
  });
};

/**
 * Hook to reclaim NFT from vault
 */
export const useReclaim = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reclaimNFT,
    onSuccess: (signature) => {
      toast.success('NFT reclaimed successfully!', {
        description: `Transaction: ${signature.substring(0, 20)}...`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['vaults'] });
      queryClient.invalidateQueries({ queryKey: ['userNFTs'] });
    },
    onError: (error: Error) => {
      toast.error('Failed to reclaim NFT', {
        description: error.message,
      });
    },
  });
};
