'use client';

import { useState, type ReactNode } from 'react';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
  /** Hide this column in mobile card view */
  hideOnMobile?: boolean;
  /** Use as the card title (first prominent line) */
  primary?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  onRowClick,
  page = 1,
  totalPages = 1,
  onPageChange,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sorted = sortKey
    ? [...data].sort((a, b) => {
        const av = a[sortKey], bv = b[sortKey];
        const cmp = av === bv ? 0 : (av ?? '') < (bv ?? '') ? -1 : 1;
        return sortDir === 'asc' ? cmp : -cmp;
      })
    : data;

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const Pagination = () => totalPages > 1 && onPageChange ? (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="px-3 py-1 text-sm bg-gray-800 text-gray-300 rounded disabled:opacity-30"
      >
        Previous
      </button>
      <span className="text-sm text-gray-500">
        Page {page} of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="px-3 py-1 text-sm bg-gray-800 text-gray-300 rounded disabled:opacity-30"
      >
        Next
      </button>
    </div>
  ) : null;

  return (
    <div>
      {/* Desktop: standard table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              {columns.map((col, idx) => (
                <th
                  key={col.key}
                  className={`text-left px-4 py-3 text-xs text-[#DAA520] uppercase tracking-wider font-medium ${
                    idx < columns.length - 1 ? 'border-r border-gray-800' : ''
                  } ${col.sortable ? 'cursor-pointer hover:text-[#E6BE44]' : ''}`}
                  onClick={() => col.sortable && toggleSort(col.key)}
                >
                  {col.label}
                  {sortKey === col.key && (sortDir === 'asc' ? ' ↑' : ' ↓')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr
                key={i}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-gray-800/50 transition-colors ${
                  onRowClick ? 'cursor-pointer hover:bg-gray-800/50' : ''
                }`}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-gray-300 text-sm">
                    {col.render ? col.render(row) : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile: card layout */}
      <div className="md:hidden divide-y divide-gray-800">
        {sorted.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-500 text-sm">No data available</div>
        )}
        {sorted.map((row, i) => {
          // First column is treated as the card title
          const titleCol = columns[0];
          const restCols = columns.slice(1);
          return (
            <div
              key={i}
              onClick={() => onRowClick?.(row)}
              className={`px-4 py-3 ${onRowClick ? 'cursor-pointer active:bg-gray-800/50' : ''}`}
            >
              <p className="text-sm font-medium text-white truncate">
                {titleCol.render ? titleCol.render(row) : String(row[titleCol.key] ?? '')}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                {restCols.map((col) => {
                  const val = col.render ? col.render(row) : String(row[col.key] ?? '');
                  if (!val || val === '' || val === 'undefined') return null;
                  return (
                    <div key={col.key} className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] text-gray-600 uppercase tracking-wider flex-shrink-0">{col.label}</span>
                      <span className="text-xs text-gray-400 truncate">{val}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <Pagination />
    </div>
  );
}
