'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StatCard from '@/components/StatCard';
import SearchBar from '@/components/SearchBar';
import api from '@/lib/api';
import { formatNumber, formatCurrency, getRecentlyViewed } from '@/lib/utils';
import type { Asset, Operator } from '@/lib/types';

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState({ totalOperators: 0, totalAssets: 0, activeWells: 0, topBasins: [] as string[] });
  const [recentAssets, setRecentAssets] = useState<Asset[]>([]);
  const [topOperators, setTopOperators] = useState<Operator[]>([]);
  const [market, setMarket] = useState<{label:string;value:string;sub:string;change:number}[]>([]);

  useEffect(() => {
    api.get('/stats/overview').then((r) => setStats(r.data)).catch(() => {});
    api.get('/operators', { params: { sort: 'totalProduction', order: 'desc', limit: 5 } })
      .then((r) => setTopOperators(r.data.data || r.data))
      .catch(() => {});
    api.get('/market').then((r) => setMarket(r.data)).catch(() => {});

    const ids = getRecentlyViewed().slice(0, 50);
    if (ids.length > 0) {
      api.get('/assets', { params: { ids: ids.join(',') } })
        .then((r) => setRecentAssets(r.data.data || r.data))
        .catch(() => {});
    }
  }, []);

  return (
    <div className="space-y-8">
      <SearchBar onSearch={(q) => q && router.push(`/search?q=${encodeURIComponent(q)}`)} />

      {/* Market Snapshot */}
      <div className="pb-8 border-b border-gray-800">
        <h2 className="text-sm font-medium text-[#DAA520] mb-3">MARKET SNAPSHOT</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {market.length > 0 ? (
            market.map((m) => (
              <StatCard key={m.label} label={m.label} value={m.value} sub={m.sub} change={m.change} />
            ))
          ) : (
            <>
              <StatCard label="WTI Crude" value="—" sub="/bbl" />
              <StatCard label="Brent Crude" value="—" sub="/bbl" />
              <StatCard label="Henry Hub Gas" value="—" sub="/mmbtu" />
              <StatCard label="RBOB Gasoline" value="—" sub="/gal" />
            </>
          )}
        </div>
      </div>

      {/* Platform Stats */}
      <div className="pb-8 border-b border-gray-800">
        <h2 className="text-sm font-medium text-[#DAA520] mb-3">PLATFORM DATA</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Operators" value={formatNumber(stats.totalOperators)} />
          <StatCard label="Total Assets" value={formatNumber(stats.totalAssets)} />
          <StatCard label="Active Wells" value={formatNumber(stats.activeWells)} />
        </div>
      </div>

      {/* Top Basins */}
      {stats.topBasins.length > 0 && (
        <div className="pb-8 border-b border-gray-800">
          <h2 className="text-sm font-medium text-[#DAA520] mb-3">TOP BASINS</h2>
          <div className="flex flex-wrap gap-2">
            {stats.topBasins.map((b) => (
              <span key={b} className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-full text-xs text-gray-300">{b}</span>
            ))}
          </div>
        </div>
      )}

      {/* Top Operators */}
      {topOperators.length > 0 && (
        <div className="pb-8 border-b border-gray-800">
          <h2 className="text-sm font-medium text-[#DAA520] mb-3">TOP OPERATORS BY PRODUCTION</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800">
            {topOperators.map((op) => (
              <div
                key={op.id}
                onClick={() => router.push(`/operators/${op.id}`)}
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-800/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{op.name}</p>
                  <p className="text-xs text-gray-500">{op.activeAssets} assets</p>
                </div>
                <p className="text-[#DAA520] flex-shrink-0 text-right ml-3" style={{ fontSize: 'clamp(0.65rem, 2.5vw, 0.875rem)' }}>{formatNumber(op.totalProduction)} bbl/mo</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recently Viewed */}
      {recentAssets.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-[#DAA520] mb-3">RECENTLY VIEWED</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentAssets.map((a) => (
              <div
                key={a.id}
                onClick={() => router.push(`/assets/${a.id}`)}
                className="bg-gray-900 border border-gray-800 rounded-xl p-4 cursor-pointer hover:border-gray-600 transition-colors"
              >
                <p className="font-medium text-white truncate">{a.name}</p>
                <p className="text-xs text-gray-500 mt-1 truncate">{a.basin} · {a.state}</p>
                <p className="text-[#DAA520] mt-2" style={{ fontSize: 'clamp(0.7rem, 2.5vw, 0.875rem)' }}>{formatNumber(a.currentProduction)} bbl/mo</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
