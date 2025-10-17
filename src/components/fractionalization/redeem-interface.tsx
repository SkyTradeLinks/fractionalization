/**
 * Redeem interface component - Redeem fractional tokens for NFT
 */

'use client';

import { useState } from 'react';
import { useVaults, useRedeem, useUserBalance } from '@/hooks';
import { useWallet } from '@/components/solana/solana-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import { VaultStatus } from '@/types';

export function RedeemInterface({ initialVaultId }: { initialVaultId?: string } = {}) {
  const { account } = useWallet();
  const { data: vaults, isLoading: vaultsLoading } = useVaults();
  const { mutate: redeem, isPending } = useRedeem();
  const [selectedVaultId, setSelectedVaultId] = useState<string>(initialVaultId || '');
  const [amount, setAmount] = useState<string>('');

  const selectedVault = vaults?.find((v) => v.id === selectedVaultId);
  const { data: balance } = useUserBalance(
    account?.address,
    selectedVault?.fractionalMint
  );

  const handleRedeem = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedVaultId || !amount) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    redeem({
      vaultId: selectedVaultId,
      amount: numAmount,
    });
  };

  if (!account) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              Please connect your wallet to redeem tokens
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

  const redeemableVaults = vaults?.filter(
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
          {!redeemableVaults || redeemableVaults.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No vaults available for redemption
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {redeemableVaults.map((vault) => (
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

      {/* Redemption Form */}
      {selectedVaultId && selectedVault && (
        <Card>
          <CardHeader>
            <CardTitle>Redeem Tokens</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRedeem} className="space-y-6">
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
                  <div className="pt-2 border-t">
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
                  </div>
                )}
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="amount">Amount to Redeem</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="0"
                  step="1"
                  required
                  className="text-lg"
                />
                <p className="text-xs text-muted-foreground">
                  Redeem your fractional tokens for USDC after the original NFT was reclaimed by the majority holder.
                </p>
              </div>

              {/* Important Information */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h4 className="font-semibold text-sm mb-2 text-blue-600 dark:text-blue-400">
                  Important Information
                </h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Redeem is available only after the original NFT was reclaimed</li>
                  <li>• This action exchanges your fractional tokens for USDC compensation</li>
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
                    setAmount('');
                  }}
                  className="flex-1"
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    isPending ||
                    !amount ||
                    parseFloat(amount) <= 0 ||
                    (balance ? parseFloat(amount) > balance.balance : false)
                  }
                  className="flex-1"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Redeem Tokens'
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
