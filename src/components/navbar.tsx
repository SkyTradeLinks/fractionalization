/**
 * Main navigation bar component
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WalletDropdown } from '@/components/wallet-dropdown';

export function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { label: 'Explorer', path: '/' },
    { label: 'Fractionalize', path: '/fractionalize' },
    { label: 'Activity', path: '/redemption' },
  ];

  const isActive = (path: string) => {
    return path === '/' ? pathname === '/' : pathname.startsWith(path);
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold">NFT Fractionalization</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive(link.path)
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Wallet */}
          <div className="flex items-center space-x-4">
            <WalletDropdown />
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex space-x-4 pb-3">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              href={link.path}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                isActive(link.path)
                  ? 'text-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
