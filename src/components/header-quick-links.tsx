"use client"

import Link from 'next/link'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { LucideWallet, LucideAnchor, LucideCode, Droplets, BookOpen } from 'lucide-react'

export function HeaderQuickLinks() {
  const links = [
    { label: 'Explorer', href: '/explorer', icon: <LucideWallet className="w-4 h-4" /> },
    { label: 'Fractionalize', href: '/fractionalize', icon: <LucideAnchor className="w-4 h-4" /> },
    { label: 'Vault Details', href: '/vault/1', icon: <LucideCode className="w-4 h-4" /> },
    { label: 'Redeem', href: '/redeem', icon: <Droplets className="w-4 h-4" /> },
    { label: 'Redemption History', href: '/redemption', icon: <BookOpen className="w-4 h-4" /> },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="inline-flex">
          Quick Links
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="block no-underline">
            <DropdownMenuItem asChild>
              <a className="flex items-center gap-2 px-2 py-1">{l.icon}<span>{l.label}</span></a>
            </DropdownMenuItem>
          </Link>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
