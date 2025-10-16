/**
 * Vault explorer component - Browse and filter vaults
 */

'use client';

import { useState } from 'react';
import { useVaults } from '@/hooks';
import { VaultCard } from './vault-card';
import { VaultStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const filterOptions = [
  { label: 'All', value: undefined },
  { label: 'Active', value: VaultStatus.Active },
  { label: 'Redeemable', value: VaultStatus.Redeemable },
  { label: 'Closed', value: VaultStatus.Closed },
];

export function VaultExplorer() {
  const [statusFilter, setStatusFilter] = useState<VaultStatus | undefined>(undefined);
  const { data: vaults, isLoading, error } = useVaults();

  const filteredVaults = vaults?.filter((vault) =>
    statusFilter ? vault.status === statusFilter : true
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-destructive">Failed to load vaults</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {filterOptions.map((option) => (
          <Button
            key={option.label}
            variant={statusFilter === option.value ? 'default' : 'outline'}
            onClick={() => setStatusFilter(option.value)}
            size="sm"
          >
            {option.label}
          </Button>
        ))}
      </div>

      {/* Vault Grid */}
      {filteredVaults && filteredVaults.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVaults.map((vault) => (
            <VaultCard key={vault.id} vault={vault} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-muted-foreground">No vaults found</p>
        </div>
      )}
    </div>
  );
}
