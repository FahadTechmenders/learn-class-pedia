import React, { useEffect, useRef, useState, useCallback } from 'react';
import ePub from 'epubjs';
import JSZip from 'jszip';
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
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('[FaithfulReader] Failed to get file size:', response.status, errorText);
      throw new Error(`Failed to get file size: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    if (typeof data.fileSize === 'number' && data.fileSize > 0) {
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
    
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB for PDF
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
    }
    const completeFile = new Uint8Array(downloadedBytes);
    let offset = 0;
    for (const chunk of allChunks) {
      completeFile.set(chunk, offset);
      offset += chunk.length;
    }
    
    if (onProgress) onProgress(100);
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
    }
  }
  
  // Use book ID for IndexedDB cache key (same as preloader)
  const localStorageCacheKey = `book_${bookId}_${ext}`;
  const indexedDBCacheKey = `${url}_${ext}`;

  
  // Return existing promise if request is already in flight
  if (requestCache.has(localStorageCacheKey)) {
    return requestCache.get(localStorageCacheKey);
  }
  
  // Create new request promise
  const requestPromise = (async () => {
    try {
      
      if (bookId) {
        const cachedManuscript = await getCachedManuscript(localStorageCacheKey);
        
        if (cachedManuscript) {
          if (onProgress) onProgress(100);
          return cachedManuscript.arrayBuffer;
        } else {
        }
      } else {
      }
      
      // Check IndexedDB cache (legacy)
      const cachedData = await getCachedFile(indexedDBCacheKey);
      if (cachedData) {
        if (onProgress) onProgress(100);
        return cachedData;
      }
      const startTime = performance.now();
      
      let arrayBuffer;
      
      // EPUB files - single request (backend returns complete file)
      if (ext === 'epub') {
        arrayBuffer = await downloadCompleteFile(url, onProgress);
      }
      // PDF files - chunked download (5MB chunks due to backend limit)
      else if (ext === 'pdf') {
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

  // Remove the fixed width/height (and display/overflow) InDesign hard-codes on
  // its #_idContainer boxes, so the content isn't locked into a narrow left-
  // aligned column inside the page.
  if (!doc.getElementById('fixed-idcontainer-reset')) {
    const reset = doc.createElement('style');
    reset.id = 'fixed-idcontainer-reset';
    reset.textContent = `
      [id^="_idContainer"] {
        width: auto !important;
        height: auto !important;
        max-width: 100% !important;
        display: block !important;
        overflow: visible !important;
        margin-left: auto !important;
        margin-right: auto !important;
      }
    `;
    (doc.head || doc.documentElement).appendChild(reset);
  }

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

  // Available width = the actual <iframe> element width in the parent. We must
  // NOT use doc.documentElement.clientWidth here: a fixed-layout EPUB's viewport
  // meta (e.g. width=432) makes clientWidth report the authored width, so on a
  // narrow device the page wouldn't shrink and would anchor to the left.
  let availW = 0;
  try {
    const frameEl = doc.defaultView && doc.defaultView.frameElement;
    if (frameEl) availW = frameEl.clientWidth || frameEl.getBoundingClientRect().width;
  } catch (_) {}
  if (!availW) availW = doc.documentElement.clientWidth || nW;

  const scale = (availW / nW) * (userZoom || 1);

  // Force the document's own width to match the frame so the fixed viewport meta
  // can't leave the page anchored to the left.
  doc.documentElement.style.setProperty('width', `${availW}px`, 'important');
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
          if (mgr) {
            mgr.style.setProperty('overflow-anchor', 'none', 'important');
            // Reflowable (EPUB 3.0 flowable text) zoom: make the epub.js scroll
            // container a real vertical scroller so a scrollbar appears once the
            // zoomed text grows taller than the frame (lets the user scroll to
            // read/adjust). Only affects this reflowable reader — PDF and
            // image-based EPUB 2.0 use separate components.
            mgr.style.setProperty('overflow-y', 'auto', 'important');
            mgr.style.setProperty('overflow-x', 'hidden', 'important');
                        mgr.style.setProperty('height', '100%', 'important');
            // Override epub.js's mobile width constraints (288px + padding) for fixed-layout
            mgr.style.setProperty('width', '100%', 'important');
            mgr.style.setProperty('max-width', '100%', 'important');
            mgr.style.setProperty('padding', '0', 'important');
            mgr.style.setProperty('margin', '0', 'important');
            mgr.style.setProperty('box-sizing', 'border-box', 'important');
          }
        } catch (_) {}

        // Track if this is an image-based EPUB (EPUB 2.0 with image pages)
        rendition.hooks.content.register((contents) => {
          try {
            const doc = contents?.document;
            if (!doc) return;
            doc.documentElement.style.setProperty('overflow-anchor', 'none', 'important');
            
            // Fixed-layout (InDesign) EPUB: scale the authored page to fit the
            // frame width. Do NOT touch font-size — that breaks fixed positioning
            // and makes the text huge / overflow on first render.
            if (isFixedLayoutDoc(doc)) {
              const applyFit = () => scaleFixedLayoutDoc(doc, (fontPctRef.current / 100) || 1);
              applyFit();
              setTimeout(applyFit, 100);
              setTimeout(applyFit, 500);
              try { contents?.window?.addEventListener('resize', applyFit); } catch (_) {}
              return;
            }

            // Reflowable / image-based EPUB (2.0 & 3.0): inject ONLY safe layout rules (line
            // spacing, horizontal-overflow guard, responsive images). Font-size
            // is deliberately left to epub.js's themes.fontSize so zoom reflows
            // the real content — exactly like the Publisher Portal. Locking
            // font-size here with !important would block themes.fontSize updates.
            const style = doc.createElement('style');
            style.id = 'epub-base-zoom';
            style.textContent = `
              html, body {
                line-height: 1.7 !important;
                overflow-x: hidden !important;
                width: 100% !important;
              }
              * { max-width: 100% !important; box-sizing: border-box !important; }
              img { max-width: 100% !important; height: auto !important; }
            `;
            doc.head?.appendChild(style);

            if (doc.body) {
              doc.body.style.setProperty('overflow-anchor', 'none', 'important');
              doc.body.style.setProperty('line-height', '1.7', 'important');
            }
          } catch (err) {
            console.error('[EPUB] Error in content hook:', err);
          }
        });

        try { rendition.themes.fontSize(`${fontPct}%`); } catch (_) {}
        await rendition.display();
        if (!destroyed) setStatus('ready');

        // Inject the cover as the first element INSIDE the epub.js scroll flow so
        // it scrolls together with the book pages (epub.js stacks its scrolled
        // views in normal flow inside manager.container).
        if (coverUrl && !destroyed) {
          const injectCover = () => {
            try {
              const scroller = rendition.manager && rendition.manager.container;
              if (!scroller) return;
              if (scroller.querySelector('#faithful-injected-cover')) return;
              const img = document.createElement('img');
              img.id = 'faithful-injected-cover';
              img.src = coverUrl;
              img.alt = 'Cover';
              img.style.cssText = 'display:block;width:100%;max-width:100%;height:auto;margin:0 auto 12px auto;box-shadow:0 10px 15px rgba(0,0,0,.1);border-radius:2px;';
              scroller.insertBefore(img, scroller.firstChild);
            } catch (_) {}
          };
          injectCover();
          setTimeout(injectCover, 100);
          setTimeout(injectCover, 400);
          try { rendition.on('rendered', injectCover); } catch (_) {}
          try { rendition.on('relocated', injectCover); } catch (_) {}
        }
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

  // Zoom (Publisher Portal approach): reflow the real EPUB via the reader's own
  // font-size. Content stays original and reflows identically on Desktop/Tablet/
  // Mobile for both EPUB 2.0 and 3.0. Fixed-layout EPUBs (which cannot reflow)
  // fall back to CSS-transform page scaling below.
  useEffect(() => {
    try {
      const rendition = renditionRef.current;
      if (!rendition) return;

      // Fixed-layout EPUBs: rescale each page in place. Do NOT call
      // themes.fontSize — that resizes the iframe and fights the transform,
      // which makes the page shake. Just re-apply the transform scale.
      const fxContainer = rendition.manager?.container;
      const fxDoc = fxContainer?.querySelector('iframe')?.contentDocument;
      if (fxDoc && isFixedLayoutDoc(fxDoc)) {
        // Capture the current reading location (CFI) before zoom so we can navigate
        // back to it after scaling. epub.js's continuous manager repositions content
        // when iframe heights change, so preserving raw scrollTop doesn't work.
        let savedLocation = null;
        try {
          savedLocation = rendition.currentLocation();
        } catch (e) {
          console.warn('[ZOOM] Could not capture location:', e.message);
        }

        const applyFixed = () => {
          fxContainer.querySelectorAll('iframe').forEach((ifr) => {
            const d = ifr.contentDocument || ifr.contentWindow?.document;
            if (d && isFixedLayoutDoc(d)) scaleFixedLayoutDoc(d, (fontPct / 100) || 1);
          });
        };

        applyFixed();
        
        // Navigate back to the saved location after a delay to let epub.js finish
        // repositioning. This is more reliable than fighting its scroll management.
        if (savedLocation && savedLocation.start && savedLocation.start.cfi) {
          setTimeout(() => {
            try {
              rendition.display(savedLocation.start.cfi);
            } catch (e) {
              console.warn('[ZOOM] Could not restore location:', e.message);
            }
          }, 150);
        } else {
          // Fallback: re-apply scaling a few times to ensure it sticks
          setTimeout(applyFixed, 100);
          setTimeout(applyFixed, 300);
        }
        return;
      }
      
      // Reflowable EPUB (3.0 flowable text): zoom via the reader's own font-size.
      // The real content reflows and grows taller; the scroll container (set to
      // overflow-y:auto above) then shows a scrollbar so the user can scroll the
      // enlarged text.
      rendition.themes.fontSize(`${fontPct}%`);
      // Nudge epub.js to recompute the scrolled section heights after the font
      // change so the container actually overflows and the scrollbar appears.
      setTimeout(() => {
        try {
          const v = viewerRef.current;
          if (v && renditionRef.current) renditionRef.current.resize(v.clientWidth, v.clientHeight);
        } catch (_) {}
      }, 60);
    } catch (err) {
      console.error('[EPUB] Zoom error:', err);
    }
  }, [fontPct]);

  // Keep the rendition sized to its container (view-mode width changes, resize).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => {
      const v = viewerRef.current;
      if (v && renditionRef.current) {
        try { renditionRef.current.resize(v.clientWidth, v.clientHeight); } catch (_) {}
        // Re-fit fixed-layout (InDesign) pages to the new frame width — otherwise
        // switching to a narrower device (mobile/tablet) keeps the old scale and
        // the page overflows to the side.
        try {
          const c = renditionRef.current.manager?.container;
          const reapply = () => {
            c?.querySelectorAll('iframe').forEach((ifr) => {
              const d = ifr.contentDocument || ifr.contentWindow?.document;
              if (d && isFixedLayoutDoc(d)) scaleFixedLayoutDoc(d, (fontPctRef.current / 100) || 1);
            });
          };
          reapply();
          setTimeout(reapply, 60);
          setTimeout(reapply, 200);
        } catch (_) {}
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="w-full h-full overflow-y-auto flex flex-col items-center gap-3 p-2 sm:p-3 scrollbar-hide">
      {/* Cover rendered in the parent document (not inside the epub.js iframe).
          This is version-independent: it always displays for EPUB 2.0 and 3.0
          regardless of the section's XHTML namespace or embedded CSP. */}
      {/* The cover is injected into the epub.js scroll container (see effect above)
          so it scrolls together with the book pages instead of sitting outside. */}
      <div
        ref={containerRef}
        className="relative bg-white shadow-xl rounded-sm overflow-hidden shrink-0 w-full"
        style={{ width: frameWidth, maxWidth: '100%', height: '100%', maxHeight: '100%' }}
      >
        <div ref={viewerRef} className="w-full h-full scrollbar-hide" />

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
          canvas.style.maxWidth = 'none';
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
    <div className="w-full h-full overflow-auto bg-slate-200 scrollbar-hide">
      <div className="flex flex-col items-center gap-5 py-6 px-3 w-fit min-w-full mx-auto">
        {coverUrl && !(sampleStart > 1) && (
          <img src={coverUrl} alt="Cover" className="bg-white shadow-xl rounded-sm" style={{ width: pageWidth, maxWidth: 'none' }} />
        )}
        {status === 'loading' && <CenterMessage icon={Loader2} spin title="Rendering PDF…" />}
        {status === 'error' && <CenterMessage icon={AlertCircle} title="Could not render this PDF" />}
        <div
          ref={pagesRef}
          className="flex flex-col items-center gap-5 w-fit min-w-full"
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
    <div ref={scrollRef} className="w-full h-full overflow-auto bg-slate-200 scrollbar-hide">
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

// ─── Image-based EPUB 2.0 → PDF-style page extraction ─────────────────────────
// Legacy/fixed image EPUBs (each spine section is a full-page image) do NOT
// paginate reliably in epub.js continuous scroll — everything collapses into one
// scaled container. So we read the zip directly (same technique as ContentStep's
// parseEpubToStructure), pull each page image out in spine order, and render them
// as separate stacked pages exactly like the PDF reader. Returns an ordered array
// of blob-URL strings, or null when the book is reflowable text (use epub.js).
async function extractEpubImagePages(arrayBuffer) {
  const zip = await JSZip.loadAsync(arrayBuffer.slice(0));
  const domParser = new DOMParser();

  const containerEntry = zip.file('META-INF/container.xml');
  if (!containerEntry) return null;
  const containerXml = await containerEntry.async('text');
  const containerDoc = domParser.parseFromString(containerXml, 'application/xml');
  const opfPath = containerDoc.querySelector('rootfile')?.getAttribute('full-path') || 'content.opf';
  const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

  const opfEntry = zip.file(opfPath);
  if (!opfEntry) return null;
  const opfXml = await opfEntry.async('text');
  const opfDoc = domParser.parseFromString(opfXml, 'application/xml');

  const manifest = {};
  opfDoc.querySelectorAll('manifest > item').forEach((it) => {
    const id = it.getAttribute('id');
    const href = it.getAttribute('href');
    const mt = it.getAttribute('media-type') || '';
    if (id && href) manifest[id] = { path: opfDir + href, mediaType: mt };
  });

  const spineItems = Array.from(opfDoc.querySelectorAll('spine > itemref'))
    .map((ref) => manifest[ref.getAttribute('idref')])
    .filter(Boolean);

  const resolveZipPath = (src, baseDir) => {
    try { return new URL(src, `http://epub.local/${baseDir}`).pathname.replace(/^\//, ''); }
    catch (_) { return src; }
  };
  const getImageBlobUrl = async (zipPath) => {
    if (!zipPath) return null;
    let entry = zip.file(zipPath);
    if (!entry) {
      const lc = zipPath.toLowerCase();
      const match = Object.keys(zip.files).find((k) => k.toLowerCase() === lc && !zip.files[k].dir);
      if (match) entry = zip.file(match);
    }
    if (!entry) return null;
    try {
      const data = await entry.async('arraybuffer');
      const ext = (zipPath.split('.').pop() || '').toLowerCase();
      const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp' };
      return URL.createObjectURL(new Blob([data], { type: mimeMap[ext] || 'image/jpeg' }));
    } catch (_) { return null; }
  };

  const pages = [];
  let textCount = 0;
  let imageCount = 0;
  for (let i = 0; i < spineItems.length; i++) {
    const { path: itemPath, mediaType } = spineItems[i];
    const isXhtml = mediaType.includes('html') || /\.(xhtml|html|htm)$/i.test(itemPath);
    if (!isXhtml) continue;
    const xhtmlEntry = zip.file(itemPath);
    if (!xhtmlEntry) continue;
    // eslint-disable-next-line no-await-in-loop
    const xhtmlText = await xhtmlEntry.async('text');
    let doc = domParser.parseFromString(xhtmlText, 'application/xhtml+xml');
    if (doc.querySelector('parsererror')) doc = domParser.parseFromString(xhtmlText, 'text/html');
    const itemBase = itemPath.includes('/') ? itemPath.substring(0, itemPath.lastIndexOf('/') + 1) : '';

    const textEls = Array.from(doc.querySelectorAll('h1,h2,h3,h4,h5,h6,p,blockquote,li'))
      .filter((el) => (el.textContent || '').trim());
    textCount += textEls.length;

    const imgs = Array.from(doc.querySelectorAll('img, image'));
    for (const el of imgs) {
      const rawSrc = el.getAttribute('src')
        || el.getAttribute('href')
        || el.getAttribute('xlink:href')
        || (el.getAttributeNS ? el.getAttributeNS('http://www.w3.org/1999/xlink', 'href') : null)
        || '';
      if (rawSrc && !rawSrc.startsWith('data:')) {
        const resolved = resolveZipPath(rawSrc, itemBase);
        // eslint-disable-next-line no-await-in-loop
        const url = await getImageBlobUrl(resolved);
        if (url) { pages.push(url); imageCount++; }
      }
    }
  }

  const totalEls = textCount + imageCount;
  const isImageBased = totalEls > 0 && imageCount / totalEls > 0.5 && pages.length > 0;
  if (!isImageBased) {
    pages.forEach((u) => { try { URL.revokeObjectURL(u); } catch (_) {} });
    return null;
  }
  return pages;
}

