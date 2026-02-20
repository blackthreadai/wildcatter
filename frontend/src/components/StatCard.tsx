'use client';

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  change?: number; // percentage change, positive = up, negative = down
}

export default function StatCard({ label, value, sub, color = 'text-white', change }: StatCardProps) {
  const changeColor = change != null ? (change >= 0 ? 'text-green-500' : 'text-red-500') : '';
  const changeArrow = change != null ? (change >= 0 ? '↑' : '↓') : '';

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <p className={`text-2xl font-bold ${change != null ? changeColor : color}`}>{value}</p>
        {sub && <span className="text-xs text-gray-500">{sub}</span>}
      </div>
      {change != null && (
        <p className={`text-xs mt-1 ${changeColor}`}>
          {changeArrow} {Math.abs(change).toFixed(2)}%
        </p>
      )}
    </div>
  );
}
