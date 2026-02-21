'use client';

import { useState, useRef, useEffect } from 'react';

interface Props {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchBar({ onSearch, placeholder = 'Search assets, operators, basins...', className = '' }: Props) {
  const [query, setQuery] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null!);
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;

  useEffect(() => {
    // Don't fire on empty initial mount
    if (query.length === 0) return;
    
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onSearchRef.current(query);
    }, 300);

    return () => clearTimeout(timerRef.current);
  }, [query]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      clearTimeout(timerRef.current);
      onSearchRef.current(query);
    }
  }

  return (
    <div className={`relative ${className}`}>
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#DAA520] transition-colors"
      />
    </div>
  );
}
