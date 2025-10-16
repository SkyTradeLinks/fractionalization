/**
 * Redemption page - View vault reclaim activity history
 */

'use client';

import { RedemptionHistory } from '@/components/fractionalization/redemption-history';

export default function RedemptionPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Activity History</h1>
        <p className="text-muted-foreground">
          Track your vault reclaim activity and history
        </p>
      </div>
      <RedemptionHistory />
    </div>
  );
}
