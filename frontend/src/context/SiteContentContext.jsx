import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import api from '../config/axiosConfig';
import { DEFAULT_CONTENT } from '../constants';

const SiteContentContext = createContext(null);

// Per-section shallow merge: stored overrides win, defaults fill gaps
export const mergeContent = (stored) => {
  if (!stored || typeof stored !== 'object') return DEFAULT_CONTENT;
  const merged = {};
  for (const section of Object.keys(DEFAULT_CONTENT)) {
    const override = stored[section];
    merged[section] =
      override && typeof override === 'object' && !Array.isArray(override)
        ? { ...DEFAULT_CONTENT[section], ...override }
        : DEFAULT_CONTENT[section];
  }
  return merged;
};

export const SiteContentProvider = ({ children }) => {
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get('/content');
      if (res.data?.success) {
        setContent(mergeContent(res.data.data));
      }
    } catch {
      // Backend unreachable — keep defaults
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(() => ({ content, refresh, ready }), [content, refresh, ready]);

  return (
    <SiteContentContext.Provider value={value}>
      {children}
    </SiteContentContext.Provider>
  );
};

export const useSiteContent = () => {
  const ctx = useContext(SiteContentContext);
  if (!ctx) throw new Error('useSiteContent must be used within a SiteContentProvider');
  return ctx;
};

export default SiteContentContext;
