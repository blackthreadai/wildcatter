'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SearchBar from '@/components/SearchBar';
import FilterPanel from '@/components/FilterPanel';
import api from '@/lib/api';
import { formatNumber, assetTypeColor } from '@/lib/utils';
import type { Asset, Operator, SearchFilters } from '@/lib/types';

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<'assets' | 'operators'>('assets');
  const [filters, setFilters] = useState<SearchFilters>({ query: searchParams.get('q') || '' });
  const [assets, setAssets] = useState<Asset[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (f: SearchFilters) => {
    setLoading(true);
    try {
      const res = await api.get('/search', { params: { q: f.query, state: f.state, basin: f.basin, type: f.assetType, status: f.status } });
      setAssets(res.data.assets || []);
      setOperators(res.data.operators || []);
    } catch { /* empty */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (filters.query) search(filters);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch(query: string) {
    const f = { ...filters, query };
    setFilters(f);
    if (query.length >= 2) search(f);
  }

  function handleFilterChange(f: SearchFilters) {
    setFilters(f);
    search(f);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-sm font-medium text-gray-400">FIND ASSETS AND OPERATORS</h2>

      <SearchBar onSearch={handleSearch} />
      <FilterPanel filters={filters} onChange={handleFilterChange} />

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-800 rounded-lg p-0.5 w-fit">
        <button
          onClick={() => setTab('assets')}
          className={`px-4 py-1.5 text-sm rounded-md transition-colors ${tab === 'assets' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
        >
          Assets ({assets.length})
        </button>
        <button
          onClick={() => setTab('operators')}
          className={`px-4 py-1.5 text-sm rounded-md transition-colors ${tab === 'operators' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
        >
          Operators ({operators.length})
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#DAA520]" />
        </div>
      )}

      {!loading && tab === 'assets' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assets.map((a) => (
            <div
              key={a.id}
              onClick={() => router.push(`/assets/${a.id}`)}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 cursor-pointer hover:border-gray-600 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-white">{a.name}</span>
                <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: assetTypeColor(a.type) + '20', color: assetTypeColor(a.type) }}>
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
          {assets.length === 0 && <p className="text-gray-500 col-span-full text-center py-8">No assets found</p>}
        </div>
      )}

      {!loading && tab === 'operators' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {operators.map((o) => (
            <div
              key={o.id}
              onClick={() => router.push(`/operators/${o.id}`)}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 cursor-pointer hover:border-gray-600 transition-colors"
            >
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
          {operators.length === 0 && <p className="text-gray-500 col-span-full text-center py-8">No operators found</p>}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#DAA520]" /></div>}>
      <SearchContent />
    </Suspense>
  );
}
