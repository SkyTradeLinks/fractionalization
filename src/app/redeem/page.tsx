/**
 * Redeem page - Redeem fractional tokens for USDC (starts from vault when NFT reclaimed)
 */

'use client'

import dynamic from 'next/dynamic'
import React from 'react'

const RedeemPageClient = dynamic(() => import('@/components/fractionalization/redeem-page-client'), { ssr: false })

export default function RedeemPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Redeem Tokens</h1>
        <p className="text-muted-foreground">
          Redeem your fractional tokens for USDC (available after NFT reclaimed)
        </p>
      </div>
      <RedeemPageClient />
    </div>
  )
}
