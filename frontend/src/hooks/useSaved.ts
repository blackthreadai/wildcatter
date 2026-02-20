'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import type { Asset, Operator } from '@/lib/types';

export function useSaved() {
  const [savedAssets, setSavedAssets] = useState<Asset[]>([]);
  const [savedOperators, setSavedOperators] = useState<Operator[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchSaved = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/saved');
      const assets = res.data.assets || [];
      const operators = res.data.operators || [];
      setSavedAssets(assets);
      setSavedOperators(operators);
      const ids = new Set<string>();
      assets.forEach((a: Asset) => ids.add(`asset:${a.id}`));
      operators.forEach((o: Operator) => ids.add(`operator:${o.id}`));
      setSavedIds(ids);
    } catch { /* empty */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSaved(); }, [fetchSaved]);

  const saveItem = useCallback(async (type: 'asset' | 'operator', id: string) => {
    try {
      await api.post('/saved', { itemType: type, itemId: id });
      await fetchSaved();
    } catch { /* empty */ }
  }, [fetchSaved]);

  const unsaveItem = useCallback(async (type: 'asset' | 'operator', id: string) => {
    try {
      await api.delete('/saved', { params: { itemType: type, itemId: id } });
      await fetchSaved();
    } catch { /* empty */ }
  }, [fetchSaved]);

  const isSaved = useCallback((type: 'asset' | 'operator', id: string) => {
    return savedIds.has(`${type}:${id}`);
  }, [savedIds]);

  return { savedAssets, savedOperators, saveItem, unsaveItem, isSaved, loading, fetchSaved };
}
