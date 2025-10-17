'use client'

import { useSearchParams } from 'next/navigation'
import { RedeemInterface } from '@/components/fractionalization/redeem-interface'
import React from 'react'

export default function RedeemPageClient() {
  const searchParams = useSearchParams()
  const vaultId = searchParams?.get('vault') || undefined

  return <RedeemInterface initialVaultId={vaultId} />
}
