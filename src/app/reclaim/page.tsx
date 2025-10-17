/**
 * Reclaim page - Reclaim original NFT from vault
 */

'use client'

import dynamic from 'next/dynamic'
import React from 'react'

const ReclaimPageClient = dynamic(() => import('@/components/fractionalization/reclaim-page-client'), { ssr: false })

export default function ReclaimPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Reclaim NFT</h1>
        <p className="text-muted-foreground">
          Reclaim the original NFT from the vault (requires holding ≥80% of tokens)
        </p>
      </div>
      <ReclaimPageClient />
    </div>
  )
}
