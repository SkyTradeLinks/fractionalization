/**
 * Step 1: Select NFT for fractionalization
 */

'use client';

import { useUserNFTs } from '@/hooks';
import { useWallet } from '@/components/solana/solana-provider';
import { useFractionalizationStore } from '@/stores';
import { FractionalizationStep } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';

export function SelectNFTStep() {
  const { account } = useWallet();
  const { data: nfts, isLoading } = useUserNFTs(account?.address);
  const { formData, updateFormData, setStep } = useFractionalizationStore();

  const handleSelectNFT = (nftMint: string) => {
    updateFormData({ nftMint });
    setStep(FractionalizationStep.ConfigureTokens);
  };

  if (!account) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">
          Please connect your wallet to view your NFTs
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!nfts || nfts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No NFTs found in your wallet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground mb-4">
        Select an NFT from your wallet to fractionalize
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {nfts.map((nft) => (
          <Card
            key={nft.mint}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              formData.nftMint === nft.mint
                ? 'ring-2 ring-primary'
                : ''
            }`}
            onClick={() => handleSelectNFT(nft.mint)}
          >
            <div className="p-4 space-y-3">
              <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
                <Image
                  src={nft.image}
                  alt={nft.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                />
              </div>
              <div>
                <h4 className="font-semibold truncate">{nft.name}</h4>
                <p className="text-sm text-muted-foreground">{nft.symbol}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
