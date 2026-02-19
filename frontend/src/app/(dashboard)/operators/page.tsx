'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import DataTable, { type Column } from '@/components/DataTable';
import { formatNumber } from '@/lib/utils';
import type { Operator } from '@/lib/types';

export default function OperatorsPage() {
  const router = useRouter();
  const [operators, setOperators] = useState<Operator[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    api.get('/operators', { params: { page, limit: 25 } })
      .then((r) => {
        setOperators(r.data.data || r.data);
        setTotalPages(r.data.totalPages || 1);
      })
      .catch(() => {});
  }, [page]);

  const columns: Column<Operator>[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'hqLocation', label: 'HQ', sortable: true },
    { key: 'activeAssets', label: 'Active Assets', sortable: true },
    { key: 'totalProduction', label: 'Production', sortable: true, render: (r) => formatNumber(r.totalProduction) + ' bbl/mo' },
    { key: 'riskScore', label: 'Risk', sortable: true, render: (r) => (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
        r.riskScore <= 3 ? 'bg-green-500/10 text-green-400' :
        r.riskScore <= 6 ? 'bg-[#DAA520]/10 text-[#E6BE44]' :
        'bg-red-500/10 text-red-400'
      }`}>{r.riskScore}/10</span>
    )},
    { key: 'complianceFlags', label: 'Flags', render: (r) => (
      <div className="flex gap-1">
        {r.complianceFlags.map((f) => (
          <span key={f} className="px-1.5 py-0.5 bg-red-500/10 text-red-400 text-xs rounded">{f}</span>
        ))}
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Operators</h1>
        <p className="text-sm text-gray-500 mt-1">Browse energy operators and their profiles</p>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <DataTable
          columns={columns}
          data={operators}
          onRowClick={(row) => router.push(`/operators/${(row as unknown as Operator).id}`)}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
