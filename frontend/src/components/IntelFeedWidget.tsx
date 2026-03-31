'use client';

import { useRouter } from 'next/navigation';

const APPS = [
  { label: 'ENERGY INTELLIGENCE', href: 'https://wildcatter.com/login', active: true },
  { label: 'ENERGY EXCHANGE', href: '#', active: false },
  { label: 'ENERGY OPERATIONS', href: '#', active: false },
  { label: 'ENERGY RIGHTS', href: '#', active: false },
];

export default function WildcatterWidget() {
  const router = useRouter();

  const handleButtonClick = (app: typeof APPS[0]) => {
    if (app.active && app.href !== '#') {
      if (app.href.startsWith('/')) {
        router.push(app.href);
      } else {
        window.open(app.href, '_blank');
      }
    }
  };

  return (
    <div className="w-full flex flex-col bg-black h-full">
      {/* Header */}
      <div className="bg-gray-800 p-2 flex-shrink-0">
        <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>WILDCATTER</h3>
      </div>

      {/* Four Buttons in Single Column */}
      <div className="flex-1 p-3">
        <div className="grid grid-cols-1 grid-rows-4 gap-3 h-full">
          {APPS.map((app, i) => (
            <button
              key={i}
              onClick={() => handleButtonClick(app)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                app.active
                  ? 'bg-gray-900 border-gray-700 hover:border-[#DAA520] cursor-pointer hover:bg-gray-800'
                  : 'bg-gray-900/50 border-gray-800 cursor-default opacity-40'
              }`}
            >
              <img src="/w-icon.svg" alt="W" className="w-8 h-8 flex-shrink-0" />
              <div className="flex flex-col items-start min-w-0 flex-1">
                <span className={`text-xs font-light tracking-[0.2em] leading-tight text-left ${
                  app.active ? 'text-[#DAA520]' : 'text-gray-500'
                }`} style={{ fontStretch: 'condensed' }}>
                  {app.label}
                </span>
                {!app.active && (
                  <span className="text-xs text-gray-600 tracking-wider mt-1">COMING SOON</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}