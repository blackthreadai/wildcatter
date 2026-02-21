export function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

export function formatNumber(n: number | null | undefined, decimals = 0): string {
  if (n == null || isNaN(Number(n))) return '—';
  const v = Number(n);
  const abs = Math.abs(v);
  if (abs >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (abs >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (abs >= 10_000) return (v / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(v);
}

export function formatCurrency(n: number | null | undefined): string {
  if (n == null || isNaN(Number(n))) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(n));
}

export function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

export function getRecentlyViewed(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('wc_recent') || '[]');
  } catch {
    return [];
  }
}

export function addRecentlyViewed(id: string) {
  const recent = getRecentlyViewed().filter((r) => r !== id);
  recent.unshift(id);
  localStorage.setItem('wc_recent', JSON.stringify(recent.slice(0, 50)));
}

export function assetTypeColor(type: string) {
  switch (type) {
    case 'oil': return '#DAA520';
    case 'gas': return '#22c55e';
    case 'mining': return '#6b7280';
    case 'energy': return '#3b82f6';
    default: return '#6b7280';
  }
}
