'use client'

import { useSearchParams } from 'next/navigation'
import { ReclaimInterface } from '@/components/fractionalization/reclaim-interface'
import React from 'react'

export default function ReclaimPageClient() {
  const searchParams = useSearchParams()
  const vaultId = searchParams?.get('vault') || undefined

  return <ReclaimInterface initialVaultId={vaultId} />
}
