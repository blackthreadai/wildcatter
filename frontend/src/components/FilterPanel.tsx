'use client';

import { useState } from 'react';
import type { SearchFilters } from '@/lib/types';

interface Props {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
}

const STATES = [
  { value: 'TX', label: 'Texas' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'NM', label: 'New Mexico' },
];
const BASINS = [
  { value: 'Anadarko Basin', label: 'Anadarko Basin' },
  { value: 'Delaware Basin', label: 'Delaware Basin' },
  { value: 'Midland Basin', label: 'Midland Basin' },
  { value: 'SCOOP', label: 'SCOOP' },
  { value: 'STACK', label: 'STACK' },
  { value: 'San Juan Basin', label: 'San Juan Basin' },
];
const TYPES = ['oil', 'gas', 'mining', 'energy'];
const STATUSES = ['active', 'inactive', 'shut-in'];

export default function FilterPanel({ filters, onChange }: Props) {
  const [open, setOpen] = useState(false);

  function update(key: keyof SearchFilters, value: string | number | undefined) {
    onChange({ ...filters, [key]: value || undefined });
  }

  const selectClass = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#DAA520]';
  const inputClass = selectClass;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-sm font-medium text-gray-300"
      >
        <span>Filters</span>
        <span className={`text-[#DAA520] transition-transform ${open ? 'rotate-180' : ''}`}>↓</span>
      </button>

      {open && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">State</label>
            <select className={selectClass} value={filters.state || ''} onChange={(e) => update('state', e.target.value)}>
              <option value="">All</option>
              {STATES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Basin</label>
            <select className={selectClass} value={filters.basin || ''} onChange={(e) => update('basin', e.target.value)}>
              <option value="">All</option>
              {BASINS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Asset Type</label>
            <select className={selectClass} value={filters.assetType || ''} onChange={(e) => update('assetType', e.target.value)}>
              <option value="">All</option>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Status</label>
            <select className={selectClass} value={filters.status || ''} onChange={(e) => update('status', e.target.value)}>
              <option value="">All</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">County</label>
            <input className={inputClass} placeholder="County" value={filters.county || ''} onChange={(e) => update('county', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Prod. Min (bbl/mo)</label>
            <input className={inputClass} type="number" placeholder="0" value={filters.productionMin || ''} onChange={(e) => update('productionMin', Number(e.target.value))} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Prod. Max (bbl/mo)</label>
            <input className={inputClass} type="number" placeholder="∞" value={filters.productionMax || ''} onChange={(e) => update('productionMax', Number(e.target.value))} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Decline Rate Min (%)</label>
            <input className={inputClass} type="number" placeholder="0" value={filters.declineRateMin || ''} onChange={(e) => update('declineRateMin', Number(e.target.value))} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Decline Rate Max (%)</label>
            <input className={inputClass} type="number" placeholder="100" value={filters.declineRateMax || ''} onChange={(e) => update('declineRateMax', Number(e.target.value))} />
          </div>
        </div>
      )}
    </div>
  );
}
