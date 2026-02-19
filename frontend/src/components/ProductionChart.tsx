'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { ProductionRecord } from '@/lib/types';

interface Props {
  data: ProductionRecord[];
  showDeclineCurve?: boolean;
}

export default function ProductionChart({ data, showDeclineCurve }: Props) {
  const chartData = data.map((r, i) => ({
    month: r.month,
    oil: r.oilVolume,
    gas: r.gasVolume,
    water: r.waterCut,
    decline: showDeclineCurve && data.length > 0
      ? data[0].oilVolume * Math.exp(-0.05 * i)
      : undefined,
  }));

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h3 className="text-sm font-medium text-gray-400 mb-4">Production History</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="month" stroke="#6b7280" tick={{ fontSize: 11 }} />
          <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
            labelStyle={{ color: '#9ca3af' }}
          />
          <Legend />
          <Line type="monotone" dataKey="oil" stroke="#f59e0b" strokeWidth={2} dot={false} name="Oil (bbl)" />
          <Line type="monotone" dataKey="gas" stroke="#22c55e" strokeWidth={2} dot={false} name="Gas (mcf)" />
          <Line type="monotone" dataKey="water" stroke="#3b82f6" strokeWidth={1} dot={false} name="Water Cut" />
          {showDeclineCurve && (
            <Line type="monotone" dataKey="decline" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="Decline Curve" />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
