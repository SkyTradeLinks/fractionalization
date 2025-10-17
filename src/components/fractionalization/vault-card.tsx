/**
 * Vault card component for displaying vault information in grid/list
 */

"use client";

import React from 'react'
import { Vault, VaultStatus } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/components/solana/solana-provider';
import { useUserBalance } from '@/hooks/use-user-balance';

interface VaultCardProps {
  vault: Vault;
}

const statusColors: Record<VaultStatus, string> = {
  [VaultStatus.Active]: 'bg-green-500/10 text-green-500 hover:bg-green-500/20',
  [VaultStatus.Redeemable]: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20',
  [VaultStatus.Closed]: 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20',
};

export function VaultCard({ vault }: VaultCardProps) {
  const circulationPercentage = (vault.circulatingSupply / vault.totalSupply) * 100;

  // User position (reads mock data)
  const { account } = useWallet();
  const { data: balance } = useUserBalance(account?.address, vault.fractionalMint);
  const userShare = balance && vault.totalSupply ? balance.balance / vault.totalSupply : 0;
  const userSharePct = (userShare * 100) || 0;

  const router = useRouter();

  const onCardClick = () => {
    router.push(`/vault/${vault.id}`);
  };

  return (
    <div onClick={onCardClick} className="h-full">
      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full">
        <CardHeader className="p-0">
          <div className="relative aspect-square w-full overflow-hidden bg-muted">
            <Image
              src={vault.nftMetadata.image}
              alt={vault.nftMetadata.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-lg truncate flex-1">
              {vault.nftMetadata.name}
            </h3>
            <Badge className={statusColors[vault.status]} variant="secondary">
              {vault.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {vault.nftMetadata.symbol}
          </p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Supply</span>
              <span className="font-medium">{vault.totalSupply.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Circulating</span>
              <span className="font-medium">{vault.circulatingSupply.toLocaleString()}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary h-full transition-all"
                style={{ width: `${circulationPercentage}%` }}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0 text-xs text-muted-foreground">
            <div className="w-full flex items-center justify-between gap-4">
            <div className="text-xs">
              <div>Created {new Date(vault.createdAt).toLocaleDateString()}</div>
              {balance && account ? (
                <div className="mt-1 text-sm">
                  <div className="text-muted-foreground">You</div>
                  <div className="font-medium">{balance.balance.toLocaleString()} tokens</div>
                    <div className="text-muted-foreground text-xs">{userSharePct.toFixed(2)}% of supply</div>

                    {/* Visible eligibility badge & short info (don't rely on hover) */}
                    <div className="mt-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${userShare >= 0.8 ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-800'}`}>
                        {userShare >= 0.8 ? 'Eligible to Reclaim' : 'Needs ≥80% to Reclaim'}
                      </span>
                      <div className="text-muted-foreground text-[11px] mt-1">
                        Reclaim will burn your fractional tokens and return the original NFT.
                      </div>
                    </div>
                </div>
              ) : (
                <div className="mt-1 text-sm text-muted-foreground">No position</div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Reclaim button - enabled only when user holds >= 80% */}
              <Link href={`/reclaim?vault=${vault.id}`} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                <Button
                  size="sm"
                  disabled={!(userShare >= 0.8)}
                  className="whitespace-nowrap"
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                >
                  Reclaim{!(userShare >= 0.8) ? ' (Need ≥80%)' : ''}
                </Button>
              </Link>

              {/* Redeem button - available when vault is Redeemable */}
              {vault.status === VaultStatus.Redeemable && (
                <Link href={`/redeem?vault=${vault.id}`} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                  <Button size="sm" variant="outline" className="whitespace-nowrap" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                    Redeem
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
