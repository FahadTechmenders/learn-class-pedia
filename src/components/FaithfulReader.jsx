import React, { useEffect, useRef, useState, useCallback } from 'react';
import ePub from 'epubjs';
import { renderAsync } from 'docx-preview';
import * as pdfjsLib from 'pdfjs-dist';
import { Loader2, FileText, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { ENDPOINTS, API_CONFIG } from '../config/api';
import { getCachedFile, setCachedFile } from '../utils/fileCache';
import { getCachedManuscript } from '../utils/indexedDBCache';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

// Request deduplication cache to prevent multiple simultaneous fetches
const requestCache = new Map();

function playPageFlipSound() {
  if (typeof window === 'undefined') return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const duration = 0.18;
    const buf = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / ctx.sampleRate;
      const env = Math.exp(-t * 28);
      data[i] = (Math.random() * 2 - 1) * env * 0.55
        + Math.sin(2 * Math.PI * 120 * t) * Math.exp(-t * 60) * 0.3;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.9, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start();
    src.stop(ctx.currentTime + duration);
  } catch (_) {}
}

// Helper function to get file size using the dedicated file-info endpoint
async function getFileSize(url) {
  try {
    const token = localStorage.getItem('adminToken');
    console.log('[FaithfulReader] Getting file size for:', url);
    
    const response = await fetch(
      `${API_CONFIG.BASE_URL}${ENDPOINTS.BOOK_FILE_INFO(url)}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      }
    );
    
    console.log('[FaithfulReader] Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('[FaithfulReader] Failed to get file size:', response.status, errorText);
      throw new Error(`Failed to get file size: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('[FaithfulReader] File info response:', data);
    
    if (typeof data.fileSize === 'number' && data.fileSize > 0) {
      console.log(`[FaithfulReader] File size: ${data.fileSize} bytes (${(data.fileSize / 1024 / 1024).toFixed(2)} MB)`);
      return data.fileSize;
    }
    
    console.error('[FaithfulReader] No fileSize present in file-info response');
    throw new Error('Unable to determine file size - missing fileSize in file-info response');
  } catch (error) {
    console.error('[FaithfulReader] Failed to get file size:', error);
    throw error;
  }
}

// Download PDF file in chunks (5MB limit)
async function downloadPDFInChunks(url, onProgress = null) {
  try {
    const token = localStorage.getItem('adminToken');
    const totalSize = await getFileSize(url);
    
    console.log(`[FaithfulReader] Downloading PDF file: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB for PDF
    const allChunks = [];
    let downloadedBytes = 0;
    
    const numChunks = Math.ceil(totalSize / CHUNK_SIZE);
    console.log(`[FaithfulReader] Downloading in ${numChunks} chunks of ${(CHUNK_SIZE / 1024 / 1024).toFixed(2)} MB each`);
    
    for (let i = 0; i < numChunks; i++) {
      const startBytes = i * CHUNK_SIZE;
      const endBytes = Math.min(startBytes + CHUNK_SIZE - 1, totalSize - 1);
      
      console.log(`[FaithfulReader] Downloading chunk ${i + 1}/${numChunks}: bytes ${startBytes}-${endBytes}`);
      
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
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('[FaithfulReader] Chunk download failed:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const chunkData = await response.arrayBuffer();
      allChunks.push(new Uint8Array(chunkData));
      downloadedBytes += chunkData.byteLength;
      
      const progress = Math.round((downloadedBytes / totalSize) * 100);
      if (onProgress) {
        onProgress(progress);
      }
      
      console.log(`[FaithfulReader] Chunk ${i + 1}/${numChunks} complete: ${(chunkData.byteLength / 1024 / 1024).toFixed(2)} MB (${progress}% total)`);
    }
    
    console.log(`[FaithfulReader] Combining ${numChunks} chunks...`);
    const completeFile = new Uint8Array(downloadedBytes);
    let offset = 0;
    for (const chunk of allChunks) {
      completeFile.set(chunk, offset);
      offset += chunk.length;
    }
    
    if (onProgress) onProgress(100);
    console.log(`[FaithfulReader] ✅ Successfully downloaded and combined ${(downloadedBytes / 1024 / 1024).toFixed(2)} MB`);
    return completeFile.buffer;
  } catch (error) {
    console.error('[FaithfulReader] Failed to download PDF in chunks:', error);
    throw error;
  }
}

// Download EPUB/DOCX file in single request (backend handles it)
async function downloadCompleteFile(url, onProgress = null) {
  try {
    const token = localStorage.getItem('adminToken');
    const totalSize = await getFileSize(url);
    
    console.log(`[FaithfulReader] Downloading complete file: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    
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
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('[FaithfulReader] Download failed:', response.status, errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    console.log(`[FaithfulReader] Response status: ${response.status} ${response.statusText}`);
    
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
      console.log(`[FaithfulReader] ✅ Successfully downloaded ${receivedBytes} bytes`);
      return arrayBuffer.buffer;
    } else {
      const arrayBuffer = await response.arrayBuffer();
      if (onProgress) onProgress(100);
      console.log(`[FaithfulReader] ✅ Successfully downloaded ${arrayBuffer.byteLength} bytes`);
      return arrayBuffer;
    }
  } catch (error) {
    console.error('[FaithfulReader] Failed to download complete file:', error);
    throw error;
  }
}

async function getArrayBuffer(book, onProgress = null) {
   
  const file = book?.manuscriptFile;
  if (file && typeof file.arrayBuffer === 'function') {
    return await file.arrayBuffer();
  }
  
  // Get manuscript URL - check multiple possible field names
  let url = book?.manuscript_url || book?.manuscriptUrl;
  
  // If no URL but we have manuscriptFilePath, convert it to full URL
  if (!url && book?.manuscriptFilePath) {
    const filePath = book.manuscriptFilePath;
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      url = filePath;
    } else {
      url = `https://cdn.classpedia.ai/${filePath}`;
    }
  }
  
  if (!url) return null;
  
  // Determine file extension
  const filename = book?.manuscript_filename || book?.manuscriptFilename || '';
  const filePath = book?.manuscriptFilePath || '';
  
  // Extract extension from filename, or from filePath, or from URL
  let ext = '';
  if (filename) {
    ext = (filename.split('.').pop() || '').toLowerCase();
  } else if (filePath) {
    ext = (filePath.split('.').pop() || '').toLowerCase();
  } else {
    ext = (url.split('.').pop() || '').toLowerCase();
  }
  
  // Remove query parameters from extension if present
  ext = ext.split('?')[0];
  
  // Get book ID - try from book object first, then extract from URL
  let bookId = book?.id;
  if (!bookId && url) {
    // Extract book ID from URL pattern: /books/{id}/manuscript/
    const match = url.match(/\/books\/(\d+)\//i);
    if (match && match[1]) {
      bookId = parseInt(match[1], 10);
      console.log(`[FaithfulReader] Extracted book ID from URL: ${bookId}`);
    }
  }
  
  // Use book ID for IndexedDB cache key (same as preloader)
  const localStorageCacheKey = `book_${bookId}_${ext}`;
  const indexedDBCacheKey = `${url}_${ext}`;
  
  console.log(`[FaithfulReader] ========== CACHE LOOKUP ==========`);
  console.log(`[FaithfulReader] Book ID: ${bookId}`);
  console.log(`[FaithfulReader] Filename: ${filename}`);
  console.log(`[FaithfulReader] FilePath: ${filePath}`);
  console.log(`[FaithfulReader] URL: ${url}`);
  console.log(`[FaithfulReader] Extension: ${ext}`);
  console.log(`[FaithfulReader] Cache Key: ${localStorageCacheKey}`);
  console.log(`[FaithfulReader] ===================================`);
  
  // Return existing promise if request is already in flight
  if (requestCache.has(localStorageCacheKey)) {
    console.log(`[FaithfulReader] Reusing in-flight request for ${ext.toUpperCase()}`);
    return requestCache.get(localStorageCacheKey);
  }
  
  // Create new request promise
  const requestPromise = (async () => {
    try {
      // Check IndexedDB cache first (from preloader)
      console.log(`[FaithfulReader] ========== STARTING CACHE CHECK ==========`);
      console.log(`[FaithfulReader] bookId exists: ${!!bookId}`);
      console.log(`[FaithfulReader] Cache key to lookup: ${localStorageCacheKey}`);
      
      if (bookId) {
        console.log(`[FaithfulReader] Calling getCachedManuscript(${localStorageCacheKey})...`);
        const cachedManuscript = await getCachedManuscript(localStorageCacheKey);
        console.log(`[FaithfulReader] getCachedManuscript returned:`, cachedManuscript ? 'DATA FOUND' : 'NULL');
        
        if (cachedManuscript) {
          console.log(`[FaithfulReader] ✅ ✅ ✅ CACHE HIT! Using cached ${ext.toUpperCase()} from IndexedDB`);
          console.log(`[FaithfulReader] ArrayBuffer size: ${cachedManuscript.arrayBuffer?.byteLength || 'N/A'} bytes`);
          if (onProgress) onProgress(100);
          return cachedManuscript.arrayBuffer;
        } else {
          console.log(`[FaithfulReader] ❌ ❌ ❌ CACHE MISS for ${localStorageCacheKey}`);
          console.log(`[FaithfulReader] Will proceed to download from backend...`);
        }
      } else {
        console.log(`[FaithfulReader] ❌ No bookId - skipping preloader cache check`);
      }
      console.log(`[FaithfulReader] ========== CACHE CHECK COMPLETE ==========`);
      console.log('');
      
      // Check IndexedDB cache (legacy)
      const cachedData = await getCachedFile(indexedDBCacheKey);
      if (cachedData) {
        console.log(`[FaithfulReader] ✅ Using cached ${ext.toUpperCase()} from IndexedDB`);
        if (onProgress) onProgress(100);
        return cachedData;
      }
      
      console.log(`[FaithfulReader] 📥 Fetching ${ext.toUpperCase()} file`);
      const startTime = performance.now();
      
      let arrayBuffer;
      
      // EPUB files - single request (backend returns complete file)
      if (ext === 'epub') {
        console.log('[FaithfulReader] 📚 Downloading complete EPUB file (ZIP format)');
        arrayBuffer = await downloadCompleteFile(url, onProgress);
      }
      // PDF files - chunked download (5MB chunks due to backend limit)
      else if (ext === 'pdf') {
        console.log('[FaithfulReader] 📄 Downloading PDF file in chunks');
        arrayBuffer = await downloadPDFInChunks(url, onProgress);
      }
      // DOCX files - single request
      else if (ext === 'docx' || ext === 'doc') {
        arrayBuffer = await downloadCompleteFile(url, onProgress);
      }
      else {
        throw new Error(`Unsupported file type: ${ext}`);
      }
      
      const loadTime = ((performance.now() - startTime) / 1000).toFixed(1);
      const sizeMB = (arrayBuffer.byteLength / 1024 / 1024).toFixed(2);
      const speedMBps = (arrayBuffer.byteLength / 1024 / 1024 / (loadTime || 1)).toFixed(1);
      
      
      // Cache in IndexedDB asynchronously
      setCachedFile(indexedDBCacheKey, arrayBuffer).catch(err => {
        console.warn('[FaithfulReader] ⚠️ Failed to cache file:', err);
      });
      
      if (onProgress) onProgress(100);
      return arrayBuffer;
      
    } catch (error) {
      console.error('[FaithfulReader] ❌ Fetch failed:', error);
      throw new Error(`Failed to load manuscript: ${error.message}`);
    } finally {
      // Clean up request cache after completion
      setTimeout(() => requestCache.delete(localStorageCacheKey), 1000);
    }
  })();
  
  requestCache.set(localStorageCacheKey, requestPromise);
  return requestPromise;
}

function fileExtension(book) {
  const name = book?.manuscript_filename || book?.manuscriptFilename || book?.manuscriptFile?.name || '';
  return (name.split('.').pop() || '').toLowerCase();
}

function CenterMessage({ icon: Icon = FileText, title, subtitle = null, spin = false, progress = null }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-center px-8 bg-slate-100">
      <Icon className={`w-8 h-8 text-slate-400 ${spin ? 'animate-spin' : ''}`} />
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      {subtitle && <p className="text-xs text-slate-400 max-w-[280px] leading-relaxed">{subtitle}</p>}
      {progress !== null && progress >= 0 && (
        <div className="w-full max-w-[280px] mt-2">
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-300 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-1.5 font-medium">{Math.round(progress)}%</p>
        </div>
      )}
    </div>
  );
}

function CoverPage({ book }) {
  return (
    <div className="w-full h-full relative overflow-hidden select-none">
      {book.cover_url ? (
        <img src={book.cover_url} alt="Cover" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex flex-col bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950">
          <div className="absolute inset-0"
            style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(99,102,241,0.35) 0%, transparent 55%), radial-gradient(circle at 75% 75%, rgba(14,165,233,0.2) 0%, transparent 50%)' }} />
          <div className="flex-1 flex flex-col items-center justify-center px-8 text-center relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center mb-8 shadow-2xl">
              <FileText className="w-8 h-8 text-white/80" />
            </div>
            <h1 className="text-2xl font-bold text-white leading-tight mb-4 drop-shadow-lg">
              {book.title || 'Your Book Title'}
            </h1>
            {book.subtitle && <p className="text-sm text-white/50 leading-relaxed italic">{book.subtitle}</p>}
          </div>
          <div className="relative z-10 px-8 pb-10 text-center">
            <div className="w-12 h-px bg-white/20 mx-auto mb-5" />
            <p className="text-sm font-semibold text-white/80 tracking-wide">{book.author_name || 'Author Name'}</p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <div className="w-3 h-3 rounded-full bg-indigo-400/80" />
              <p className="text-[10px] text-white/30 uppercase tracking-[0.25em]">Classpedia</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Resolve image sources inside an EPUB section to archive blob URLs.
// epub.js's default string-substitution reliably rewrites <img src> but often
// misses SVG <image xlink:href> used by EPUB 2.0 "image-based text" books, so
// those pages render as broken images. This walks the section document (before
// serialization) and replaces both <img src> and SVG <image href/xlink:href>
// with blob: URLs created straight from the zip archive.
async function resolveEpubImages(doc, section, book) {
  if (!doc || !book || !book.archive || typeof book.archive.createUrl !== 'function') return;
  const XLINK = 'http://www.w3.org/1999/xlink';
  const sectionUrl = (section && (section.url || section.href)) || '';
  const baseHref = 'https://epub.local/' + String(sectionUrl).replace(/^\//, '');

  const toArchivePath = (src) => {
    try { return new URL(src, baseHref).pathname; } catch (_) { return null; }
  };

  const tasks = [];
  const handle = (getSrc, setSrc) => {
    const src = getSrc();
    if (!src) return;
    const low = src.trim().toLowerCase();
    if (low.startsWith('blob:') || low.startsWith('data:') || low.startsWith('http://') || low.startsWith('https://')) return;
    const path = toArchivePath(src);
    if (!path) return;
    tasks.push(
      book.archive.createUrl(path, { base64: false })
        .then((blobUrl) => { if (blobUrl) setSrc(blobUrl); })
        .catch(() => {})
    );
  };

  const imgs = doc.getElementsByTagName ? doc.getElementsByTagName('img') : [];
  for (let i = 0; i < imgs.length; i++) {
    const el = imgs[i];
    handle(() => el.getAttribute('src'), (v) => el.setAttribute('src', v));
  }

  const images = doc.getElementsByTagName ? doc.getElementsByTagName('image') : [];
  for (let i = 0; i < images.length; i++) {
    const el = images[i];
    handle(
      () => (el.getAttributeNS && el.getAttributeNS(XLINK, 'href')) || el.getAttribute('xlink:href') || el.getAttribute('href'),
      (v) => {
        try { if (el.setAttributeNS) el.setAttributeNS(XLINK, 'href', v); } catch (_) {}
        try { el.setAttribute('href', v); } catch (_) {}
      }
    );
  }

  await Promise.all(tasks);
}

// ─── EPUB reader (epub.js — faithful, CONTINUOUS SCROLL, 2.0 / 3.0 + images) ──
// Renders the real EPUB exactly as authored (its own background, headings, page
// structure, images) in a smooth vertical scroll. The uploaded cover is injected
// as the very first thing in the book flow so it scrolls naturally. Zoom reflows
// via the reader's own font-size — the original page area is never re-styled.
// Fixed-layout (InDesign) EPUBs have absolutely-positioned text sized in fixed
// pixels for a fixed page. Font-size manipulation breaks them, so we scale the
// whole authored page with a CSS transform to fit the frame width instead.
function isFixedLayoutDoc(doc) {
  try { return !!doc.querySelector('[id^="_idContainer"]'); } catch (_) { return false; }
}

function scaleFixedLayoutDoc(doc, userZoom) {
  if (!doc || !doc.body) return;
  // Read the authored page size from the fixed-layout viewport meta.
  let nW = 0, nH = 0;
  const vp = doc.querySelector('meta[name="viewport"]');
  if (vp) {
    const c = vp.getAttribute('content') || '';
    const mw = c.match(/width\s*=\s*(\d+)/);
    const mh = c.match(/height\s*=\s*(\d+)/);
    if (mw) nW = parseInt(mw[1], 10);
    if (mh) nH = parseInt(mh[1], 10);
  }
  if (!nW) nW = doc.body.scrollWidth || 432;
  if (!nH) nH = doc.body.scrollHeight || 648;

  const availW = doc.documentElement.clientWidth || nW;
  const scale = (availW / nW) * (userZoom || 1);

  doc.documentElement.style.setProperty('overflow-x', 'hidden', 'important');
  doc.documentElement.style.setProperty('height', `${nH * scale}px`, 'important');

  const b = doc.body;
  b.style.setProperty('margin', '0', 'important');
  b.style.setProperty('width', `${nW}px`, 'important');
  // Center the page horizontally, then scale from its top-center so zooming in
  // stays centered instead of drifting to the left.
  b.style.setProperty('position', 'relative', 'important');
  b.style.setProperty('left', '50%', 'important');
  b.style.setProperty('transform-origin', 'top center', 'important');
  b.style.setProperty('transform', `translateX(-50%) scale(${scale})`, 'important');
  b.style.setProperty('transition', 'transform 0.2s ease-out', 'important');
}

function EpubReader({ arrayBuffer, frameWidth, fontPct, sampleMode, sampleStartFrac, sampleEndFrac, coverUrl }) {
   
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const bookRef = useRef(null);
  const renditionRef = useRef(null);
  const fontPctRef = useRef(fontPct);
  fontPctRef.current = fontPct;
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [isImageBased, setIsImageBased] = useState(false);

  useEffect(() => {
    if (!viewerRef.current || !arrayBuffer) return;
    let destroyed = false;
    let rendition;
    let book;
    (async () => {
      try {
        // Clone the buffer so pdf/docx paths never share a detached buffer.
        book = ePub(arrayBuffer.slice(0));
        bookRef.current = book;
        await book.ready;
        if (destroyed) return;
        
        // Wait for spine to be ready
        if (book.spine && book.spine.ready) {
          await book.spine.ready;
        }
        
        // Ensure book has loaded properly
        if (!book || !book.spine) {
          console.error('[EPUB] Book or spine not initialized properly');
          throw new Error('Failed to initialize EPUB book');
        }

        // Rewrite <img>/<svg image> sources to archive blob URLs so EPUB 2.0
        // image-based-text pages actually display (runs before serialization).
        if (book.archived && book.spine?.hooks?.content) {
          book.spine.hooks.content.register((doc, section) => resolveEpubImages(doc, section, book));
        }

        const spine = /** @type {any} */ (book.spine);
        let firstIndex = spine?.spineItems?.[0]?.index ?? 0;

        // Sample mode: keep ONLY the spine sections inside the configured sample
        // page-range fraction, so the reader shows just the excerpt — still the
        // real, faithfully-rendered EPUB content (never synthetic).
        if (sampleMode) {
          const items = spine?.spineItems || [];
          const n = items.length;
          if (n > 0) {
            const s = Math.max(0, Math.floor(n * (sampleStartFrac || 0)));
            const e = Math.min(n, Math.max(s + 1, Math.ceil(n * (sampleEndFrac || 1))));
            spine.spineItems = items.slice(s, e);
            firstIndex = spine.spineItems[0]?.index ?? firstIndex;
          }
        }

        rendition = book.renderTo(viewerRef.current, {
          width: '100%',
          height: '100%',
          flow: 'scrolled',        // continuous vertical scroll
          manager: 'continuous',   // lazy-load sections while scrolling
          spread: 'none',
          allowScriptedContent: true,
        });
        renditionRef.current = rendition;

        // Fix epub.js continuous scroll "snap-back" when scrolling up (browser
        // scroll-anchoring vs. lazily-injected sections). Ref: epub.js #1303/#1416.
        try {
          const mgr = /** @type {any} */ (rendition).manager?.container;
          if (mgr) mgr.style.setProperty('overflow-anchor', 'none', 'important');
        } catch (_) {}

        // Track if this is an image-based EPUB (EPUB 2.0 with image pages)
        rendition.hooks.content.register((contents) => {
          try {
            const doc = contents?.document;
            if (!doc) return;
            
            console.log('[EPUB] Content loaded, applying styles with fontPct:', fontPct + '%');
            doc.documentElement.style.setProperty('overflow-anchor', 'none', 'important');
            
            // Fixed-layout (InDesign) EPUB: scale the authored page to fit the
            // frame width. Do NOT touch font-size — that breaks fixed positioning
            // and makes the text huge / overflow on first render.
            if (isFixedLayoutDoc(doc)) {
              const applyFit = () => scaleFixedLayoutDoc(doc, (fontPctRef.current / 180) || 1);
              applyFit();
              setTimeout(applyFit, 100);
              setTimeout(applyFit, 500);
              try { contents?.window?.addEventListener('resize', applyFit); } catch (_) {}
              console.log('[EPUB] Fixed-layout page scaled to fit');
              return;
            }

            // Check if this is image-based by looking for image elements
            const images = doc.querySelectorAll('img, image');
            const isImagePage = images.length > 0 && doc.body?.children?.length <= images.length + 1;
            
            if (isImagePage) {
              setIsImageBased(true);
              console.log('[EPUB] Detected image-based page - will use CSS transform zoom');
            }
            
            // Inject a global CSS style for EPUB 2.0 compatibility (reflowable text)
            const style = doc.createElement('style');
            style.id = 'epub-base-zoom';
            style.textContent = `
              html, body { 
                font-size: ${fontPct}% !important; 
                line-height: 1.7 !important;
                overflow-x: hidden !important;
                width: 100% !important;
              }
              * { 
                font-size: inherit !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
              }
              p, div, span, li, td, th, a, em, i, b, strong {
                font-size: inherit !important;
              }
              h1 { font-size: 2em !important; }
              h2 { font-size: 1.75em !important; }
              h3 { font-size: 1.5em !important; }
              h4 { font-size: 1.25em !important; }
              h5 { font-size: 1.1em !important; }
              h6 { font-size: 1em !important; }
              img { max-width: 100% !important; height: auto !important; }
            `;
            doc.head?.appendChild(style);
            
            if (doc.body) {
              doc.body.style.setProperty('overflow-anchor', 'none', 'important');
              doc.body.style.setProperty('font-size', `${fontPct}%`, 'important');
              doc.body.style.setProperty('line-height', '1.7', 'important');
            }
            
            console.log('[EPUB] Styles applied to new content');
          } catch (err) {
            console.error('[EPUB] Error in content hook:', err);
          }
        });

        try { rendition.themes.fontSize(`${fontPct}%`); } catch (_) {}
        await rendition.display();
        if (!destroyed) setStatus('ready');
      } catch (e) {
        console.error('[EPUB] render error', e);
        if (!destroyed) setStatus('error');
      }
    })();
    return () => {
      destroyed = true;
      try { rendition && rendition.destroy(); } catch (_) {}
      try { book && book.destroy(); } catch (_) {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrayBuffer, sampleMode, sampleStartFrac, sampleEndFrac]);

  // Zoom: change the reader's own font-size (content reflows, stays original).
  // For image-based EPUBs, use CSS transform scaling on the container.
  useEffect(() => {
    try {
      const rendition = renditionRef.current;
      if (!rendition) return;
      
      console.log('[EPUB] Applying zoom:', fontPct + '%');
      
      // Fixed-layout EPUBs: rescale each page in place. Do NOT call
      // themes.fontSize — that resizes the iframe and fights the transform,
      // which makes the page shake. Just re-apply the transform scale.
      const fxContainer = rendition.manager?.container;
      const fxDoc = fxContainer?.querySelector('iframe')?.contentDocument;
      if (fxDoc && isFixedLayoutDoc(fxDoc)) {
        const applyFixed = () => {
          fxContainer.querySelectorAll('iframe').forEach((ifr) => {
            const d = ifr.contentDocument || ifr.contentWindow?.document;
            if (d && isFixedLayoutDoc(d)) scaleFixedLayoutDoc(d, (fontPct / 180) || 1);
          });
        };
        applyFixed();
        setTimeout(applyFixed, 120);
        return;
      }
      
      // For image-based EPUBs, use CSS transform on the container
      if (isImageBased) {
        const container = viewerRef.current;
        if (container) {
          // Find the epub.js iframe container
          const iframeContainer = container.querySelector('.epub-container') || container.querySelector('iframe')?.parentElement || container;
          const scale = fontPct / 100;
          iframeContainer.style.setProperty('transform', `scale(${scale})`);
          iframeContainer.style.setProperty('transform-origin', 'top center');
          iframeContainer.style.setProperty('transition', 'transform 0.15s ease-out');
          
          // Also apply to the viewer container
          const viewerContainer = container.querySelector('.viewer') || container;
          viewerContainer.style.setProperty('transform', `scale(${scale})`);
          viewerContainer.style.setProperty('transform-origin', 'top center');
          viewerContainer.style.setProperty('transition', 'transform 0.15s ease-out');
          
          console.log('[EPUB] Applied transform scale:', scale);
          return;
        }
      }
      
      // Method 1: Use epub.js themes API (for text-based EPUBs)
      rendition.themes.fontSize(`${fontPct}%`);
      
      // Method 2: Direct iframe manipulation for EPUB 2.0
      const applyZoomToIframes = () => {
        const container = rendition.manager?.container;
        if (!container) return;
        
        const iframes = container.querySelectorAll('iframe');
        console.log('[EPUB] Found iframes:', iframes.length);
        
        iframes.forEach((iframe, idx) => {
          try {
            const doc = iframe.contentDocument || iframe.contentWindow?.document;
            if (!doc) {
              console.log('[EPUB] Cannot access iframe', idx);
              return;
            }
            
            // Fixed-layout EPUB: rescale the authored page to fit. Never inject
            // font overrides here — that would break the fixed positioning.
            if (isFixedLayoutDoc(doc)) {
              scaleFixedLayoutDoc(doc, (fontPct / 180) || 1);
              return;
            }
            
            // Check if this is image-based
            const images = doc.querySelectorAll('img, image');
            const isImagePage = images.length > 0 && doc.body?.children?.length <= images.length + 1;
            
            if (isImagePage) {
              // For image-based pages, apply CSS transform to the body or container
              const body = doc.body;
              if (body) {
                const scale = fontPct / 100;
                body.style.setProperty('transform', `scale(${scale})`);
                body.style.setProperty('transform-origin', 'top center');
                body.style.setProperty('transition', 'transform 0.15s ease-out');
                console.log('[EPUB] Applied transform scale to iframe body:', scale);
              }
            } else {
              // Remove old zoom style if exists
              const oldStyle = doc.getElementById('epub-zoom-override');
              if (oldStyle) oldStyle.remove();
              
              // Inject new zoom style for text-based pages
              const style = doc.createElement('style');
              style.id = 'epub-zoom-override';
              style.textContent = `
                html, body { 
                  font-size: ${fontPct}% !important; 
                  line-height: 1.7 !important;
                }
                * { 
                  font-size: inherit !important;
                  max-width: 100% !important;
                }
                p, div, span, li, td, th, a, em, i, b, strong {
                  font-size: inherit !important;
                }
                h1 { font-size: 2em !important; }
                h2 { font-size: 1.75em !important; }
                h3 { font-size: 1.5em !important; }
                h4 { font-size: 1.25em !important; }
                h5 { font-size: 1.1em !important; }
                h6 { font-size: 1em !important; }
              `;
              
              if (doc.head) {
                doc.head.appendChild(style);
                console.log('[EPUB] Zoom applied to iframe', idx);
              }
            }
          } catch (err) {
            console.log('[EPUB] Error accessing iframe', idx, err.message);
          }
        });
      };
      
      // Apply immediately
      applyZoomToIframes();
      
      // Also apply after a short delay (for lazy-loaded content)
      setTimeout(applyZoomToIframes, 100);
      setTimeout(applyZoomToIframes, 500);
      
    } catch (err) {
      console.error('[EPUB] Zoom error:', err);
    }
  }, [fontPct, isImageBased]);

  // Keep the rendition sized to its container (view-mode width changes, resize).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => {
      const v = viewerRef.current;
      if (v && renditionRef.current) {
        try { renditionRef.current.resize(v.clientWidth, v.clientHeight); } catch (_) {}
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="w-full h-full overflow-y-auto flex flex-col items-center gap-3 p-2 sm:p-3">
      {/* Cover rendered in the parent document (not inside the epub.js iframe).
          This is version-independent: it always displays for EPUB 2.0 and 3.0
          regardless of the section's XHTML namespace or embedded CSP. */}
      {coverUrl && (
        <img
          src={coverUrl}
          alt="Cover"
          className="bg-white shadow-xl rounded-sm shrink-0"
          style={{ width: frameWidth, maxWidth: '100%' }}
        />
      )}
      <div
        ref={containerRef}
        className="relative bg-white shadow-xl rounded-sm overflow-hidden shrink-0 w-full"
        style={{ width: frameWidth, maxWidth: '100%', height: '100%', maxHeight: '100%' }}
      >
        <div ref={viewerRef} className="w-full h-full" />

        {status === 'loading' && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <CenterMessage icon={Loader2} spin title="Loading book…" />
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 bg-white flex items-center justify-center">
            <CenterMessage icon={AlertCircle} title="Could not render this EPUB" subtitle="The file may be corrupted or use an unsupported feature." />
          </div>
        )}
      </div>
    </div>
  );
}

function DeviceFrame({ type, children }) {
  const wrap = 'w-full h-full flex items-center justify-center overflow-hidden bg-gradient-to-b from-slate-100 to-slate-200 p-4';
  if (type === 'tablet') {
    return (
      <div className={wrap}>
        <div className="relative bg-slate-800 rounded-[28px] p-3" style={{ boxShadow: '0 24px 48px rgba(0,0,0,0.35)' }}>
          <div className="absolute right-[-6px] top-24 w-1.5 h-10 bg-slate-700 rounded-r-md" />
          <div className="bg-slate-100 rounded-[18px] overflow-hidden" style={{ width: 480, height: 620, maxWidth: '82vw', maxHeight: '72vh' }}>
            {children}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className={wrap}>
      <div className="relative bg-slate-900 rounded-[42px] p-2.5" style={{ boxShadow: '0 24px 48px rgba(0,0,0,0.35)' }}>
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-5 bg-slate-900 rounded-full z-30 border border-slate-800" />
        <div className="bg-slate-100 rounded-[34px] overflow-hidden" style={{ width: 320, height: 650, maxWidth: '82vw', maxHeight: '74vh' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── PDF reader (pdf.js — renders the real pages to canvas) ────────────────────
function PdfReader({ arrayBuffer, coverUrl, pageWidth, sampleStart, sampleEnd }) {
  const pagesRef = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  useEffect(() => {
    if (!pagesRef.current || !arrayBuffer) return;
    let cancelled = false;
    const container = pagesRef.current;
    container.innerHTML = '';
    (async () => {
      try {
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
        // Sample mode → render only the configured page range (real PDF pages).
        const from = sampleStart > 0 ? Math.max(1, sampleStart) : 1;
        const to = sampleEnd > 0 ? Math.min(sampleEnd, pdf.numPages) : pdf.numPages;
        for (let n = from; n <= to; n++) {
          if (cancelled) return;
          // eslint-disable-next-line no-await-in-loop
          const page = await pdf.getPage(n);
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = typeof pageWidth === 'number' ? `${pageWidth}px` : pageWidth;
          canvas.style.maxWidth = '100%';
          canvas.style.height = 'auto';
          canvas.className = 'bg-white shadow-xl rounded-sm';
          container.appendChild(canvas);
          // eslint-disable-next-line no-await-in-loop
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
          if (n === 1 && !cancelled) setStatus('ready');
        }
        if (!cancelled) setStatus('ready');
      } catch (e) {
        console.error('[PDF] render error', e);
        if (!cancelled) setStatus('error');
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrayBuffer, sampleStart, sampleEnd]);

  // Apply zoom by resizing existing canvases when pageWidth (fontScale) changes,
  // without re-rendering the whole PDF.
  useEffect(() => {
    const container = pagesRef.current;
    if (!container) return;
    const w = typeof pageWidth === 'number' ? `${pageWidth}px` : pageWidth;
    container.querySelectorAll('canvas').forEach((c) => {
      c.style.width = w;
    });
  }, [pageWidth]);

  return (
    <div className="w-full h-full overflow-auto bg-slate-200">
      <div className="flex flex-col items-center gap-5 py-6 px-3">
        {coverUrl && !(sampleStart > 1) && (
          <img src={coverUrl} alt="Cover" className="bg-white shadow-xl rounded-sm" style={{ width: pageWidth, maxWidth: '100%' }} />
        )}
        {status === 'loading' && <CenterMessage icon={Loader2} spin title="Rendering PDF…" />}
        {status === 'error' && <CenterMessage icon={AlertCircle} title="Could not render this PDF" />}
        <div
          ref={pagesRef}
          className="flex flex-col items-center gap-5 w-full"
        />
      </div>
    </div>
  );
}

function DocxReader({ arrayBuffer, coverUrl, fontScale = 1, frameWidth = 440, sampleActive = false, sampleStart = 0, sampleStartFrac = 0, sampleEndFrac = 1 }) {
  const scrollRef = useRef(null);
  const hostRef = useRef(null);
  const naturalWRef = useRef(0);
  const [status, setStatus] = useState('loading');

  const applyZoom = useCallback(() => {
    const el = hostRef.current;
    const sc = scrollRef.current;
    if (!el || !sc) return;
    
    // Apply fontScale directly without auto-fit scaling
    // This ensures documents maintain proper zoom level
    const z = fontScale || 1;
    
    // Use CSS transform instead of zoom for smoother scaling
    el.style.setProperty('transform', `scale(${z})`);
    el.style.setProperty('transform-origin', 'top center');
    el.style.setProperty('transition', 'transform 0.3s ease-out');
  }, [fontScale, frameWidth]);

  const applyCrop = useCallback(() => {
    const el = hostRef.current;
    if (!el) return;
    const wrapper = el.querySelector('.docx-wrapper') || el;
    if (sampleActive && sampleEndFrac < 1) {
      const prevZoom = el.style.zoom || '';
      wrapper.style.marginTop = '0px';
      el.style.maxHeight = 'none';
      el.style.zoom = '1';
      const full = el.scrollHeight;
      el.style.zoom = prevZoom;
      if (full > 0) {
        const startFrac = Math.max(0, Math.min(sampleStartFrac || 0, sampleEndFrac));
        const h = Math.max(1, Math.round(full * (sampleEndFrac - startFrac)));
        el.style.maxHeight = `${h}px`;
        el.style.overflowY = 'hidden';
        wrapper.style.marginTop = startFrac > 0 ? `-${Math.round(full * startFrac)}px` : '0px';
      }
    } else {
      el.style.maxHeight = 'none';
      el.style.overflowY = 'visible';
      wrapper.style.marginTop = '0px';
    }
  }, [sampleActive, sampleStartFrac, sampleEndFrac]);

  useEffect(() => {
    if (!hostRef.current || !arrayBuffer) return;
    let cancelled = false;
    const el = hostRef.current;
    el.innerHTML = '';
    el.style.setProperty('zoom', '1');
    renderAsync(arrayBuffer.slice(0), el, undefined, {
      className: 'docx',
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      breakPages: true,
    })
      .then(() => {
        if (cancelled) return;
        const wrapper = el.querySelector('.docx-wrapper');
        if (wrapper) {
          wrapper.style.background = 'transparent';
          wrapper.style.padding = '0';
          wrapper.style.boxShadow = 'none';
        }
        const page = el.querySelector('.docx');
        naturalWRef.current = page ? page.offsetWidth : 0;

        applyZoom();
        applyCrop();
        setStatus('ready');
      })
      .catch((e) => { console.error('[DOCX] render error', e); if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, [arrayBuffer, applyZoom, applyCrop]);

  useEffect(() => { applyZoom(); applyCrop(); }, [applyZoom, applyCrop]);
  useEffect(() => {
    const sc = scrollRef.current;
    if (!sc) return;
    const obs = new ResizeObserver(() => { applyZoom(); applyCrop(); });
    obs.observe(sc);
    return () => obs.disconnect();
  }, [applyZoom, applyCrop]);

  return (
    <div ref={scrollRef} className="w-full h-full overflow-auto bg-slate-200">
      <div className="flex flex-col items-center gap-5 py-6 px-3">
        {coverUrl && !(sampleStart > 1) && (
          <img src={coverUrl} alt="Cover" className="bg-white shadow-xl rounded-sm" style={{ width: frameWidth, maxWidth: '100%' }} />
        )}
        {status === 'loading' && <CenterMessage icon={Loader2} spin title="Rendering document…" />}
        {status === 'error' && <CenterMessage icon={AlertCircle} title="Could not render this document" />}
        <div ref={hostRef} className="docx-host" style={{ transformOrigin: 'top center' }} />
      </div>
    </div>
  );
}

const VIEW_BASE_WIDTH = { desktop: 900, tablet: 700, mobile: 550 };
const EPUB_FRAME_WIDTH = { desktop: 700, tablet: 600, mobile: 500 };

export default function FaithfulReader({ book, fontScale = 1, viewMode = 'desktop', sampleMode = false }) {
  const [buffer, setBuffer] = useState(null);
  const [state, setState] = useState('loading');
  const [loadProgress, setLoadProgress] = useState(0);
  const ext = fileExtension(book);

  // Extract stable primitive values for dependencies
  const manuscriptUrl = book?.manuscript_url || book?.manuscriptUrl;
  const manuscriptFileName = book?.manuscriptFile?.name;
  const manuscriptFileSize = book?.manuscriptFile?.size;

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    setBuffer(null);
    setLoadProgress(0);
    
    // ⚡ Use requestIdleCallback for non-blocking state updates
    let progressUpdateScheduled = false;
    
    (async () => {
      try {
        const ab = await getArrayBuffer(book, (progress) => {
          if (!cancelled && !progressUpdateScheduled) {
            progressUpdateScheduled = true;
            // ⚡ Batch progress updates to reduce re-renders
            requestAnimationFrame(() => {
              if (!cancelled) {
                setLoadProgress(progress);
                progressUpdateScheduled = false;
              }
            });
          }
        });
        if (cancelled) return;
        if (!ab) { setState('nofile'); return; }
        setBuffer(ab);
        setState('ready');
        setLoadProgress(100);
      } catch (e) {
        console.error('[FaithfulReader] load error', e);
        if (!cancelled) setState('error');
      }
    })();
    return () => { cancelled = true; };
  }, [manuscriptUrl, manuscriptFileName, manuscriptFileSize]);

  if (state === 'loading') {
    const isSample = book?.title?.includes('(Sample)') || sampleMode;
    const progressText = loadProgress > 0 && loadProgress < 100
      ? (isSample ? 'Loading sample file...' : 'Loading manuscript...')
      : loadProgress === 100
      ? 'Processing...'
      : (isSample ? 'Loading sample file' : 'Loading manuscript file is too large');
    return <CenterMessage 
      icon={Loader2} 
      spin 
      title={progressText} 
      progress={loadProgress > 0 ? loadProgress : null}
    />;
  }
  if (state === 'nofile') return <CenterMessage icon={FileText} title="No manuscript uploaded" subtitle="Upload an EPUB, PDF, or DOCX file to preview your book." />;
  if (state === 'error' || !buffer) return <CenterMessage icon={AlertCircle} title="Could not load the manuscript" subtitle="Please re-upload the file and try again." />;

  const coverUrl = book?.cover_url || book?.coverUrl;
  const baseW = VIEW_BASE_WIDTH[viewMode] || VIEW_BASE_WIDTH.desktop;
  // EPUB needs larger font percentage (180% base multiplier) to display at readable size
  const epubFontPct = Math.round((fontScale || 1) * 180);
  const fontPct = Math.round((fontScale || 1) * 100);
  const docWidth = Math.round(baseW * (fontScale || 1));

  const total = parseInt(book?.totalPages, 10) || 0;
  const sStart = parseInt(book?.samplePageStart, 10) || 1;
  const sEnd = parseInt(book?.samplePageEnd, 10) || 0;
  const hasSample = sEnd > 0 && total > 0;
  const activeSample = sampleMode && hasSample;
  const sampleStartFrac = hasSample ? Math.max(0, (sStart - 1) / total) : 0;
  const sampleEndFrac = hasSample ? Math.min(1, sEnd / total) : 1;

  let reader;
  if (ext === 'epub') {
    const epubFrameW = EPUB_FRAME_WIDTH[viewMode] || EPUB_FRAME_WIDTH.desktop;
    reader = <EpubReader arrayBuffer={buffer} frameWidth={epubFrameW} fontPct={epubFontPct} sampleMode={activeSample} sampleStartFrac={sampleStartFrac} sampleEndFrac={sampleEndFrac} coverUrl={coverUrl} />;
  } else if (ext === 'pdf') {
    reader = <PdfReader arrayBuffer={buffer} coverUrl={coverUrl} pageWidth={docWidth} sampleStart={activeSample ? sStart : 0} sampleEnd={activeSample ? sEnd : 0} />;
  } else if (ext === 'docx' || ext === 'doc') {
    reader = <DocxReader arrayBuffer={buffer} coverUrl={coverUrl} fontScale={fontScale} frameWidth={baseW} sampleActive={activeSample} sampleStart={activeSample ? sStart : 0} sampleStartFrac={sampleStartFrac} sampleEndFrac={sampleEndFrac} />;
  } else {
    return <CenterMessage icon={FileText} title={`Preview not supported for .${ext || 'this'} files`} subtitle="Supported formats: EPUB, PDF, DOCX." />;
  }

  if (viewMode === 'tablet' || viewMode === 'mobile') {
    return <DeviceFrame type={viewMode}>{reader}</DeviceFrame>;
  }
  return <div className="w-full h-full overflow-hidden bg-gradient-to-b from-slate-100 to-slate-200">{reader}</div>;
}
