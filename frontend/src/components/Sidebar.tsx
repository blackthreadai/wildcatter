'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const NAV = [
  { href: '/', label: 'DASHBOARD' },
  { href: '/saved', label: 'SAVED', indent: true },
  { href: '/search', label: 'EXPLORE' },
  { href: '/operators', label: 'OPERATORS' },
  { href: '/assets', label: 'INTERESTS' },
  { href: '/evaluate', label: 'EVALUATE' },
  { href: '/support', label: 'SUPPORT' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile floating header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
        <div className="flex items-center gap-2.5">
          <img src="/w-icon.svg" alt="W" className="w-8 h-8" />
          <span className="text-xs font-light text-[#DAA520] tracking-[0.18em] leading-tight" style={{ fontStretch: 'condensed' }}>
            ENERGY INTELLIGENCE
          </span>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="text-white p-1.5"
          aria-label="Toggle menu"
        >
          {open ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          )}
        </button>
      </div>

      {/* Overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar — slides from RIGHT on mobile */}
      <aside
        className={cn(
          'fixed z-40 top-0 h-screen w-72 bg-gray-900 border-gray-800 flex flex-col transition-transform duration-300 ease-in-out',
          // Desktop: static left sidebar
          'md:static md:w-64 md:translate-x-0 md:border-r',
          // Mobile: right-sliding panel
          open ? 'right-0 translate-x-0 border-l' : 'right-0 translate-x-full md:right-auto md:left-0'
        )}
      >
        {/* Mobile: close area at top (same height as floating header) */}
        <div className="md:hidden h-14 flex items-center justify-end px-4 border-b border-gray-800">
          <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Desktop: branding header */}
        <div className="hidden md:block p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <img src="/w-icon.svg" alt="W" className="w-9 h-9 flex-shrink-0" />
            <span className="text-sm font-light text-[#DAA520] tracking-[0.2em] leading-tight" style={{ fontStretch: 'condensed' }}>
              ENERGY<br />INTELLIGENCE
            </span>
          </div>
        </div>

        <nav className="flex-1 pt-2 overflow-y-auto">
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            const indent = (item as any).indent;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'block text-sm font-semibold tracking-wider border-b border-gray-800 transition-colors',
                  indent ? 'pl-10 pr-6 py-2 text-xs' : 'px-6 py-3',
                  active
                    ? 'text-[#DAA520] bg-[#DAA520]/5'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                )}
              >
                {indent && '↳ '}{item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800 flex-shrink-0 mb-12 md:mb-0">
          {user && (
            <div className="flex items-center justify-between">
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                PROFILE
              </Link>
              <button
                onClick={logout}
                className="text-sm text-[#DAA520] hover:text-[#E6BE44] transition-colors"
              >
                LOGOUT
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
