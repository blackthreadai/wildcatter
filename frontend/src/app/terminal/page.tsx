'use client';

import { useState } from 'react';

export default function TerminalPage() {
  const [selectedRegion, setSelectedRegion] = useState('global');
  const [searchQuery, setSearchQuery] = useState('');

  const regions = [
    { value: 'global', label: 'Global' },
    { value: 'americas', label: 'Americas' },
    { value: 'europe', label: 'Europe' },
    { value: 'asia', label: 'Asia' },
    { value: 'oceania', label: 'Oceania' },
    { value: 'africa', label: 'Africa' },
  ];

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header Bar */}
      <header className="bg-black border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left Side - Logo + Version + Region Dropdown */}
          <div className="flex items-center gap-6">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img src="/w-icon.svg" alt="W" className="w-8 h-8" />
              <span className="text-white font-medium">Terminal</span>
            </div>

            {/* Version */}
            <span className="text-gray-400 text-sm">v1.01</span>

            {/* Region Dropdown */}
            <select 
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="bg-gray-900 text-white border border-gray-700 rounded px-3 py-1 text-sm focus:border-[#DAA520] focus:outline-none"
            >
              {regions.map(region => (
                <option key={region.value} value={region.value}>
                  {region.label}
                </option>
              ))}
            </select>
          </div>

          {/* Right Side - Search + Settings */}
          <div className="flex items-center gap-4">
            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-gray-900 text-white border border-gray-700 rounded px-3 py-1 pl-9 text-sm w-64 focus:border-[#DAA520] focus:outline-none"
              />
              <svg 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Settings Gear */}
            <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="p-6">
        <div className="text-white">
          <h1 className="text-2xl font-bold mb-4">Energy Terminal</h1>
          <p className="text-gray-400 mb-6">Desktop optimized energy data platform</p>
          
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-3">Region: {regions.find(r => r.value === selectedRegion)?.label}</h2>
            <p className="text-gray-400">Terminal interface launching soon...</p>
          </div>
        </div>
      </main>
    </div>
  );
}