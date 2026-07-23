/**
 * Manuscript Preloader Service
 * Preloads all book manuscripts on login and caches them in IndexedDB
 * Tracks createdAt and updatedAt to invalidate stale cache entries
 */

import ApiService from './ApiService';
import { ENDPOINTS } from '../config/api';
import { 
  setCachedManuscript, 
  needsUpdate as checkNeedsUpdate 
} from '../utils/indexedDBCache';

// Configuration
const PRELOADER_CONFIG = {
  BATCH_SIZE: 5,        // Number of books to process before pausing
  BATCH_DELAY: 2000,    // Delay in milliseconds between batches (2 seconds)
  PAGE_SIZE: 100        // Number of books to fetch per API call
};

/**
 * Convert relative file path to full URL
 */
function getFullManuscriptUrl(filePath) {
  if (!filePath) return null;
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
  return `https://cdn.classpedia.ai/${filePath}`;
}

/**
 * Download manuscript file with progress tracking
 */
async function downloadManuscript(book, onProgress = null) {
  const filePath = book.manuscriptFilePath;
  const filename = book.manuscriptFilename || '';
  
  if (!filePath) {
    console.warn('[ManuscriptPreloader] No manuscript file path for book:', book.id);
    return null;
  }
  
  // Convert to full URL
  const url = getFullManuscriptUrl(filePath);
  
  if (!url) {
    console.warn('[ManuscriptPreloader] Could not generate URL for book:', book.id);
    return null;
  }
  
  const ext = (filename.split('.').pop() || '').toLowerCase();
  
  try {
    // Download the file
    console.log(`[ManuscriptPreloader] 📥 Downloading manuscript for book ${book.id} (${ext.toUpperCase()})`);
    console.log(`[ManuscriptPreloader] URL: ${url}`);
    const startTime = performance.now();
    
    const token = localStorage.getItem('adminToken');
    const totalSize = await getFileSize(url, token);
    
    let arrayBuffer;
    
    if (ext === 'pdf') {
      arrayBuffer = await downloadPDFInChunks(url, token, totalSize, onProgress);
    } else {
      arrayBuffer = await downloadCompleteFile(url, token, totalSize, onProgress);
    }
    
    const loadTime = ((performance.now() - startTime) / 1000).toFixed(1);
    const sizeMB = (arrayBuffer.byteLength / 1024 / 1024).toFixed(2);
    console.log(`[ManuscriptPreloader] ✅ Downloaded book ${book.id}: ${sizeMB} MB in ${loadTime}s`);
    
    return arrayBuffer;
  } catch (error) {
    console.error(`[ManuscriptPreloader] ❌ Failed to download book ${book.id}:`, error);
    return null;
  }
}

/**
 * Get file size
 */
async function getFileSize(url, token) {
  try {
    const response = await fetch(
      `${process.env.REACT_APP_API_URL || 'https://adminapi.classpedia.ai/api'}${ENDPOINTS.BOOK_FILE_INFO(url)}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to get file size: ${response.status}`);
    }
    
    const data = await response.json();
    return data.fileSize || 0;
  } catch (error) {
    console.error('[ManuscriptPreloader] Failed to get file size:', error);
    throw error;
  }
}

/**
 * Download PDF in chunks
 */
