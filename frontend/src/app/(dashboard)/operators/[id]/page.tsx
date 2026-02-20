'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { formatNumber } from '@/lib/utils';
import StatCard from '@/components/StatCard';
import ProductionChart from '@/components/ProductionChart';
import DataTable, { type Column } from '@/components/DataTable';
import { useSaved } from '@/hooks/useSaved';
import SaveButton from '@/components/SaveButton';
import type { Operator, Asset, ProductionRecord } from '@/lib/types';

export default function OperatorDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [operator, setOperator] = useState<Operator | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [production, setProduction] = useState<ProductionRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { isSaved, saveItem, unsaveItem } = useSaved();
  const toggleSave = (type: 'asset' | 'operator', itemId: string) => {
    if (isSaved(type, itemId)) unsaveItem(type, itemId);
    else saveItem(type, itemId);
  };

  useEffect(() => {
    if (!id) return;
    api.get(`/operators/${id}`).then((r) => setOperator(r.data)).catch(() => {});
    api.get(`/operators/${id}/production`).then((r) => {
      const records = r.data?.data || r.data;
      setProduction(Array.isArray(records) ? records : []);
    }).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!id) return;
    api.get(`/operators/${id}/assets`, { params: { page, limit: 10 } })
      .then((r) => {
        setAssets(r.data.data || r.data);
        setTotalPages(r.data.totalPages || 1);
      })
      .catch(() => {});
  }, [id, page]);

  if (!operator) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#DAA520]" />
      </div>
    );
  }

  const riskColor = operator.riskScore <= 3 ? 'text-green-400' : operator.riskScore <= 6 ? 'text-[#E6BE44]' : 'text-red-400';

  const columns: Column<Asset>[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'type', label: 'Type' },
    { key: 'basin', label: 'Basin', sortable: true },
    { key: 'state', label: 'State' },
    { key: 'currentProduction', label: 'Production', sortable: true, render: (r) => formatNumber(r.currentProduction) + ' bbl/mo' },
    { key: 'status', label: 'Status', render: (r) => (
      <span className={`px-2 py-0.5 rounded text-xs ${r.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400'}`}>{r.status}</span>
    )},
  ];

  return (
    <div className="space-y-6">
      <div>
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-300 mb-2">← Back</button>
        <h1 className="text-2xl font-bold text-white">{operator.name}</h1>
        <p className="text-sm text-gray-500 mt-1">{operator.hqLocation}</p>
      </div>

      {/* Actions bar */}
      <div className="flex items-center gap-4 pb-4 border-b border-gray-800">
        <button
          onClick={() => toggleSave('operator', operator.id)}
          className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
            isSaved('operator', operator.id)
              ? 'bg-[#DAA520]/10 text-[#DAA520]'
              : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
        >
          {isSaved('operator', operator.id) ? '★ SAVED' : '☆ SAVE'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Active Assets" value={String(operator.activeAssets)} />
        <StatCard label="Total Production" value={formatNumber(operator.totalProduction)} sub="bbl/mo" color="text-[#DAA520]" />
        <StatCard label="Risk Score" value={`${operator.riskScore}/10`} color={riskColor} />
        <StatCard label="Compliance" value={operator.complianceFlags.length === 0 ? 'Clean' : `${operator.complianceFlags.length} flags`} color={operator.complianceFlags.length === 0 ? 'text-green-400' : 'text-red-400'} />
      </div>

      {/* Risk Badges */}
      {operator.complianceFlags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {operator.complianceFlags.map((f) => (
            <span key={f} className="px-3 py-1 bg-red-500/10 text-red-400 text-sm rounded-lg border border-red-500/20">{f}</span>
          ))}
        </div>
      )}

      {/* Production Trend */}
      {production.length > 0 && <ProductionChart data={production} />}

      {/* Assets */}
      <div>
        <h3 className="text-sm font-medium text-gray-400 mb-3">Assets</h3>
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
      </div>
    </div>
  );
}
