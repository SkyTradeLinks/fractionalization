/**
 * Vault card component for displaying vault information in grid/list
 */

'use client';

import { Vault, VaultStatus } from '@/types';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';

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

  return (
    <Link href={`/vault/${vault.id}`}>
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
          Created {new Date(vault.createdAt).toLocaleDateString()}
        </CardFooter>
      </Card>
    </Link>
  );
}
