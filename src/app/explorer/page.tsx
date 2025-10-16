/**
 * Explorer page - Browse all fractionalized vaults
 */

'use client';

import { VaultExplorer } from '@/components/fractionalization/vault-explorer';

export default function ExplorerPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Vault Explorer</h1>
        <p className="text-muted-foreground">
          Browse and explore fractionalized NFT vaults
        </p>
      </div>
      <VaultExplorer />
    </div>
  );
}
