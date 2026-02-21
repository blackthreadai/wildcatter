'use client';

import { useRouter } from 'next/navigation';

const APPS = [
  { label: 'ENERGY INTELLIGENCE', href: '/login', active: true },
  { label: 'ENERGY EXCHANGE', href: '#', active: false },
  { label: 'ENERGY OPERATIONS', href: '#', active: false },
  { label: 'ENERGY RIGHTS', href: '#', active: false },
];

export default function WelcomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 px-4 gap-12">
      {/* App Buttons - stacked, wide, matching sidebar style */}
      <div className="flex flex-col gap-3 w-full max-w-md">
        {APPS.map((app, i) => (
          <button
            key={i}
            onClick={() => app.active && router.push(app.href)}
            className={`flex items-center gap-4 px-5 py-4 rounded-xl border transition-all ${
              app.active
                ? 'bg-gray-900 border-gray-700 hover:border-[#DAA520] cursor-pointer hover:bg-gray-800'
                : 'bg-gray-900/50 border-gray-800 cursor-default opacity-40'
            }`}
          >
            <img src="/w-icon.svg" alt="W" className="w-10 h-10 flex-shrink-0" />
            <span className={`text-sm font-light tracking-[0.2em] leading-tight text-left whitespace-nowrap ${
              app.active ? 'text-[#DAA520]' : 'text-gray-500'
            }`} style={{ fontStretch: 'condensed' }}>
              {app.label}
            </span>
            {!app.active && (
              <span className="ml-auto text-xs text-gray-600 tracking-wider">COMING SOON</span>
            )}
          </button>
        ))}
      </div>

      <p className="text-xs text-white/60 mt-4">© 2026 Wildcatter, LLC. All Rights Reserved.</p>
    </div>
  );
}