// Renders image-based EPUB pages as separate stacked cards — identical layout to
// the PDF reader (page width scales with zoom, gap between pages, drop shadow).
function EpubImageReader({ pages, pageWidth, coverUrl }) {
  return (
    <div className="w-full h-full overflow-auto bg-slate-200 scrollbar-hide">
      <div className="flex flex-col items-center gap-5 py-6 px-3 w-fit min-w-full mx-auto">
        {coverUrl && (
          <img src={coverUrl} alt="Cover" className="bg-white shadow-xl rounded-sm" style={{ width: pageWidth, maxWidth: 'none' }} />
        )}
        {pages.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`Page ${i + 1}`}
            className="bg-white shadow-xl rounded-sm"
            style={{ width: pageWidth, maxWidth: 'none', height: 'auto' }}
          />
        ))}
      </div>
    </div>
  );
}

// Decides how to render an EPUB: extract image pages (PDF-style) for image-based
// EPUB 2.0, otherwise fall back to the faithful epub.js reflow reader.
function EpubAutoReader({ arrayBuffer, frameWidth, docWidth, fontPct, coverUrl, sampleMode, sampleStartFrac, sampleEndFrac }) {
  const [imagePages, setImagePages] = useState(undefined); // undefined=checking | null=reflowable | string[]

  useEffect(() => {
    let cancelled = false;
    let created = [];
    setImagePages(undefined);
    (async () => {
      try {
        const pages = await extractEpubImagePages(arrayBuffer);
        if (cancelled) { (pages || []).forEach((u) => { try { URL.revokeObjectURL(u); } catch (_) {} }); return; }
        created = pages || [];
        setImagePages(pages);
      } catch (e) {
        console.warn('[EPUB] image extraction failed, using epub.js:', e?.message);
        if (!cancelled) setImagePages(null);
      }
    })();
    return () => { cancelled = true; created.forEach((u) => { try { URL.revokeObjectURL(u); } catch (_) {} }); };
  }, [arrayBuffer]);

  if (imagePages === undefined) {
    return <CenterMessage icon={Loader2} spin title="Loading book…" />;
  }
  if (imagePages && imagePages.length) {
    // Sample mode → show only the pages inside the configured fraction range.
    let visible = imagePages;
    if (sampleMode) {
      const n = imagePages.length;
      const s = Math.max(0, Math.floor(n * (sampleStartFrac || 0)));
      const e = Math.min(n, Math.max(s + 1, Math.ceil(n * (sampleEndFrac || 1))));
      visible = imagePages.slice(s, e);
    }
    return <EpubImageReader pages={visible} pageWidth={docWidth} coverUrl={sampleMode ? null : coverUrl} />;
  }
  return (
    <EpubReader
      arrayBuffer={arrayBuffer}
      frameWidth={frameWidth}
      fontPct={fontPct}
      sampleMode={sampleMode}
      sampleStartFrac={sampleStartFrac}
      sampleEndFrac={sampleEndFrac}
      coverUrl={coverUrl}
    />
  );
}

// Default page width per view. Tablet/mobile values are tuned to fit inside the
// device-frame screens at the default 90% zoom, so a zoomed-in page overflows and
// the reader shows a scrollbar (zoom now works on every view).
const VIEW_BASE_WIDTH = { desktop: 600, tablet: 440, mobile: 300 };
const EPUB_FRAME_WIDTH = { desktop: 540, tablet: 440, mobile: 300 };

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
    reader = <EpubAutoReader arrayBuffer={buffer} frameWidth={epubFrameW} docWidth={docWidth} fontPct={epubFontPct} sampleMode={activeSample} sampleStartFrac={sampleStartFrac} sampleEndFrac={sampleEndFrac} coverUrl={coverUrl} />;
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
