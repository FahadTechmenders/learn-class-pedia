/**
 * Service Worker for Manuscript Caching
 * Provides background download queue and cache management for large manuscript files
 */

const CACHE_NAME = 'manuscripts-v1';
const CACHE_VERSION = 1;

let downloadQueue = [];
let isDownloading = false;
let downloadStats = {
  total: 0,
  completed: 0,
  failed: 0
};

self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker version:', CACHE_VERSION);
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name.startsWith('manuscripts-') && name !== CACHE_NAME)
          .map(name => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  const isManuscriptRequest = 
    url.pathname.includes('/manuscript') ||
    url.pathname.includes('/books/') ||
    url.hostname.includes('cdn.classpedia.ai') ||
    url.pathname.match(/\.(epub|pdf|docx)$/i);
  
  if (isManuscriptRequest && event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            console.log('[SW] 📂 Cache HIT:', url.pathname);
            return cachedResponse;
          }
          
          console.log('[SW] 🌐 Cache MISS, fetching:', url.pathname);
          return fetch(event.request).then(response => {
            if (response && response.status === 200) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseToCache);
              });
            }
            return response;
          });
        })
        .catch(error => {
          console.error('[SW] Fetch failed:', error);
          return new Response('Network error', { status: 503 });
        })
    );
  }
});

self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'CACHE_MANUSCRIPTS':
      handleCacheManuscripts(data);
      break;
      
    case 'GET_CACHE_STATS':
      handleGetCacheStats(event);
      break;
      
    case 'CLEAR_CACHE':
      handleClearCache(event);
      break;
      
    case 'REMOVE_FROM_CACHE':
      handleRemoveFromCache(data, event);
      break;
      
    case 'GET_CACHED_URLS':
      handleGetCachedUrls(event);
      break;
      
    default:
      console.warn('[SW] Unknown message type:', type);
  }
});

async function handleCacheManuscripts(files) {
  console.log(`[SW] 📥 Queuing ${files.length} manuscripts for background download`);
  
  downloadStats.total = files.length;
  downloadStats.completed = 0;
  downloadStats.failed = 0;
  
  const cache = await caches.open(CACHE_NAME);
  const cachedRequests = await cache.keys();
  const cachedUrls = new Set(cachedRequests.map(req => req.url));
  
  const uncachedFiles = files.filter(file => !cachedUrls.has(file.url));
  
  if (uncachedFiles.length === 0) {
    console.log('[SW] ✅ All manuscripts already cached');
    notifyClients({
      type: 'CACHE_COMPLETE',
      stats: downloadStats
    });
    return;
  }
  
  console.log(`[SW] ${uncachedFiles.length} new manuscripts to download`);
  downloadQueue.push(...uncachedFiles);
  
  notifyClients({
    type: 'CACHE_STARTED',
    total: uncachedFiles.length
  });
  
  processQueue();
}

async function processQueue() {
  if (isDownloading || downloadQueue.length === 0) {
    if (downloadQueue.length === 0 && !isDownloading) {
      notifyClients({
        type: 'CACHE_COMPLETE',
        stats: downloadStats
      });
    }
    return;
  }
  
  isDownloading = true;
  const file = downloadQueue.shift();
  
  try {
    console.log(`[SW] ⬇️ Downloading (${downloadStats.completed + 1}/${downloadStats.total}): ${file.url}`);
    
    await downloadAndCache(file);
    
    downloadStats.completed++;
    
    notifyClients({
      type: 'DOWNLOAD_PROGRESS',
      url: file.url,
      filename: file.filename,
      completed: downloadStats.completed,
      total: downloadStats.total,
      remaining: downloadQueue.length,
      progress: Math.round((downloadStats.completed / downloadStats.total) * 100)
    });
    
  } catch (error) {
    console.error(`[SW] ❌ Download failed: ${file.url}`, error);
    downloadStats.failed++;
    
    notifyClients({
      type: 'DOWNLOAD_FAILED',
      url: file.url,
      filename: file.filename,
      error: error.message,
      completed: downloadStats.completed,
      failed: downloadStats.failed,
      remaining: downloadQueue.length
    });
  } finally {
    isDownloading = false;
    
    setTimeout(() => processQueue(), 2000);
  }
}

