/**
 * Reclaim interface component - Reclaim original NFT from vault
 */

'use client';

import { useState } from 'react';
import { useVaults, useReclaim, useUserBalance } from '@/hooks';
import { useWallet } from '@/components/solana/solana-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { VaultStatus } from '@/types';

const RECLAIM_THRESHOLD = 0.8; // 80% threshold

export function ReclaimInterface({ initialVaultId }: { initialVaultId?: string } = {}) {
  const { account } = useWallet();
  const { data: vaults, isLoading: vaultsLoading } = useVaults();
  const { mutate: reclaim, isPending } = useReclaim();
  const [selectedVaultId, setSelectedVaultId] = useState<string>(initialVaultId || '');

  const selectedVault = vaults?.find((v) => v.id === selectedVaultId);
  const { data: balance } = useUserBalance(
    account?.address,
    selectedVault?.fractionalMint
  );

  // Calculate if user can reclaim (holds >= 80% of total supply)
  const userSharePercentage = balance && selectedVault
    ? balance.balance / selectedVault.totalSupply
    : 0;
  const canReclaim = userSharePercentage >= RECLAIM_THRESHOLD;

  const handleReclaim = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedVaultId || !canReclaim) return;

    reclaim({
      vaultId: selectedVaultId,
    });
  };

  if (!account) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              Please connect your wallet to reclaim NFTs
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (vaultsLoading) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeVaults = vaults?.filter(
    (v) => v.status === VaultStatus.Active || v.status === VaultStatus.Redeemable
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Vault Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Vault</CardTitle>
        </CardHeader>
        <CardContent>
          {!activeVaults || activeVaults.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No vaults available
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {activeVaults.map((vault) => (
                <Card
                  key={vault.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedVaultId === vault.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedVaultId(vault.id)}
                >
                  <div className="p-4 space-y-3">
                    <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
                      <Image
                        src={vault.nftMetadata.image}
                        alt={vault.nftMetadata.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                      />
                    </div>
                    <div>
                      <h4 className="font-semibold truncate">{vault.nftMetadata.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {vault.nftMetadata.symbol}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reclaim Form */}
      {selectedVaultId && selectedVault && (
        <Card>
          <CardHeader>
            <CardTitle>Reclaim NFT</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleReclaim} className="space-y-6">
              {/* Vault Info */}
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-background">
                    <Image
                      src={selectedVault.nftMetadata.image}
                      alt={selectedVault.nftMetadata.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                  <div>
                    <h4 className="font-semibold">{selectedVault.nftMetadata.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedVault.nftMetadata.symbol}
                    </p>
                  </div>
                </div>
                {balance && (
                  <div className="pt-2 border-t space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Your Balance:</span>
                      <span className="font-medium">{balance.balance.toLocaleString()} tokens</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Supply:</span>
                      <span className="font-medium">
                        {selectedVault.totalSupply.toLocaleString()} tokens
                      </span>
                    </div>
                    <div className="flex justify-between text-sm pt-1 border-t">
                      <span className="text-muted-foreground">Your Share:</span>
                      <span className={`font-semibold ${canReclaim ? 'text-green-500' : 'text-red-500'}`}>
                        {(userSharePercentage * 100).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Threshold Warning/Info */}
              <div className={`rounded-lg p-4 border ${
                canReclaim 
                  ? 'bg-green-500/10 border-green-500/20' 
                  : 'bg-yellow-500/10 border-yellow-500/20'
              }`}>
                <div className="flex items-start gap-3">
                  <AlertCircle className={`h-5 w-5 mt-0.5 ${
                    canReclaim ? 'text-green-500' : 'text-yellow-500'
                  }`} />
                  <div className="flex-1">
                    <h4 className={`font-semibold text-sm mb-1 ${
                      canReclaim ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'
                    }`}>
                      {canReclaim ? 'Eligible to Reclaim' : 'Not Eligible Yet'}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {canReclaim 
                        ? 'You hold enough tokens (≥80%) to reclaim this NFT. This action will burn all your tokens and return the original NFT to your wallet.'
                        : `You need to hold at least 80% of the total supply to reclaim this NFT. You currently hold ${(userSharePercentage * 100).toFixed(2)}%.`
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Important Information */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h4 className="font-semibold text-sm mb-2 text-blue-600 dark:text-blue-400">
                  Important Information
                </h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• You must hold at least 80% of the total supply to reclaim</li>
                  <li>• Reclaiming will burn all your fractional tokens</li>
                  <li>• The original NFT will be returned to your wallet</li>
                  <li>• This action cannot be undone</li>
                  <li>• Transaction fees apply</li>
                </ul>
              </div>

              {/* Submit */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelectedVaultId('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!canReclaim || isPending}
                  className="flex-1"
                  size="lg"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Reclaiming...
                    </>
                  ) : (
                    'Reclaim NFT'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
