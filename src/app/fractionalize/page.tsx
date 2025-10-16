/**
 * Fractionalization page - Fractionalize your NFTs
 */

'use client';

import { FractionalizationWorkflow } from '@/components/fractionalization/fractionalization-workflow';

export default function FractionalizePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Fractionalize NFT</h1>
        <p className="text-muted-foreground">
          Convert your NFT into fractional tokens
        </p>
      </div>
      <FractionalizationWorkflow />
    </div>
  );
}
