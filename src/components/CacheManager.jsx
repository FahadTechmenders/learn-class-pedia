/**
 * Cache Manager Component
 * UI for viewing and managing Service Worker manuscript cache
 */

import React, { useEffect } from 'react';
import { useCacheManager } from '../hooks/useCacheManager';
import { useAuth } from '../context/AuthContext';
import { HardDrive, Trash2, RefreshCw, Download, CheckCircle, Loader2 } from 'lucide-react';

export function CacheManager() {
  const { cacheStats, isLoading, loadCacheStats, clearCache } = useCacheManager();
  const { manuscriptPreloadStatus, startManuscriptPreload } = useAuth();

  useEffect(() => {
    loadCacheStats();
  }, [loadCacheStats]);

  const handleClearCache = async () => {
    if (window.confirm('Are you sure you want to clear all cached manuscripts? This will free up storage but books will need to be downloaded again.')) {
      const success = await clearCache();
      if (success) {
        alert('Cache cleared successfully!');
      } else {
        alert('Failed to clear cache. Please try again.');
      }
    }
  };

  const handleRefreshCache = async () => {
    await loadCacheStats();
  };

  const handleSyncManuscripts = () => {
    startManuscriptPreload();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <HardDrive className="w-6 h-6 text-indigo-600" />
          <h2 className="text-xl font-semibold text-gray-900">Manuscript Cache</h2>
        </div>
        <button
          onClick={handleRefreshCache}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {isLoading && !cacheStats ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 border border-indigo-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-indigo-900">Total Files</p>
                  <p className="text-2xl font-bold text-indigo-600 mt-1">
                    {cacheStats?.totalFiles || 0}
                  </p>
                </div>
                <HardDrive className="w-8 h-8 text-indigo-400" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-900">Storage Used</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {cacheStats?.totalSizeMB || '0.00'} MB
                  </p>
                </div>
                <Download className="w-8 h-8 text-green-400" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-900">Status</p>
                  <p className="text-sm font-semibold text-purple-600 mt-1">
                    {manuscriptPreloadStatus.isPreloading ? 'Syncing...' : 'Ready'}
                  </p>
                </div>
                {manuscriptPreloadStatus.isPreloading ? (
                  <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                ) : (
                  <CheckCircle className="w-8 h-8 text-purple-400" />
                )}
              </div>
            </div>
          </div>

          {manuscriptPreloadStatus.isPreloading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3 mb-2">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                <p className="text-sm font-medium text-blue-900">
                  Downloading manuscripts in background...
                </p>
              </div>
              {manuscriptPreloadStatus.currentBook && (
                <p className="text-xs text-blue-700 ml-8">
                  {manuscriptPreloadStatus.currentBook.bookTitle} 
                  ({manuscriptPreloadStatus.currentBook.current}/{manuscriptPreloadStatus.currentBook.total})
                </p>
              )}
              <div className="mt-3 ml-8">
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${manuscriptPreloadStatus.progress}%` }}
                  />
                </div>
                <p className="text-xs text-blue-600 mt-1 font-medium">
                  {manuscriptPreloadStatus.progress}%
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleSyncManuscripts}
              disabled={manuscriptPreloadStatus.isPreloading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Sync New Manuscripts
            </button>

            <button
              onClick={handleClearCache}
              disabled={isLoading || !cacheStats?.totalFiles}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              Clear All Cache
            </button>
          </div>

          {cacheStats?.files && cacheStats.files.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Cached Files</h3>
              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">File</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Size</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {cacheStats.files.map((file, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-xs text-gray-900 truncate max-w-md">
                          {file.url.split('/').pop()}
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-500 text-right whitespace-nowrap">
                          {file.sizeMB} MB
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
