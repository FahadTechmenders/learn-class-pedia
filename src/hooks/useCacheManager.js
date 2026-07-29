/**
 * Cache Manager Hook
 * Provides utilities for managing Service Worker cache
 */

import { useState, useCallback } from 'react';
import { 
  getCacheStats, 
  clearManuscriptCache, 
  removeFromCache,
  getCachedUrls 
} from '../utils/serviceWorkerManager';

export function useCacheManager() {
  const [cacheStats, setCacheStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadCacheStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const stats = await getCacheStats();
      setCacheStats(stats);
      return stats;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearCache = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const success = await clearManuscriptCache();
      if (success) {
        setCacheStats(null);
      }
      return success;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeFile = useCallback(async (url) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const success = await removeFromCache(url);
      if (success) {
        await loadCacheStats();
      }
      return success;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadCacheStats]);

  const listCachedFiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const urls = await getCachedUrls();
      return urls;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    cacheStats,
    isLoading,
    error,
    loadCacheStats,
    clearCache,
    removeFile,
    listCachedFiles
  };
}
