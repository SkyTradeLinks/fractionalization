/**
 * Vault details component - Display detailed vault information
 */

'use client';

import { useVaultDetails, useUserBalance } from '@/hooks';
import { useWallet } from '@/components/solana/solana-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { VaultStatus } from '@/types';

interface VaultDetailsProps {
  vaultId: string;
}

const statusColors: Record<VaultStatus, string> = {
  [VaultStatus.Active]: 'bg-green-500/10 text-green-500',
  [VaultStatus.Redeemable]: 'bg-blue-500/10 text-blue-500',
  [VaultStatus.Closed]: 'bg-gray-500/10 text-gray-500',
};

export function VaultDetails({ vaultId }: VaultDetailsProps) {
  const { account } = useWallet();
  const { data: vault, isLoading, error } = useVaultDetails(vaultId);
  const { data: balance } = useUserBalance(
    account?.address,
    vault?.fractionalMint
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !vault) {
    return (
      <div className="text-center py-20">
        <p className="text-destructive">Vault not found</p>
        <Link href="/explorer">
          <Button variant="link" className="mt-4">
            Back to Explorer
          </Button>
        </Link>
      </div>
    );
  }

  const circulationPercentage = (vault.circulatingSupply / vault.totalSupply) * 100;
  const userSharePercentage = balance
    ? (balance.balance / vault.totalSupply) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href="/explorer">
        <Button variant="ghost" size="sm">
          ← Back to Explorer
        </Button>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* NFT Image & Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{vault.nftMetadata.name}</CardTitle>
              <Badge className={statusColors[vault.status]} variant="secondary">
                {vault.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
              <Image
                src={vault.nftMetadata.image}
                alt={vault.nftMetadata.name}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            {vault.nftMetadata.description && (
              <p className="text-sm text-muted-foreground">
                {vault.nftMetadata.description}
              </p>
            )}
            {vault.nftMetadata.attributes && vault.nftMetadata.attributes.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Attributes</h4>
                <div className="grid grid-cols-2 gap-2">
                  {vault.nftMetadata.attributes.map((attr, idx) => (
                    <div
                      key={idx}
                      className="bg-muted rounded-lg p-2 text-sm"
                    >
                      <div className="text-muted-foreground text-xs">
                        {attr.trait_type}
                      </div>
                      <div className="font-medium">{attr.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vault Stats */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Vault Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Supply</span>
                  <span className="font-medium">{vault.totalSupply.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Circulating</span>
                  <span className="font-medium">{vault.circulatingSupply.toLocaleString()}</span>
                </div>
                <div>
                  <div className="flex justify-between mb-2 text-sm">
                    <span className="text-muted-foreground">Circulation</span>
                    <span className="font-medium">{circulationPercentage.toFixed(2)}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all"
                      style={{ width: `${circulationPercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Created</span>
                  <span>{new Date(vault.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span>{new Date(vault.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Position */}
          {account && balance && (
            <Card>
              <CardHeader>
                <CardTitle>Your Position</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Your Balance</span>
                    <span className="font-medium">{balance.balance.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Your Share</span>
                    <span className="font-medium">{userSharePercentage.toFixed(4)}%</span>
                  </div>
                </div>
                <div className="pt-4 space-y-2">
                  <Link href={`/reclaim?vault=${vault.id}`}>
                    <Button 
                      className="w-full" 
                      size="lg"
                      disabled={userSharePercentage < 80}
                    >
                      Reclaim NFT
                      {userSharePercentage < 80 && ' (Need ≥80%)'}
                    </Button>
                  </Link>

                  {/* Redeem CTA: appears only after original NFT has been reclaimed (Redeemable status) */}
                  {vault.status === VaultStatus.Redeemable && (
                    <Link href={`/redeem?vault=${vault.id}`}>
                      <Button className="w-full" size="lg" variant="outline">
                        Redeem for USDC
                      </Button>
                    </Link>
                  )}

                  <Link href="/redemption">
                    <Button className="w-full" size="lg" variant="ghost">
                      View Activity History
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-between" asChild>
                <a
                  href={vault.nftMetadata.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Metadata
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
