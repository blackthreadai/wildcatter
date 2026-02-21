'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DataTable, { type Column } from '@/components/DataTable';
import api from '@/lib/api';
import type { Asset } from '@/lib/types';

interface BasinInfo {
  basin: string;
  count: number;
  states: string;
}

export default function AssetsPage() {
  const router = useRouter();
  const [basins, setBasins] = useState<BasinInfo[]>([]);
  const [selectedBasin, setSelectedBasin] = useState<string | null>(null);
  const [selectedBasinLabel, setSelectedBasinLabel] = useState('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load basin list
  useEffect(() => {
    api.get('/stats/basins').then((r) => {
      setBasins(r.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Load assets for selected basin
  const fetchAssets = useCallback(async (basin: string, p: number) => {
    setLoading(true);
    try {
      const res = await api.get('/assets', { params: { basin, page: p, limit: 50, sort: 'name', order: 'ASC' } });
      const data = res.data;
      setAssets(data.data || []);
      const pag = data.pagination || {};
      setTotalPages(pag.totalPages || data.totalPages || 1);
      setTotal(pag.total ?? 0);
    } catch { /* empty */ }
    setLoading(false);
  }, []);

  const handleBasinClick = (basin: string, label: string) => {
    setSelectedBasin(basin);
    setSelectedBasinLabel(label);
    setPage(1);
    fetchAssets(basin, 1);
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    if (selectedBasin) fetchAssets(selectedBasin, p);
  };

  const handleBack = () => {
    setSelectedBasin(null);
    setAssets([]);
    setPage(1);
    setTotal(0);
  };

  const columns: Column<Asset>[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'state', label: 'State', sortable: true },
    { key: 'county', label: 'County', sortable: true },
    { key: 'operatorName', label: 'Operator' },
    { key: 'status', label: 'Status', render: (r) => (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
        r.status === 'active' ? 'bg-green-500/10 text-green-400' :
        r.status === 'shut-in' ? 'bg-[#DAA520]/10 text-[#E6BE44]' :
        'bg-gray-500/10 text-gray-400'
      }`}>{r.status}</span>
    )},
    { key: 'type', label: 'Type', render: (r) => (
      <span className={`text-xs ${r.type === 'oil' ? 'text-[#DAA520]' : r.type === 'gas' ? 'text-green-500' : 'text-gray-400'}`}>
        {r.type?.toUpperCase()}
      </span>
    )},
  ];

  return (
    <div className="space-y-6">
      {!selectedBasin ? (
        <>
          <h2 className="text-sm font-medium text-[#DAA520]">BROWSE INTERESTS BY BASIN</h2>

          {loading && (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#DAA520]" />
            </div>
          )}

          {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {basins.map((b) => {
                const isUndefined = b.basin === '__undefined__';
                const label = isUndefined ? 'Undefined' : b.basin;
                return (
                  <button
                    key={b.basin}
                    onClick={() => handleBasinClick(b.basin, label)}
                    className={`border rounded-xl p-4 text-left hover:border-gray-600 transition-colors group ${
                      isUndefined ? 'bg-[#DAA520]/10 border-[#DAA520]/30' : 'bg-gray-900 border-gray-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white group-hover:text-[#DAA520] transition-colors">{label}</span>
                      <span className="text-xs text-gray-500">→</span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-sm">
                      <span className="text-[#DAA520]">{b.count.toLocaleString()} assets</span>
                      <span className="text-gray-500">{b.states}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="px-3 py-1.5 bg-gray-800 text-gray-300 text-sm rounded-lg hover:bg-gray-700 transition-colors"
            >
              ← BASINS
            </button>
            <h2 className="text-sm font-medium text-[#DAA520]">{selectedBasinLabel.toUpperCase()}</h2>
            {total > 0 && <span className="text-sm text-gray-500">{total.toLocaleString()} assets</span>}
          </div>

          {loading && (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#DAA520]" />
            </div>
          )}

          {!loading && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <DataTable
                columns={columns}
                data={assets}
                onRowClick={(row) => router.push(`/assets/${(row as unknown as Asset).id}`)}
                page={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