async function downloadPDFInChunks(url, token, totalSize, onProgress = null) {
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB
  const allChunks = [];
  let downloadedBytes = 0;
  
  const numChunks = Math.ceil(totalSize / CHUNK_SIZE);
  
  for (let i = 0; i < numChunks; i++) {
    const startBytes = i * CHUNK_SIZE;
    const endBytes = Math.min(startBytes + CHUNK_SIZE - 1, totalSize - 1);
    
    const response = await fetch(
      `${process.env.REACT_APP_API_URL || 'https://adminapi.classpedia.ai/api'}${ENDPOINTS.BOOK_FILE_CHUNK(url, startBytes, endBytes)}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/octet-stream, */*'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const chunkData = await response.arrayBuffer();
    allChunks.push(new Uint8Array(chunkData));
    downloadedBytes += chunkData.byteLength;
    
    const progress = Math.round((downloadedBytes / totalSize) * 100);
    if (onProgress) {
      onProgress(progress);
    }
  }
  
  const completeFile = new Uint8Array(downloadedBytes);
  let offset = 0;
  for (const chunk of allChunks) {
    completeFile.set(chunk, offset);
    offset += chunk.length;
  }
  
  return completeFile.buffer;
}

/**
 * Download complete file
 */
async function downloadCompleteFile(url, token, totalSize, onProgress = null) {
  const response = await fetch(
    `${process.env.REACT_APP_API_URL || 'https://adminapi.classpedia.ai/api'}${ENDPOINTS.BOOK_FILE_CHUNK(url, 0, totalSize - 1)}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/octet-stream, */*'
      }
    }
  );
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const contentLength = response.headers.get('Content-Length');
  const bytes = contentLength ? parseInt(contentLength, 10) : totalSize;
  
  if (response.body) {
    const reader = response.body.getReader();
    const chunks = [];
    let receivedBytes = 0;
    let lastProgressUpdate = 0;
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      chunks.push(value);
      receivedBytes += value.length;
      
      const progress = Math.round((receivedBytes / bytes) * 100);
      if (onProgress && progress - lastProgressUpdate >= 5) {
        onProgress(progress);
        lastProgressUpdate = progress;
      }
    }
    
    const arrayBuffer = new Uint8Array(receivedBytes);
    let offset = 0;
    for (const chunk of chunks) {
      arrayBuffer.set(chunk, offset);
      offset += chunk.length;
    }
    
    if (onProgress) onProgress(100);
    return arrayBuffer.buffer;
  } else {
    const arrayBuffer = await response.arrayBuffer();
    if (onProgress) onProgress(100);
    return arrayBuffer;
  }
}

/**
 * Preload a single book manuscript
 */
export async function preloadBookManuscript(book, onProgress = null) {
  try {
    const bookId = book.id;
    const createdAt = book.createdAt || book.created_at;
    const updatedAt = book.updatedAt || book.updated_at;
    const filePath = book.manuscriptFilePath;
    const filename = book.manuscriptFilename || '';
    
    if (!filePath) {
      console.log(`[ManuscriptPreloader] Skipping book ${bookId} - no manuscript file path`);
      return { success: false, reason: 'no_manuscript' };
    }
    
    // Extract extension from filename or URL
    let ext = '';
    if (filename) {
      ext = (filename.split('.').pop() || '').toLowerCase();
    } else {
      // Extract from URL if no filename
      ext = (filePath.split('.').pop() || '').toLowerCase();
    }
    
    if (!ext || !['epub', 'pdf', 'docx', 'doc'].includes(ext)) {
      console.warn(`[ManuscriptPreloader] Skipping book ${bookId} - unsupported file type: ${ext}`);
      return { success: false, reason: 'unsupported_type' };
    }
    
    const cacheKey = `book_${bookId}_${ext}`;
    
    // Check if we need to update based on timestamps
    const needsDownload = await checkNeedsUpdate(cacheKey, createdAt, updatedAt);
    
    if (!needsDownload) {
      console.log(`[ManuscriptPreloader] ✅ Book ${bookId} (${filename}) - Already cached, skipping`);
      return { success: true, reason: 'already_cached' };
    }
    
    console.log(`[ManuscriptPreloader] 📥 Book ${bookId} (${filename}) - Downloading...`);
    
    // Download the manuscript
    const arrayBuffer = await downloadManuscript(book, onProgress);
    
    if (arrayBuffer) {
      // Save to localStorage with metadata
      const manuscriptUrl = getFullManuscriptUrl(filePath);
      const metadata = {
        bookId,
        createdAt,
        updatedAt,
        manuscriptUrl,
        manuscriptFilePath: filePath,
        filename
      };
      
      const saved = await setCachedManuscript(cacheKey, arrayBuffer, metadata);
      
      if (saved) {
        console.log(`[ManuscriptPreloader] ✅ Book ${bookId} - Saved to IndexedDB`);
        return { success: true, reason: 'downloaded' };
      } else {
        console.warn(`[ManuscriptPreloader] ⚠️ Book ${bookId} - Failed to save to IndexedDB`);
        return { success: false, reason: 'cache_failed' };
      }
    } else {
      console.error(`[ManuscriptPreloader] ❌ Book ${bookId} - Download failed`);
      return { success: false, reason: 'download_failed' };
    }
  } catch (error) {
    console.error('[ManuscriptPreloader] Error preloading book:', error);
    return { success: false, reason: 'error', error };
  }
}

/**
 * Fetch all books with pagination
 */
async function fetchAllBooks() {
  const allBooks = [];
  let currentPage = 1;
  const pageSize = PRELOADER_CONFIG.PAGE_SIZE;
  let hasMorePages = true;
  
  console.log('[ManuscriptPreloader] 📚 Fetching all books with pagination...');
  
  while (hasMorePages) {
    try {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString()
      });
      
      const response = await ApiService.get(`${ENDPOINTS.BOOK_ALL}?${queryParams}`);
      const responseData = response?.data || response;
      const items = responseData?.items || [];
      const totalCount = responseData?.totalCount || 0;
      
      console.log(`[ManuscriptPreloader] Page ${currentPage}: ${items.length} books (Total: ${totalCount})`);
      
      // Debug: log first book structure
      if (items.length > 0 && currentPage === 1) {
        console.log('[ManuscriptPreloader] Sample book structure:', {
          id: items[0].id,
          title: items[0].title,
          manuscriptFilePath: items[0].manuscriptFilePath,
          manuscriptFilename: items[0].manuscriptFilename,
          keys: Object.keys(items[0])
        });
      }
      
      if (items.length > 0) {
        allBooks.push(...items);
      }
      
      // Check if there are more pages
      const totalPages = Math.ceil(totalCount / pageSize);
      hasMorePages = currentPage < totalPages;
      currentPage++;
      
    } catch (error) {
      console.error(`[ManuscriptPreloader] Error fetching page ${currentPage}:`, error);
      hasMorePages = false;
    }
  }
  
  console.log(`[ManuscriptPreloader] ✅ Fetched ${allBooks.length} total books`);
  return allBooks;
}

/**
 * Sleep utility for delays
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Preload all books manuscripts with batch processing
 */
export async function preloadAllManuscripts(onProgress = null, onBookComplete = null) {
  try {
    console.log('[ManuscriptPreloader] 🚀 Starting manuscript preload...');
    
    // Fetch all books with pagination
    const books = await fetchAllBooks();
    
    console.log(`[ManuscriptPreloader] Found ${books.length} books to process`);
    
    if (books.length === 0) {
      return { success: true, total: 0, downloaded: 0, cached: 0, skipped: 0 };
    }
    
    let downloaded = 0;
    let cached = 0;
    let skipped = 0;
    let failed = 0;
    
    // Process books in batches to avoid overwhelming the browser and server
    for (let i = 0; i < books.length; i++) {
      try {
        const book = books[i];
        
        console.log(`[ManuscriptPreloader] Processing book ${i + 1}/${books.length}: ${book.id}`);
        
        const bookProgress = (progress) => {
          const overallProgress = ((i + progress / 100) / books.length) * 100;
          if (onProgress) onProgress(Math.round(overallProgress));
        };
        
        const result = await preloadBookManuscript(book, bookProgress);
        
        if (result.success) {
          if (result.reason === 'downloaded') {
            downloaded++;
          } else if (result.reason === 'already_cached') {
            cached++;
          }
        } else {
          if (result.reason === 'no_manuscript') {
            skipped++;
          } else {
            failed++;
            console.error(`[ManuscriptPreloader] Book ${book.id} failed:`, result);
          }
        }
        
        if (onBookComplete) {
          onBookComplete({
            bookId: book.id,
            bookTitle: book.title,
            current: i + 1,
            total: books.length,
            result
          });
        }
        
        // Add delay after every batch to prevent lag
        if ((i + 1) % PRELOADER_CONFIG.BATCH_SIZE === 0 && (i + 1) < books.length) {
          console.log(`[ManuscriptPreloader] ⏸️ Processed ${i + 1}/${books.length} books, pausing for ${PRELOADER_CONFIG.BATCH_DELAY}ms...`);
          console.log(`[ManuscriptPreloader] Stats so far: ${downloaded} downloaded, ${cached} cached, ${skipped} skipped, ${failed} failed`);
          await sleep(PRELOADER_CONFIG.BATCH_DELAY);
          console.log(`[ManuscriptPreloader] ▶️ Resuming preload... (${books.length - i - 1} books remaining)`);
        }
      } catch (error) {
        console.error(`[ManuscriptPreloader] ❌ Critical error processing book ${i + 1}:`, error);
        failed++;
        // Continue with next book instead of stopping
      }
    }
    
    console.log(`[ManuscriptPreloader] ✅ Preload complete: ${downloaded} downloaded, ${cached} cached, ${skipped} skipped, ${failed} failed`);
    
    return {
      success: true,
      total: books.length,
      downloaded,
      cached,
      skipped,
      failed
    };
  } catch (error) {
    console.error('[ManuscriptPreloader] ❌ Preload failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Clear all manuscript cache from localStorage
 */
export function clearManuscriptCache() {
  try {
    const allKeys = Object.keys(localStorage);
    const manuscriptKeys = allKeys.filter(key => 
      key.startsWith('manuscript_') || key.startsWith('manuscript_meta_')
    );
    
    manuscriptKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log(`[ManuscriptPreloader] ✅ Manuscript cache cleared (${manuscriptKeys.length} items)`);
    return true;
  } catch (error) {
    console.error('[ManuscriptPreloader] Error clearing cache:', error);
    return false;
  }
}
