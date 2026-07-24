/**
 * Manuscript Preloader Service
 * Preloads all book manuscripts on login and caches them in IndexedDB
 * Tracks createdAt and updatedAt to invalidate stale cache entries
 */

import ApiService from './ApiService';
import { API_CONFIG, ENDPOINTS } from '../config/api';
import { 
  setCachedManuscript, 
  needsUpdate as checkNeedsUpdate,
  getAllCachedUrls
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
async function downloadManuscript(fileInfo, onProgress = null) {
  const url = fileInfo.fileUrl;
  const filename = fileInfo.filename || '';
  const ext = fileInfo.ext || (filename.split('.').pop() || '').toLowerCase();
  
  if (!url) {
    console.warn('[ManuscriptPreloader] No manuscript URL for:', fileInfo.bookId || url);
    return null;
  }
  
  try {
    const startTime = performance.now();
    
    const token = localStorage.getItem('adminToken');
    const totalSize = await getFileSize(url, token);
    
    let arrayBuffer;
    
    if (ext === 'pdf') {
      arrayBuffer = await downloadPDFInChunks(url, token, totalSize, onProgress);
    } else {
      arrayBuffer = await downloadCompleteFile(url, token, totalSize, onProgress);
    }
    
    return arrayBuffer;
  } catch (error) {
    console.error(`[ManuscriptPreloader] ❌ Failed to download manuscript:`, error);
    return null;
  }
}

/**
 * Extract book ID from a manuscript URL if it follows the /books/{id}/manuscript/ pattern
 */
function extractBookIdFromUrl(fileUrl) {
  if (!fileUrl) return null;
  const match = fileUrl.match(/\/books\/(\d+)\//i);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return null;
}

/**
 * Get file size
 */
async function getFileSize(url, token) {
  try {
    const response = await fetch(
      `${API_CONFIG.BASE_URL}${ENDPOINTS.BOOK_FILE_INFO(url)}`,
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
      `${API_CONFIG.BASE_URL}${ENDPOINTS.BOOK_FILE_CHUNK(url, startBytes, endBytes)}`,
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
    `${API_CONFIG.BASE_URL}${ENDPOINTS.BOOK_FILE_CHUNK(url, 0, totalSize - 1)}`,
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
export async function preloadBookManuscript(fileInfo, onProgress = null) {
  try {
    const fileUrl = fileInfo.fileUrl || (fileInfo.manuscriptFilePath ? getFullManuscriptUrl(fileInfo.manuscriptFilePath) : null);
    const updatedAt = fileInfo.updatedAt || fileInfo.updated_at;
    const createdAt = fileInfo.createdAt || fileInfo.created_at || updatedAt;
    const bookId = fileInfo.bookId || fileInfo.id || extractBookIdFromUrl(fileUrl);
    const filename = fileInfo.filename || fileInfo.manuscriptFilename || (fileUrl ? fileUrl.substring(fileUrl.lastIndexOf('/') + 1) : '');
    
    if (!fileUrl) {
      return { success: false, reason: 'no_manuscript' };
    }
    
    // Extract extension from filename or URL
    let ext = '';
    if (filename) {
      ext = (filename.split('.').pop() || '').toLowerCase();
    } else {
      // Extract from URL if no filename
      ext = (fileUrl.split('.').pop() || '').toLowerCase();
    }
    
    if (!ext || !['epub', 'pdf', 'docx', 'doc'].includes(ext)) {
      console.warn(`[ManuscriptPreloader] Skipping - unsupported file type: ${ext}`);
      return { success: false, reason: 'unsupported_type' };
    }
    
    const cacheKey = `book_${bookId}_${ext}`;
    
    // Check if we need to update based on timestamps
    const needsDownload = await checkNeedsUpdate(cacheKey, createdAt, updatedAt);
    
    if (!needsDownload) {
      return { success: true, reason: 'already_cached' };
    }
    
    // Download the manuscript
    const arrayBuffer = await downloadManuscript({ fileUrl, filename, ext, bookId }, onProgress);
    
    if (arrayBuffer) {
      // Save to IndexedDB with metadata
      const metadata = {
        bookId,
        createdAt,
        updatedAt,
        manuscriptUrl: fileUrl,
        manuscriptFilePath: fileInfo.manuscriptFilePath || fileUrl,
        filename
      };
      
      const saved = await setCachedManuscript(cacheKey, arrayBuffer, metadata);
      
      if (saved) {
        return { success: true, reason: 'downloaded' };
      } else {
        console.warn(`[ManuscriptPreloader] ⚠️ - Failed to save to IndexedDB`);
        return { success: false, reason: 'cache_failed' };
      }
    } else {
      console.error(`[ManuscriptPreloader] ❌ - Download failed`);
      return { success: false, reason: 'download_failed' };
    }
  } catch (error) {
    console.error('[ManuscriptPreloader] Error preloading book:', error);
    return { success: false, reason: 'error', error };
  }
}

/**
 * Fetch uncached file URLs from server
 */
async function fetchUncachedFileUrls() {
  
  try {
    const cachedEntries = await getAllCachedUrls();
    const fileUrls = cachedEntries.map(entry => entry.fileUrl);
    
    const sortedUpdatedAt = cachedEntries
      .map(entry => entry.updatedAt)
      .filter(Boolean)
      .map(date => new Date(date).getTime())
      .filter(time => !isNaN(time))
      .sort((a, b) => b - a);
    
    const latestUpdatedAt = sortedUpdatedAt.length > 0
      ? new Date(sortedUpdatedAt[0]).toISOString()
      : new Date(0).toISOString();
    
    const payload = {
      fileUrls,
      updatedAt: latestUpdatedAt
    };
    
    const response = await ApiService.post(ENDPOINTS.BOOK_FILE_URLS, payload);
    const responseData = response?.data || response || {};
    const fileUrlItems = responseData?.fileUrls || [];
    return fileUrlItems;
  } catch (error) {
    console.error('[ManuscriptPreloader] Error fetching uncached file URLs:', error);
    return [];
  }
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
    
    // Fetch only uncached/changed file URLs from server
    const fileUrlItems = await fetchUncachedFileUrls();
    
    if (fileUrlItems.length === 0) {
      return { success: true, total: 0, downloaded: 0, cached: 0, skipped: 0, failed: 0 };
    }
    
    let downloaded = 0;
    let cached = 0;
    let skipped = 0;
    let failed = 0;
    
    // Process files in batches to avoid overwhelming the browser and server
    for (let i = 0; i < fileUrlItems.length; i++) {
      try {
        const item = fileUrlItems[i];
        const fileUrl = item.fileUrl || item;
        const updatedAt = item.updatedAt;
        const filename = fileUrl ? fileUrl.substring(fileUrl.lastIndexOf('/') + 1) : '';
        const bookId = extractBookIdFromUrl(fileUrl);
        
        const fileProgress = (progress) => {
          const overallProgress = ((i + progress / 100) / fileUrlItems.length) * 100;
          if (onProgress) onProgress(Math.round(overallProgress));
        };
        
        const fileInfo = {
          fileUrl,
          updatedAt,
          filename,
          bookId
        };
        
        const result = await preloadBookManuscript(fileInfo, fileProgress);
        
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
            console.error(`[ManuscriptPreloader] File ${filename} failed:`, result);
          }
        }
        
        if (onBookComplete) {
          onBookComplete({
            bookId,
            bookTitle: filename,
            current: i + 1,
            total: fileUrlItems.length,
            result
          });
        }
        
        // Add delay after every batch to prevent lag
        if ((i + 1) % PRELOADER_CONFIG.BATCH_SIZE === 0 && (i + 1) < fileUrlItems.length) {
         
          await sleep(PRELOADER_CONFIG.BATCH_DELAY);
         
        }
      } catch (error) {
        console.error(`[ManuscriptPreloader] ❌ Critical error processing file ${i + 1}:`, error);
        failed++;
        // Continue with next file instead of stopping
      }
    }
    
    return {
      success: true,
      total: fileUrlItems.length,
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
    return true;
  } catch (error) {
    console.error('[ManuscriptPreloader] Error clearing cache:', error);
    return false;
  }
}
