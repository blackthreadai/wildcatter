'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const NAV = [
  { href: '/', label: 'Dashboard', icon: '◈' },
  { href: '/assets', label: 'Assets', icon: '⛽' },
  { href: '/operators', label: 'Operators', icon: '🏢' },
  { href: '/search', label: 'Search', icon: '🔍' },
  { href: '/export', label: 'Export', icon: '📥' },
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

        <nav className="flex-1 p-4 space-y-1">
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-[#DAA520]/10 text-[#DAA520]'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                )}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800">
          {user && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400 truncate">{user.email}</span>
              <button
                onClick={logout}
                className="text-xs text-gray-500 hover:text-red-400 transition-colors"
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
