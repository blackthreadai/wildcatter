'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSaved } from '@/hooks/useSaved';
import SaveButton from '@/components/SaveButton';
import { downloadCSV } from '@/lib/export';
import { formatNumber, assetTypeColor } from '@/lib/utils';

export default function SavedPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'assets' | 'operators'>('assets');
  const { savedAssets, savedOperators, isSaved, unsaveItem, loading } = useSaved();

  const toggleSave = (type: 'asset' | 'operator', id: string) => {
    unsaveItem(type, id);
  };

  function exportSaved() {
    if (tab === 'assets') {
      downloadCSV(savedAssets.slice(0, 100) as unknown as Record<string, unknown>[], 'saved-assets.csv');
    } else {
      downloadCSV(savedOperators.slice(0, 100) as unknown as Record<string, unknown>[], 'saved-operators.csv');
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-sm font-medium text-[#DAA520]">YOUR SAVED ASSETS AND OPERATORS</h2>

      <div className="flex items-center gap-3">
        <div className="flex gap-1 bg-gray-800 rounded-lg p-0.5 w-fit">
          <button
            onClick={() => setTab('assets')}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${tab === 'assets' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
          >
            Assets ({savedAssets.length})
          </button>
          <button
            onClick={() => setTab('operators')}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${tab === 'operators' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
          >
            Operators ({savedOperators.length})
          </button>
        </div>
        {(savedAssets.length > 0 || savedOperators.length > 0) && (
          <button
            onClick={exportSaved}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-gray-300 text-sm rounded-lg hover:bg-gray-700 transition-colors"
          >
            <span className="text-[#DAA520]">↓</span> Export CSV
          </button>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#DAA520]" />
        </div>
      )}

      {!loading && tab === 'assets' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedAssets.map((a) => (
            <div
              key={a.id}
              onClick={() => router.push(`/assets/${a.id}`)}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 cursor-pointer hover:border-gray-600 transition-colors relative"
            >
              <div className="absolute top-2 right-2">
                <SaveButton itemType="asset" itemId={a.id} isSaved={isSaved('asset', a.id)} onToggle={toggleSave} />
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-white">{a.name}</span>
                <span className="text-xs px-2 py-0.5 rounded mr-6" style={{ backgroundColor: assetTypeColor(a.type) + '20', color: assetTypeColor(a.type) }}>
                  {a.type.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-gray-500">{a.basin} · {a.county}, {a.state}</p>
              <div className="flex items-center justify-between mt-3 text-sm">
                {a.currentProduction != null && <span className="text-[#DAA520]">{formatNumber(a.currentProduction)} bbl/mo</span>}
                {a.declineRate != null && <span className="text-gray-500">Decline: {a.declineRate.toFixed(1)}%</span>}
              </div>
              <p className="text-xs text-gray-500 mt-1">{a.operatorName}</p>
            </div>
          ))}
          {savedAssets.length === 0 && <p className="text-gray-500 col-span-full text-center py-8">No saved assets yet. Browse and save assets from Search or Asset pages.</p>}
        </div>
      )}

      {!loading && tab === 'operators' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {savedOperators.map((o) => (
            <div
              key={o.id}
              onClick={() => router.push(`/operators/${o.id}`)}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 cursor-pointer hover:border-gray-600 transition-colors relative"
            >
              <div className="absolute top-2 right-2">
                <SaveButton itemType="operator" itemId={o.id} isSaved={isSaved('operator', o.id)} onToggle={toggleSave} />
              </div>
              <p className="font-medium text-white">{o.name}</p>
              <p className="text-xs text-gray-500 mt-1">{o.hqLocation}</p>
              <div className="flex items-center gap-4 mt-3 text-sm">
                <span>{o.activeAssets} assets</span>
                {o.totalProduction != null && <span className="text-[#DAA520]">{formatNumber(o.totalProduction)} bbl/mo</span>}
                <span className={o.riskScore <= 3 ? 'text-green-400' : o.riskScore <= 6 ? 'text-[#E6BE44]' : 'text-red-400'}>
                  Risk: {o.riskScore}/10
                </span>
              </div>
            </div>
          ))}
          {savedOperators.length === 0 && <p className="text-gray-500 col-span-full text-center py-8">No saved operators yet. Browse and save operators from Search or Operator pages.</p>}
        </div>
      )}
    </div>
  );
}
