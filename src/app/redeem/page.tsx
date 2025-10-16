/**
 * Redeem page - Redeem fractional tokens for NFT
 */

'use client';

import { RedeemInterface } from '@/components/fractionalization/redeem-interface';

export default function RedeemPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Redeem NFT</h1>
        <p className="text-muted-foreground">
          Redeem your fractional tokens for the underlying NFT
        </p>
      </div>
      <RedeemInterface />
    </div>
  );
}
