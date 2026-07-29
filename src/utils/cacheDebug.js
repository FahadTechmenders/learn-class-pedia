/**
 * Cache Debugging Utilities
 * Helper functions for debugging Service Worker cache
 */

export async function debugServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('❌ Service Workers not supported in this browser');
    return {
      supported: false,
      registered: false,
      active: false
    };
  }

  const registration = await navigator.serviceWorker.getRegistration();
  
  const info = {
    supported: true,
    registered: !!registration,
    active: !!navigator.serviceWorker.controller,
    state: registration?.active?.state || 'none',
    scope: registration?.scope || 'none',
    updateFound: !!registration?.installing
  };

  console.log('🔍 Service Worker Status:', info);
  return info;
}

export async function debugCacheStorage() {
  if (!('caches' in window)) {
    console.warn('❌ Cache Storage not supported');
    return null;
  }

  const cacheNames = await caches.keys();
  console.log('📦 Available Caches:', cacheNames);

  const manuscriptCache = await caches.open('manuscripts-v1');
  const cachedRequests = await manuscriptCache.keys();
  
  const cachedUrls = cachedRequests.map(req => req.url);
  console.log(`📂 Cached Manuscripts (${cachedUrls.length}):`, cachedUrls);

  let totalSize = 0;
  for (const request of cachedRequests) {
    const response = await manuscriptCache.match(request);
    if (response) {
      const blob = await response.blob();
      totalSize += blob.size;
    }
  }

  const info = {
    cacheNames,
    totalFiles: cachedUrls.length,
    totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
    files: cachedUrls
  };

  console.log('💾 Cache Storage Info:', info);
  return info;
}

export async function testCacheHit(url) {
  if (!('caches' in window)) {
    console.warn('❌ Cache Storage not supported');
    return false;
  }

  const cache = await caches.open('manuscripts-v1');
  const response = await cache.match(url);
  
  if (response) {
    console.log('✅ Cache HIT for:', url);
    return true;
  } else {
    console.log('❌ Cache MISS for:', url);
    return false;
  }
}

export async function clearAllCaches() {
  if (!('caches' in window)) {
    console.warn('❌ Cache Storage not supported');
    return false;
  }

  const cacheNames = await caches.keys();
  const results = await Promise.all(
    cacheNames.map(name => caches.delete(name))
  );

  console.log('🗑️ Cleared caches:', cacheNames);
  return results.every(r => r === true);
}

export async function getFullCacheReport() {
  console.log('📊 Generating Full Cache Report...\n');
  
  const swStatus = await debugServiceWorker();
  console.log('\n');
  
  const cacheInfo = await debugCacheStorage();
  console.log('\n');

  const report = {
    timestamp: new Date().toISOString(),
    serviceWorker: swStatus,
    cache: cacheInfo
  };

  console.log('📋 Full Report:', report);
  return report;
}

if (typeof window !== 'undefined') {
  window.cacheDebug = {
    debugServiceWorker,
    debugCacheStorage,
    testCacheHit,
    clearAllCaches,
    getFullCacheReport
  };
  
  console.log('🛠️ Cache debugging tools available via window.cacheDebug');
}
