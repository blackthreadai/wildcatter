'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const NAV = [
  { href: '/', label: 'DASHBOARD' },
  { href: '/assets', label: 'ASSETS' },
  { href: '/operators', label: 'OPERATORS' },
  { href: '/search', label: 'SEARCH' },
  { href: '/saved', label: 'SAVED' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="md:hidden fixed top-4 left-4 z-50 bg-gray-800 text-white p-2 rounded-lg"
        aria-label="Toggle menu"
      >
        {open ? '✕' : '☰'}
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed md:static z-40 top-0 left-0 h-screen w-64 bg-gray-900 border-r border-gray-800 flex flex-col transition-transform',
          !open && '-translate-x-full md:translate-x-0'
        )}
      >
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-xl font-bold text-[#DAA520] tracking-tight">
            ◈ WILDCATTER
          </h1>
          <p className="text-xs text-gray-500 mt-1">Energy Intelligence</p>
        </div>

        <nav className="flex-1 pt-2">
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'block px-6 py-3 text-sm font-semibold tracking-wider border-b border-gray-800 transition-colors',
                  active
                    ? 'text-[#DAA520] bg-[#DAA520]/5'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800">
          {user && (
            <div className="flex items-center justify-between">
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Profile
              </Link>
              <button
                onClick={logout}
                className="text-sm text-[#DAA520] hover:text-[#E6BE44] transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
