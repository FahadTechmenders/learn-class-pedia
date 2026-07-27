/**
 * IndexedDB-based manuscript cache
 * Stores manuscripts as ArrayBuffers with metadata (createdAt, updatedAt)
 * IndexedDB can store hundreds of MB or even GB of data (much better than localStorage's 5-10MB limit)
 */

const DB_NAME = 'ManuscriptCache';
const DB_VERSION = 3;
const STORE_NAME = 'manuscripts';
const REQUIRED_STORES = [STORE_NAME];

let dbPromise = null;

/**
 * Create all required object stores
 */
function createStores(db) {
  if (!db.objectStoreNames.contains('manuscripts')) {
    const manuscripts = db.createObjectStore('manuscripts', { keyPath: 'cacheKey' });
    manuscripts.createIndex('bookId', 'bookId', { unique: false });
    manuscripts.createIndex('updatedAt', 'updatedAt', { unique: false });
  }

  if (!db.objectStoreNames.contains('files')) {
    const files = db.createObjectStore('files', { keyPath: 'url' });
    files.createIndex('timestamp', 'timestamp', { unique: false });
  }
}

/**
 * Open (or re-open) the IndexedDB connection
 */
function openDB(recreating = false) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[IndexedDBCache] Error opening database:', request.error);
      reject(request.error);
    };

    request.onupgradeneeded = (event) => {
      createStores(event.target.result);
    };

    request.onsuccess = () => {
      const db = request.result;
      const missing = REQUIRED_STORES.filter((name) => !db.objectStoreNames.contains(name));

      if (missing.length > 0 && !recreating) {
        console.warn(`[IndexedDBCache] Missing stores [${missing.join(', ')}], recreating database...`);
        db.close();

        const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
        deleteRequest.onsuccess = () => resolve(openDB(true));
        deleteRequest.onerror = () => reject(deleteRequest.error);
        deleteRequest.onblocked = () =>
          console.warn('[IndexedDBCache] Delete blocked by another tab');
      } else if (missing.length > 0 && recreating) {
        reject(new Error(`IndexedDB stores still missing after recreate: ${missing.join(', ')}`));
      } else {
        resolve(db);
      }
    };

    request.onblocked = () =>
      console.warn('[IndexedDBCache] Database upgrade blocked by another tab');
  });
}

/**
 * Initialize IndexedDB
 */
function initDB() {
  if (dbPromise) return dbPromise;

  dbPromise = openDB().catch((error) => {
    dbPromise = null;
    throw error;
  });

  return dbPromise;
}

/**
 * Get cached manuscript from IndexedDB
 */
export async function getCachedManuscript(cacheKey) {
  try {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.get(cacheKey);
      
      request.onsuccess = () => {
        if (request.result) {
          const sizeMB = (request.result.arrayBuffer.byteLength / 1024 / 1024).toFixed(2);
          resolve(request.result);
        } else {
          resolve(null);
        }
      };
      
      request.onerror = () => {
        console.error('[IndexedDBCache] Error reading cache:', request.error);
        resolve(null);
      };
    });
  } catch (error) {
    console.error('[IndexedDBCache] Error accessing database:', error);
    return null;
  }
}

/**
 * Save manuscript to IndexedDB
 */
export async function setCachedManuscript(cacheKey, arrayBuffer, metadata) {
  try {
    const startTime = performance.now();
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const dataToStore = {
      cacheKey,
      arrayBuffer,
      ...metadata,
      cachedAt: new Date().toISOString(),
      size: arrayBuffer.byteLength
    };
    
    return new Promise((resolve, reject) => {
      const request = store.put(dataToStore);
      
      request.onsuccess = () => {
        resolve(true);
      };
      
      request.onerror = () => {
        console.error('[IndexedDBCache] Error caching manuscript:', request.error);
        resolve(false);
      };
    });
  } catch (error) {
    console.error('[IndexedDBCache] Error saving to database:', error);
    return false;
  }
}

/**
 * Get manuscript metadata only
 */
