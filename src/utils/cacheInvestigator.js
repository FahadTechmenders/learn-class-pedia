/**
 * Cache Investigator
 * Debug utility to investigate where cached files came from
 */

export async function investigateCachedFiles() {
  console.log('🔍 Starting Cache Investigation...\n');
  
  // 1. Check Service Worker Cache Storage
  if ('caches' in window) {
    const cache = await caches.open('manuscripts-v1');
    const requests = await cache.keys();
    const cachedUrls = requests.map(req => req.url);
    
    console.log(`📦 Cache Storage: ${cachedUrls.length} files`);
    
    const bookIds = cachedUrls.map(url => {
      const match = url.match(/\/books\/(\d+)\//);
      return match ? parseInt(match[1]) : null;
    }).filter(id => id !== null).sort((a, b) => a - b);
    
    console.log('Book IDs in Cache Storage:', bookIds);
    console.log('Unique books:', [...new Set(bookIds)]);
  }
  
  // 2. Check IndexedDB (old cache)
  try {
    const db = await openIndexedDB();
    const transaction = db.transaction(['manuscripts'], 'readonly');
    const store = transaction.objectStore('manuscripts');
    const allKeys = await getAllKeys(store);
    
    console.log(`\n💾 IndexedDB: ${allKeys.length} files`);
    console.log('Keys:', allKeys);
    
    db.close();
  } catch (error) {
    console.log('\n💾 IndexedDB: Not accessible or empty');
  }
  
  // 3. Check what would be sent to API
  if (navigator.serviceWorker && navigator.serviceWorker.controller) {
    const messageChannel = new MessageChannel();
    
    const promise = new Promise((resolve) => {
      messageChannel.port1.onmessage = (event) => {
        if (event.data.success) {
          const urls = event.data.urls || [];
          console.log(`\n📤 Would send to API: ${urls.length} cached URLs`);
          
          const bookIds = urls.map(url => {
            const match = url.match(/\/books\/(\d+)\//);
            return match ? parseInt(match[1]) : null;
          }).filter(id => id !== null).sort((a, b) => a - b);
          
          console.log('Book IDs that would be sent:', [...new Set(bookIds)]);
        }
        resolve();
      };
    });
    
    navigator.serviceWorker.controller.postMessage(
      { type: 'GET_CACHED_URLS' },
      [messageChannel.port2]
    );
    
    await promise;
  }
  
  console.log('\n✅ Investigation complete!');
}

function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ManuscriptCache', 2);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getAllKeys(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAllKeys();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Make available globally
if (typeof window !== 'undefined') {
  window.investigateCache = investigateCachedFiles;
  console.log('🛠️ Run window.investigateCache() to debug cache sources');
}
