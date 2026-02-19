'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { downloadCSV } from '@/lib/export';
import type { Asset } from '@/lib/types';

export default function ExportPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function exportAllAssets() {
    setLoading(true);
    setMessage('');
    try {
      const res = await api.get('/assets', { params: { limit: 10000 } });
      const data = res.data.data || res.data;
      downloadCSV(data, 'wildcatter-assets.csv');
      setMessage(`Exported ${data.length} assets`);
    } catch {
      setMessage('Export failed');
    }
    setLoading(false);
  }

  async function exportProduction() {
    setLoading(true);
    setMessage('');
    try {
      const res = await api.get('/production', { params: { limit: 50000 } });
      downloadCSV(res.data.data || res.data, 'wildcatter-production.csv');
      setMessage('Production data exported');
    } catch {
      setMessage('Export failed');
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Export</h1>
        <p className="text-sm text-gray-500 mt-1">Download data in CSV format</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-medium text-white mb-2">Asset Data</h3>
          <p className="text-sm text-gray-500 mb-4">Export all assets with key metrics including production, decline rates, and financial estimates.</p>
          <button
            onClick={exportAllAssets}
            disabled={loading}
            className="px-4 py-2 bg-[#B8860B] text-white rounded-lg text-sm font-medium hover:bg-[#DAA520] disabled:opacity-50 transition-colors"
          >
            {loading ? 'Exporting...' : '📥 Download Assets CSV'}
          </button>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-medium text-white mb-2">Production Data</h3>
          <p className="text-sm text-gray-500 mb-4">Export monthly production records for all assets including oil, gas volumes, and water cut.</p>
          <button
            onClick={exportProduction}
            disabled={loading}
            className="px-4 py-2 bg-[#B8860B] text-white rounded-lg text-sm font-medium hover:bg-[#DAA520] disabled:opacity-50 transition-colors"
          >
            {loading ? 'Exporting...' : '📥 Download Production CSV'}
          </button>
        </div>
      </div>

      {message && (
        <p className="text-sm text-green-400">{message}</p>
      )}
    </div>
  );
}
