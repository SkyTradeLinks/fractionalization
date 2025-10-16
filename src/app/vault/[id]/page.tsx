/**
 * Vault details page - View individual vault information
 */

'use client';

import { use } from 'react';
import { VaultDetails } from '@/components/fractionalization/vault-details';

interface VaultPageProps {
  params: Promise<{ id: string }>;
}

export default function VaultPage({ params }: VaultPageProps) {
  const { id } = use(params);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <VaultDetails vaultId={id} />
    </div>
  );
}
