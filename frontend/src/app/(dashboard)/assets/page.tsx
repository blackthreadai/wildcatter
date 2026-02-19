'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import DataTable, { type Column } from '@/components/DataTable';
import api from '@/lib/api';
import { formatNumber, formatCurrency } from '@/lib/utils';
import { exportAssetsCSV } from '@/lib/export';
import type { Asset } from '@/lib/types';

const AssetMap = dynamic(() => import('@/components/AssetMap'), { ssr: false });

export default function AssetsPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [view, setView] = useState<'table' | 'map'>('table');
  const [loading, setLoading] = useState(true);

  const fetchAssets = useCallback(async (p: number, bounds?: Record<string, number>) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page: p, limit: 25 };
      if (bounds) Object.assign(params, bounds);
      const res = await api.get('/assets', { params });
      const data = res.data;
      setAssets(data.data || data);
      setTotalPages(data.totalPages || 1);
    } catch { /* empty */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAssets(page); }, [page, fetchAssets]);

  const columns: Column<Asset>[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'state', label: 'State', sortable: true },
    { key: 'basin', label: 'Basin', sortable: true },
    { key: 'operatorName', label: 'Operator', sortable: true },
    { key: 'currentProduction', label: 'Production', sortable: true, render: (r) => formatNumber(r.currentProduction) + ' bbl/mo' },
    { key: 'declineRate', label: 'Decline', sortable: true, render: (r) => r.declineRate.toFixed(1) + '%' },
    { key: 'cashFlow', label: 'Cash Flow', sortable: true, render: (r) => formatCurrency(r.cashFlow) },
    { key: 'status', label: 'Status', render: (r) => (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
        r.status === 'active' ? 'bg-green-500/10 text-green-400' :
        r.status === 'shut-in' ? 'bg-[#DAA520]/10 text-[#E6BE44]' :
        'bg-gray-500/10 text-gray-400'
      }`}>{r.status}</span>
    )},
    { key: 'type', label: 'Type', render: (r) => (
      <span className={`text-xs ${r.type === 'oil' ? 'text-[#DAA520]' : r.type === 'gas' ? 'text-green-500' : 'text-gray-400'}`}>
        {r.type.toUpperCase()}
      </span>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Assets</h1>
          <p className="text-sm text-gray-500 mt-1">Browse and manage energy assets</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => exportAssetsCSV(assets)}
            className="px-3 py-2 bg-gray-800 text-gray-300 text-sm rounded-lg hover:bg-gray-700 transition-colors"
          >
            📥 Export CSV
          </button>
          <div className="flex bg-gray-800 rounded-lg p-0.5">
            <button
              onClick={() => setView('table')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${view === 'table' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
            >
              Table
            </button>
            <button
              onClick={() => setView('map')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${view === 'map' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
            >
              Map
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#DAA520]" />
        </div>
      )}

      {!loading && view === 'table' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <DataTable
            columns={columns}
            data={assets}
            onRowClick={(row) => router.push(`/assets/${(row as unknown as Asset).id}`)}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}

      {!loading && view === 'map' && (
        <div className="h-[600px] rounded-xl overflow-hidden border border-gray-800">
          <AssetMap
            assets={assets}
            onAssetClick={(a) => router.push(`/assets/${a.id}`)}
            onBoundsChange={(bounds) => fetchAssets(1, bounds)}
          />
        </div>
      )}
    </div>
  );
}