async function downloadAndCache(file) {
  const cache = await caches.open(CACHE_NAME);
  
  // Use backend proxy to avoid CORS issues
  // Backend endpoint: /book/file-chunk?fileUrl=...&startBytes=0&endBytes=...
  const baseUrl = file.baseUrl || 'https://adminapi.classpedia.ai/api';
  
  // Get file size first
  const sizeResponse = await fetch(
    `${baseUrl}/book/file-info?fileUrl=${encodeURIComponent(file.url)}`,
    {
      headers: {
        'Authorization': `Bearer ${file.token}`,
        'Accept': 'application/json'
      }
    }
  );
  
  if (!sizeResponse.ok) {
    throw new Error(`Failed to get file size: ${sizeResponse.status}`);
  }
  
  const sizeData = await sizeResponse.json();
  const totalSize = sizeData.fileSize || 0;
  
  if (!totalSize) {
    throw new Error('Unable to determine file size');
  }
  
  // Download complete file via backend proxy
  const response = await fetch(
    `${baseUrl}/book/file-chunk?fileUrl=${encodeURIComponent(file.url)}&startBytes=0&endBytes=${totalSize - 1}`,
    {
      headers: {
        'Authorization': `Bearer ${file.token}`,
        'Accept': 'application/octet-stream, */*'
      }
    }
  );
  
  if (!response.ok && response.status !== 206) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  // Cache API rejects 206 Partial Content responses. Reconstruct as a
  // complete 200 response before caching.
  let responseToCache;
  if (response.status === 206) {
    const blob = await response.blob();
    responseToCache = new Response(blob, {
      status: 200,
      statusText: 'OK',
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
        'Content-Length': blob.size.toString()
      }
    });
  } else {
    responseToCache = response;
  }
  
  // Cache using original CDN URL as key (for fetch interception)
  await cache.put(file.url, responseToCache);
  
  console.log(`[SW] ✅ Cached: ${file.url}`);
}

async function handleGetCacheStats(event) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();
    
    let totalSize = 0;
    const files = [];
    
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        const size = blob.size;
        totalSize += size;
        
        files.push({
          url: request.url,
          size: size,
          sizeMB: (size / 1024 / 1024).toFixed(2)
        });
      }
    }
    
    event.ports[0].postMessage({
      success: true,
      stats: {
        totalFiles: requests.length,
        totalSize: totalSize,
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
        files: files
      }
    });
  } catch (error) {
    event.ports[0].postMessage({
      success: false,
      error: error.message
    });
  }
}

async function handleClearCache(event) {
  try {
    const deleted = await caches.delete(CACHE_NAME);
    await caches.open(CACHE_NAME);
    
    downloadQueue = [];
    downloadStats = { total: 0, completed: 0, failed: 0 };
    
    event.ports[0].postMessage({
      success: true,
      deleted: deleted
    });
    
    console.log('[SW] 🗑️ Cache cleared');
  } catch (error) {
    event.ports[0].postMessage({
      success: false,
      error: error.message
    });
  }
}

async function handleRemoveFromCache(data, event) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const deleted = await cache.delete(data.url);
    
    event.ports[0].postMessage({
      success: true,
      deleted: deleted
    });
    
    console.log('[SW] 🗑️ Removed from cache:', data.url);
  } catch (error) {
    event.ports[0].postMessage({
      success: false,
      error: error.message
    });
  }
}

async function handleGetCachedUrls(event) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();
    const urls = requests.map(req => req.url);
    
    event.ports[0].postMessage({
      success: true,
      urls: urls
    });
  } catch (error) {
    event.ports[0].postMessage({
      success: false,
      error: error.message
    });
  }
}

function notifyClients(message) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage(message);
    });
  });
}