export async function getManuscriptMetadata(cacheKey) {
  try {
    const cached = await getCachedManuscript(cacheKey);
    if (!cached) return null;
    
    const { arrayBuffer, ...metadata } = cached;
    return metadata;
  } catch (error) {
    console.error('[IndexedDBCache] Error reading metadata:', error);
    return null;
  }
}

/**
 * Check if manuscript needs update based on timestamps
 */
export async function needsUpdate(cacheKey, currentCreatedAt, currentUpdatedAt) {
  const metadata = await getManuscriptMetadata(cacheKey);
  
  if (!metadata) {
    return true; // Not cached, needs download
  }
  
  // Compare timestamps
  const cachedCreatedAt = new Date(metadata.createdAt).getTime();
  const cachedUpdatedAt = new Date(metadata.updatedAt).getTime();
  const newCreatedAt = new Date(currentCreatedAt).getTime();
  const newUpdatedAt = new Date(currentUpdatedAt).getTime();
  
  // Update if either timestamp is different
  const timestampsDifferent = cachedCreatedAt !== newCreatedAt || cachedUpdatedAt !== newUpdatedAt;
  
 
  
  return timestampsDifferent;
}

/**
 * Remove a specific cached manuscript
 */
export async function removeCachedManuscript(cacheKey) {
  try {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve) => {
      const request = store.delete(cacheKey);
      request.onsuccess = () => {
        resolve(true);
      };
      request.onerror = () => {
        console.error('[IndexedDBCache] Error removing cache:', request.error);
        resolve(false);
      };
    });
  } catch (error) {
    console.error('[IndexedDBCache] Error accessing database:', error);
    return false;
  }
}

/**
 * Clear all manuscript cache
 */
export async function clearAllManuscriptCache() {
  try {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve) => {
      const request = store.clear();
      request.onsuccess = () => {
        resolve(true);
      };
      request.onerror = () => {
        console.error('[IndexedDBCache] Error clearing cache:', request.error);
        resolve(false);
      };
    });
  } catch (error) {
    console.error('[IndexedDBCache] Error accessing database:', error);
    return false;
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats() {
  try {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve) => {
      const request = store.getAll();
      
      request.onsuccess = () => {
        const entries = request.result || [];
        let totalSize = 0;
        
        entries.forEach(entry => {
          if (entry.size) {
            totalSize += entry.size;
          }
        });
        
        resolve({
          totalFiles: entries.length,
          totalSize,
          totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
          entries: entries.map(e => ({
            cacheKey: e.cacheKey,
            bookId: e.bookId,
            filename: e.filename,
            size: e.size,
            cachedAt: e.cachedAt
          }))
        });
      };
      
      request.onerror = () => {
        console.error('[IndexedDBCache] Error getting stats:', request.error);
        resolve({
          totalFiles: 0,
          totalSize: 0,
          totalSizeMB: '0.00',
          entries: []
        });
      };
    });
  } catch (error) {
    console.error('[IndexedDBCache] Error accessing database:', error);
    return {
      totalFiles: 0,
      totalSize: 0,
      totalSizeMB: '0.00',
      entries: []
    };
  }
}

/**
 * Get all cached manuscript URLs and their updatedAt values
 */
export async function getAllCachedUrls() {
  try {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve) => {
      const request = store.getAll();

      request.onsuccess = () => {
        const entries = request.result || [];
        const cachedUrls = entries
          .filter(entry => entry.manuscriptUrl || entry.manuscriptFilePath)
          .map(entry => ({
            fileUrl: entry.manuscriptUrl || entry.manuscriptFilePath,
            updatedAt: entry.updatedAt || entry.cachedAt,
            cacheKey: entry.cacheKey
          }));
        resolve(cachedUrls);
      };

      request.onerror = () => {
        console.error('[IndexedDBCache] Error getting cached URLs:', request.error);
        resolve([]);
      };
    });
  } catch (error) {
    console.error('[IndexedDBCache] Error accessing database:', error);
    return [];
  }
}
