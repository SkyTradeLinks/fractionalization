/**
 * Redemption history component - View past redemption requests
 */

'use client';

import { useState } from 'react';
import { useWallet } from '@/components/solana/solana-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ExternalLink } from 'lucide-react';
import { RedemptionRequest } from '@/types';

/**
 * Mock redemption history data
 * TODO: Replace with actual on-chain data when program is deployed
 */
const mockRedemptions: RedemptionRequest[] = [
  {
    id: '1',
    vaultId: '1',
    user: 'user1PublicKey123',
    amount: 1000000,
    timestamp: Date.now() - 86400000 * 2, // 2 days ago
    status: 'completed',
  },
  {
    id: '2',
    vaultId: '2',
    user: 'user1PublicKey123',
    amount: 500000,
    timestamp: Date.now() - 86400000 * 5, // 5 days ago
    status: 'pending',
  },
  {
    id: '3',
    vaultId: '3',
    user: 'user1PublicKey123',
    amount: 750000,
    timestamp: Date.now() - 86400000 * 10, // 10 days ago
    status: 'cancelled',
  },
];

const statusColors = {
  completed: 'bg-green-500/10 text-green-500',
  pending: 'bg-yellow-500/10 text-yellow-500',
  cancelled: 'bg-red-500/10 text-red-500',
};

export function RedemptionHistory() {
  const { account } = useWallet();
  const [redemptions] = useState<RedemptionRequest[]>(mockRedemptions);

  if (!account) {
    return (
      <Card className="max-w-6xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              Please connect your wallet to view redemption history
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your Redemption History</CardTitle>
        </CardHeader>
        <CardContent>
          {redemptions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No redemption history found</p>
            </div>
          ) : (
            <>
              {/* Mobile View */}
              <div className="block md:hidden space-y-4">
                {redemptions.map((redemption) => (
                  <Card key={redemption.id}>
                    <CardContent className="pt-6 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm text-muted-foreground">Vault ID</p>
                          <p className="font-medium font-mono">#{redemption.vaultId}</p>
                        </div>
                        <Badge className={statusColors[redemption.status]} variant="secondary">
                          {redemption.status}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Amount</p>
                        <p className="font-medium">{redemption.amount.toLocaleString()} tokens</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Date</p>
                        <p className="font-medium">
                          {new Date(redemption.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" className="w-full" asChild>
                        <a
                          href={`/vault/${redemption.vaultId}`}
                          className="flex items-center justify-center gap-2"
                        >
                          View Vault
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vault ID</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {redemptions.map((redemption) => (
                      <TableRow key={redemption.id}>
                        <TableCell className="font-mono">#{redemption.vaultId}</TableCell>
                        <TableCell className="font-medium">
                          {redemption.amount.toLocaleString()} tokens
                        </TableCell>
                        <TableCell>
                          {new Date(redemption.timestamp).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[redemption.status]} variant="secondary">
                            {redemption.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" asChild>
                            <a
                              href={`/vault/${redemption.vaultId}`}
                              className="flex items-center gap-2"
                            >
                              View Vault
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle>Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Total Redemptions</p>
              <p className="text-2xl font-bold">{redemptions.length}</p>
            </div>
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Completed</p>
              <p className="text-2xl font-bold text-green-500">
                {redemptions.filter((r) => r.status === 'completed').length}
              </p>
            </div>
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Pending</p>
              <p className="text-2xl font-bold text-yellow-500">
                {redemptions.filter((r) => r.status === 'pending').length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
