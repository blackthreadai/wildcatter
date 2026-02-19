'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import api from '@/lib/api';
import { formatNumber, formatCurrency, addRecentlyViewed, assetTypeColor } from '@/lib/utils';
import { exportProductionCSV } from '@/lib/export';
import ProductionChart from '@/components/ProductionChart';
import StatCard from '@/components/StatCard';
import type { Asset, ProductionRecord, FinancialEstimate, Operator } from '@/lib/types';

const AssetMap = dynamic(() => import('@/components/AssetMap'), { ssr: false });

export default function AssetDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [production, setProduction] = useState<ProductionRecord[]>([]);
  const [financials, setFinancials] = useState<FinancialEstimate | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [related, setRelated] = useState<Asset[]>([]);

  useEffect(() => {
    if (!id) return;
    addRecentlyViewed(id as string);

    api.get(`/assets/${id}`).then((r) => {
      const d = r.data;
      setAsset(d);
      // Production and financials come from the combined response
      if (d.productionHistory) setProduction(d.productionHistory);
      if (d.financials) setFinancials(d.financials);
      if (d.relatedAssets) setRelated(d.relatedAssets.filter((a: Asset) => a.id !== id));
      // Fetch operator
      if (d.operatorId) {
        api.get(`/operators/${d.operatorId}`).then((o) => setOperator(o.data)).catch(() => {});
      }
    }).catch(() => {});

    // Also try separate endpoints as fallback
    api.get(`/assets/${id}/production`).then((r) => {
      const records = r.data?.data || r.data;
      if (Array.isArray(records) && records.length > 0) setProduction(records);
    }).catch(() => {});
  }, [id]);

  if (!asset) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-300 mb-2">← Back</button>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            {asset.name}
            <span className="text-sm px-2 py-0.5 rounded" style={{ backgroundColor: assetTypeColor(asset.type) + '20', color: assetTypeColor(asset.type) }}>
              {asset.type.toUpperCase()}
            </span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">{asset.basin} · {asset.county}, {asset.state}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportProductionCSV(production)} className="px-3 py-2 bg-gray-800 text-gray-300 text-sm rounded-lg hover:bg-gray-700">
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Status" value={asset.status} color={asset.status === 'active' ? 'text-green-400' : 'text-gray-400'} />
        <StatCard label="Production" value={formatNumber(asset.currentProduction)} sub="bbl/mo" color="text-amber-500" />
        <StatCard label="Decline Rate" value={asset.declineRate.toFixed(1) + '%'} color="text-red-400" />
        <StatCard label="Est. Life" value={asset.estimatedLife + ' yr'} />
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-medium text-gray-400">Asset Details</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-gray-500">Commodity</span><span>{asset.commodity}</span>
            <span className="text-gray-500">Spud Date</span><span>{asset.spudDate}</span>
            <span className="text-gray-500">Depth</span><span>{formatNumber(asset.depth)} ft</span>
            <span className="text-gray-500">Location</span><span>{asset.latitude.toFixed(4)}, {asset.longitude.toFixed(4)}</span>
          </div>
        </div>

        {/* Financials */}
        {financials && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-medium text-gray-400">Financial Estimates</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-gray-500">Revenue</span><span className="text-green-400">{formatCurrency(financials.revenue)}</span>
              <span className="text-gray-500">Operating Cost</span><span className="text-red-400">{formatCurrency(financials.operatingCost)}</span>
              <span className="text-gray-500">Net Cash Flow</span><span className="text-amber-500">{formatCurrency(financials.netCashFlow)}</span>
              <span className="text-gray-500">Breakeven</span><span>{formatCurrency(financials.breakevenPrice)}/bbl</span>
            </div>
          </div>
        )}
      </div>

      {/* Production Chart */}
      {production.length > 0 && <ProductionChart data={production} showDeclineCurve />}

      {/* Operator Card */}
      {operator && (
        <div
          onClick={() => router.push(`/operators/${operator.id}`)}
          className="bg-gray-900 border border-gray-800 rounded-xl p-5 cursor-pointer hover:border-gray-600 transition-colors"
        >
          <h3 className="text-sm font-medium text-gray-400 mb-2">Operator</h3>
          <p className="text-lg font-medium text-white">{operator.name}</p>
          <p className="text-sm text-gray-500">{operator.hqLocation} · {operator.activeAssets} active assets</p>
          <div className="flex gap-2 mt-2">
            {operator.complianceFlags.map((f) => (
              <span key={f} className="px-2 py-0.5 bg-red-500/10 text-red-400 text-xs rounded">{f}</span>
            ))}
          </div>
        </div>
      )}

      {/* Map */}
      <div className="h-[300px] rounded-xl overflow-hidden border border-gray-800">
        <AssetMap assets={[asset]} singleMarker />
      </div>

      {/* Related Assets */}
      {related.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-3">Related Assets in {asset.basin}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {related.map((a) => (
              <div
                key={a.id}
                onClick={() => router.push(`/assets/${a.id}`)}
                className="bg-gray-900 border border-gray-800 rounded-xl p-4 cursor-pointer hover:border-gray-600 transition-colors"
              >
                <p className="font-medium text-white">{a.name}</p>
                <p className="text-xs text-gray-500 mt-1">{a.operatorName} · {a.status}</p>
                <p className="text-sm text-amber-500 mt-2">{formatNumber(a.currentProduction)} bbl/mo</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
