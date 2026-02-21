'use client';

import { useState, useCallback, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SearchBar from '@/components/SearchBar';
import FilterPanel from '@/components/FilterPanel';
import api from '@/lib/api';
import { formatNumber, assetTypeColor } from '@/lib/utils';
import { downloadCSV } from '@/lib/export';
import { useSaved } from '@/hooks/useSaved';
import SaveButton from '@/components/SaveButton';
import type { Asset, Operator, SearchFilters } from '@/lib/types';

const PAGE_SIZE = 50;

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<'assets' | 'operators'>('assets');
  const [filters, setFilters] = useState<SearchFilters>({ query: searchParams.get('q') || '' });
  const [assets, setAssets] = useState<Asset[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [assetTotal, setAssetTotal] = useState(0);
  const [operatorTotal, setOperatorTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const { isSaved, saveItem, unsaveItem } = useSaved();

  const toggleSave = (type: 'asset' | 'operator', id: string) => {
    if (isSaved(type, id)) unsaveItem(type, id);
    else saveItem(type, id);
  };

  function exportResults() {
    if (tab === 'assets') {
      downloadCSV(assets as unknown as Record<string, unknown>[], 'search-assets.csv');
    } else {
      downloadCSV(operators as unknown as Record<string, unknown>[], 'search-operators.csv');
    }
  }

  const searchRef = useRef<(f: SearchFilters, p: number) => Promise<void>>(null!);
  searchRef.current = async (f: SearchFilters, p: number) => {
    // Don't search if no query and no filters
    const hasFilters = f.query || f.state || f.basin || f.assetType || f.status;
    if (!hasFilters) return;

    setLoading(true);
    setHasSearched(true);
    try {
      const params: Record<string, string> = { page: String(p), limit: String(PAGE_SIZE) };
      if (f.query) params.q = f.query;
      if (f.state) params.state = f.state;
      if (f.basin) params.basin = f.basin;
      if (f.assetType) params.type = f.assetType;
      if (f.status) params.status = f.status;
      const res = await api.get('/search', { params });
      setAssets(res.data.assets || []);
      setOperators(res.data.operators || []);
      setAssetTotal(res.data.assetTotal || 0);
      setOperatorTotal(res.data.operatorTotal || 0);
    } catch { /* empty */ }
    setLoading(false);
  };

  const search = useCallback((f: SearchFilters, p: number) => searchRef.current?.(f, p), []);

  // Only auto-search on mount if there's a query param
  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      if (filters.query) {
        search(filters, 1);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = useCallback((query: string) => {
    setPage(1);
    setFilters(prev => {
      const f = { ...prev, query };
      search(f, 1);
      return f;
    });
  }, [search]);

  const handleFilterChange = useCallback((f: SearchFilters) => {
    setPage(1);
    setFilters(f);
    search(f, 1);
  }, [search]);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    search(filters, newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [search, filters]);

  const currentTotal = tab === 'assets' ? assetTotal : operatorTotal;
  const totalPages = Math.ceil(currentTotal / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <h2 className="text-sm font-medium text-[#DAA520]">FIND ASSETS AND OPERATORS</h2>

      <SearchBar onSearch={handleSearch} />
      <FilterPanel filters={filters} onChange={handleFilterChange} />

      {/* Only show results after a search */}
      {hasSearched && (
        <>
          {/* Tabs */}
          <div className="flex items-center gap-3">
            <div className="flex gap-1 bg-gray-800 rounded-lg p-0.5 w-fit">
              <button
                onClick={() => { setTab('assets'); setPage(1); }}
                className={`px-4 py-1.5 text-sm rounded-md transition-colors ${tab === 'assets' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
              >
                Assets ({assetTotal.toLocaleString()})
              </button>
              <button
                onClick={() => { setTab('operators'); setPage(1); }}
                className={`px-4 py-1.5 text-sm rounded-md transition-colors ${tab === 'operators' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
              >
                Operators ({operatorTotal.toLocaleString()})
              </button>
            </div>
            {(assets.length > 0 || operators.length > 0) && (
              <button
                onClick={exportResults}
                className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-gray-300 text-sm rounded-lg hover:bg-gray-700 transition-colors"
              >
                <span className="text-[#DAA520]">↓</span> EXPORT
              </button>
            )}
          </div>

          {loading && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#DAA520]" />
            </div>
          )}

          {!loading && tab === 'assets' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assets.map((a) => (
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
                        {a.type?.toUpperCase()}
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

              {/* Pagination */}
              {totalPages > 1 && (
                <Pagination page={page} totalPages={totalPages} total={assetTotal} onPageChange={handlePageChange} />
              )}
            </>
          )}

          {!loading && tab === 'operators' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {operators.map((o) => (
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
                      <span className={!o.riskScore ? 'text-gray-500' : o.riskScore <= 3 ? 'text-green-400' : o.riskScore <= 6 ? 'text-[#E6BE44]' : 'text-red-400'}>
                        Risk: {o.riskScore ? `${o.riskScore}/10` : 'NA'}
                      </span>
                    </div>
                  </div>
                ))}
                {operators.length === 0 && <p className="text-gray-500 col-span-full text-center py-8">No operators found</p>}
              </div>

              {/* Pagination */}
              {Math.ceil(operatorTotal / PAGE_SIZE) > 1 && (
                <Pagination page={page} totalPages={Math.ceil(operatorTotal / PAGE_SIZE)} total={operatorTotal} onPageChange={handlePageChange} />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function Pagination({ page, totalPages, total, onPageChange }: { page: number; totalPages: number; total: number; onPageChange: (p: number) => void }) {
  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="flex items-center justify-between pt-4 border-t border-gray-800">
      <p className="text-sm text-gray-500">
        {start.toLocaleString()}–{end.toLocaleString()} of {total.toLocaleString()}
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-4 py-2 bg-gray-800 text-gray-300 text-sm rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ← PREVIOUS
        </button>
        <span className="px-3 py-2 text-sm text-gray-400">
          {page} / {totalPages.toLocaleString()}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="px-4 py-2 bg-gray-800 text-gray-300 text-sm rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          NEXT →
        </button>
      </div>
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
