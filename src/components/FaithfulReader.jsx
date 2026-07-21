import React, { useEffect, useRef, useState, useCallback } from 'react';
import ePub from 'epubjs';
import { renderAsync } from 'docx-preview';
import * as pdfjsLib from 'pdfjs-dist';
import { Loader2, FileText, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { ENDPOINTS, API_CONFIG } from '../config/api';
import { getCachedFile, setCachedFile } from '../utils/fileCache';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

// Request deduplication cache to prevent multiple simultaneous fetches (DOCX only —
// EPUB/PDF are streamed directly by epub.js / pdf.js and never buffered here).
const requestCache = new Map();

// Never persist files larger than this in IndexedDB.
const MAX_INDEXEDDB_BYTES = 25 * 1024 * 1024;

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

function getRemoteReaderUrl(book) {
  const originalUrl =
    book?.manuscript_url ||
    book?.manuscriptUrl;

  if (!originalUrl) return null;

  const filename =
    book?.manuscript_filename ||
    book?.manuscriptFilename ||
    '';

  const extension =
    filename.split('.').pop()?.toLowerCase() || '';

  let endpoint = null;

  if (extension === 'epub') {
    endpoint = ENDPOINTS.BOOK_EPUB(originalUrl);
  } else if (extension === 'pdf') {
    endpoint = ENDPOINTS.BOOK_PDF(originalUrl);
  } else if (extension === 'docx' || extension === 'doc') {
    endpoint = ENDPOINTS.BOOK_DOCX(originalUrl);
  }

  return endpoint
    ? `${API_CONFIG.BASE_URL}${endpoint}`
    : originalUrl;
}

// Streams a response body, reporting real download progress via Content-Length,
// and returns the fully-assembled ArrayBuffer. Only used for DOCX, since
// docx-preview requires a complete buffer up front. Browser HTTP caching is
// left enabled (no `cache: 'no-store'`) so repeat loads can hit the disk cache.
async function fetchArrayBufferWithProgress(url, signal, onProgress) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Backend API error: ${res.status}`);

  const contentLengthHeader = res.headers.get('Content-Length');
  const total = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;

  if (!res.body || typeof res.body.getReader !== 'function' || !total) {
    const buf = await res.arrayBuffer();
    onProgress?.(100);
    return buf;
  }

  const reader = res.body.getReader();
  const chunks = [];
  let received = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
    onProgress?.(Math.min(99, Math.round((received / total) * 100)));
  }

  const merged = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  onProgress?.(100);
  return merged.buffer;
}

// Fetches the full ArrayBuffer for a manuscript (local File or remote URL via
// the backend proxy). Used for DOCX (docx-preview always needs a complete
// buffer) AND for remote EPUB (epub.js/JSZip has no true partial/range
// loading for a zipped archive — `ePub(url)` still downloads the entire file
// via a single XHR before it can open the zip, so there's no bandwidth
// benefit to URL-based loading; downloading it ourselves lets us show real
// progress and cache it in IndexedDB for instant reopens).
// Includes request dedup + AbortController-based cancellation, IndexedDB
// caching (skipped for files > 25MB), and real download progress.
async function getManuscriptArrayBuffer(book, signal, onProgress) {
  const file = book?.manuscriptFile;
  if (file && typeof file.arrayBuffer === 'function') {
    onProgress?.(100);
    return await file.arrayBuffer();
  }

  const url = book?.manuscript_url || book?.manuscriptUrl;
  if (!url) return null;

  const apiUrl = getRemoteReaderUrl(book);
  if (!apiUrl) return null;

  const cacheKey = apiUrl;
  let entry = requestCache.get(cacheKey);

  if (!entry) {
    const controller = new AbortController();
    const listeners = new Set();
    const promise = (async () => {
      try {
        const cached = await getCachedFile(cacheKey);
        if (cached) {
          console.log('[FaithfulReader] Using cached manuscript from IndexedDB');
          listeners.forEach((cb) => cb(100));
          return cached;
        }

        console.log('[FaithfulReader] Fetching manuscript via backend API:', apiUrl);
        const buf = await fetchArrayBufferWithProgress(apiUrl, controller.signal, (pct) => {
          listeners.forEach((cb) => cb(pct));
        });

        if (buf && buf.byteLength <= MAX_INDEXEDDB_BYTES) {
          setCachedFile(cacheKey, buf).catch((err) => {
            console.warn('[FaithfulReader] Failed to cache file:', err);
          });
        }
        return buf;
      } finally {
        setTimeout(() => {
          if (requestCache.get(cacheKey) === entry) requestCache.delete(cacheKey);
        }, 1000);
      }
    })();
    entry = { promise, controller, subscribers: 0, listeners };
    requestCache.set(cacheKey, entry);
  }

  entry.subscribers += 1;
  if (onProgress) entry.listeners.add(onProgress);

  const onAbort = () => {
    entry.subscribers -= 1;
    entry.listeners.delete(onProgress);
    if (entry.subscribers <= 0) {
      entry.controller.abort();
      requestCache.delete(cacheKey);
    }
  };
  signal.addEventListener('abort', onAbort, { once: true });

  try {
    return await entry.promise;
  } finally {
    signal.removeEventListener('abort', onAbort);
  }
}

function fileExtension(book) {
  const name = book?.manuscript_filename || book?.manuscriptFilename || book?.manuscriptFile?.name || '';
  return (name.split('.').pop() || '').toLowerCase();
}

function CenterMessage({ icon: Icon = FileText, title, subtitle = null, spin = false }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-center px-8 bg-slate-100">
      <Icon className={`w-8 h-8 text-slate-400 ${spin ? 'animate-spin' : ''}`} />
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      {subtitle && <p className="text-xs text-slate-400 max-w-[280px] leading-relaxed">{subtitle}</p>}
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
function EpubReader({ source, frameWidth, fontPct, coverUrl }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const bookRef = useRef(null);
  const renditionRef = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  useEffect(() => {
    if (!viewerRef.current || !source) return;
    let destroyed = false;
    let rendition;
    let book;
    (async () => {
      try {
        // `source` is either a remote URL string (epub.js fetches/streams it
        // itself — no upfront ArrayBuffer download in this component), a
        // local File/Blob (uploaded file, already in memory), or an
        // ArrayBuffer. epub.js accepts all three natively.
        book = ePub(source);
        bookRef.current = book;
        await book.ready;
        if (destroyed) return;

        // Rewrite <img>/<svg image> sources to archive blob URLs so EPUB 2.0
        // image-based-text pages actually display (runs before serialization).
        if (book.archived && book.spine?.hooks?.content) {
          book.spine.hooks.content.register((doc, section) => resolveEpubImages(doc, section, book));
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

        rendition.hooks.content.register((contents) => {
          try {
            const doc = contents?.document;
            if (!doc) return;
            doc.documentElement.style.setProperty('overflow-anchor', 'none', 'important');
            if (doc.body) doc.body.style.setProperty('overflow-anchor', 'none', 'important');
          } catch (_) {}
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
  }, [source]);

  // Zoom: change the reader's own font-size (content reflows, stays original).
  useEffect(() => {
    try { renditionRef.current?.themes?.fontSize(`${fontPct}%`); } catch (_) {}
  }, [fontPct]);

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

// ─── PDF reader (pdf.js — renders real pages to canvas, lazily) ───────────────
// `source` is either { url } for remote files (fetched by pdf.js itself with
// HTTP Range + streaming enabled — no upfront full-file download) or
// { arrayBuffer } for local uploaded files already in memory. Pages are NOT
// all rendered immediately: a lightweight placeholder canvas is created for
// every page in range, and an IntersectionObserver triggers the actual
// `page.render()` only as each placeholder scrolls into view.
function PdfReader({ source, coverUrl, pageWidth }) {
  const scrollRootRef = useRef(null);
  const pagesRef = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  useEffect(() => {
    if (!pagesRef.current || !source || (!source.url && !source.arrayBuffer)) return;
    let cancelled = false;
    let pdf;
    let observer;
    const container = pagesRef.current;
    container.innerHTML = '';

    (async () => {
      try {
        if (source.url) {
          // Try HTTP Range + streaming first (fastest for large remote PDFs).
          // Some cross-origin proxy backends don't allow the `Range` header in
          // their CORS config, which makes the browser block the request at
          // the preflight (OPTIONS) stage. If that happens, fall back to a
          // plain streamed fetch (no Range header, so no preflight) — still
          // no full-file buffering, just without byte-range jumping.
          try {
            pdf = await pdfjsLib.getDocument({
              url: source.url,
              rangeChunkSize: 1 << 16, // 64KB range chunks
              disableRange: false,
              disableStream: false,
            }).promise;
          } catch (rangeError) {
            if (cancelled) return;
            console.warn('[PDF] Range-enabled load failed, retrying without Range:', rangeError);
            try {
              pdf = await pdfjsLib.getDocument({
                url: source.url,
                disableRange: true,
                disableStream: false,
              }).promise;
            } catch (streamError) {
              if (cancelled) return;
              // Last resort: pdf.js's own network layer can't load this URL at
              // all (e.g. the backend's CORS config only allows the exact
              // request shape our app's own fetch() uses). Fetch the bytes
              // ourselves — same proven code path as the DOCX reader — and
              // hand pdf.js the buffer directly.
              console.warn('[PDF] Streamed load failed, falling back to full fetch:', streamError);
              const res = await fetch(source.url);
              if (!res.ok) throw new Error(`Failed to fetch PDF (${res.status})`);
              const buf = await res.arrayBuffer();
              if (cancelled) return;
              pdf = await pdfjsLib.getDocument({ data: buf }).promise;
            }
          }
        } else {
          pdf = await pdfjsLib.getDocument({ data: source.arrayBuffer.slice(0) }).promise;
        }
        if (cancelled) return;

        const from = 1;
        const to = pdf.numPages;

        const firstPage = await pdf.getPage(from);
        if (cancelled) return;
        const firstViewport = firstPage.getViewport({ scale: 1.6 });
        const aspect = firstViewport.height / firstViewport.width; // reserve layout space

        const renderPage = async (n, canvas) => {
          if (cancelled || canvas.dataset.rendered === '1') return;
          canvas.dataset.rendered = '1';
          try {
            const page = n === from ? firstPage : await pdf.getPage(n);
            if (cancelled) return;
            const viewport = page.getViewport({ scale: 1.6 });
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
          } catch (e) {
            console.error('[PDF] page render error', n, e);
          }
        };

        observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              const canvas = entry.target;
              observer.unobserve(canvas);
              renderPage(parseInt(canvas.dataset.page, 10), canvas);
            });
          },
          { root: scrollRootRef.current, rootMargin: '600px 0px' }
        );

        const wStyle = typeof pageWidth === 'number' ? `${pageWidth}px` : pageWidth;
        for (let n = from; n <= to; n++) {
          if (cancelled) return;
          const canvas = document.createElement('canvas');
          canvas.dataset.page = String(n);
          canvas.className = 'bg-white shadow-xl rounded-sm';
          canvas.style.width = wStyle;
          canvas.style.maxWidth = '100%';
          canvas.style.height = 'auto';
          canvas.style.aspectRatio = `${1 / aspect}`;
          container.appendChild(canvas);
          observer.observe(canvas);
        }

        // Render the first page eagerly so the reader isn't blank on open.
        const firstCanvas = container.querySelector(`canvas[data-page="${from}"]`);
        if (firstCanvas) {
          observer.unobserve(firstCanvas);
          await renderPage(from, firstCanvas);
        }

        if (!cancelled) setStatus('ready');
      } catch (e) {
        console.error('[PDF] render error', e);
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      try { observer && observer.disconnect(); } catch (_) {}
      try { pdf && pdf.destroy(); } catch (_) {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

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
    <div ref={scrollRootRef} className="w-full h-full overflow-auto bg-slate-200">
      <div className="flex flex-col items-center gap-5 py-6 px-3">
        {coverUrl && (
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

function DocxReader({ arrayBuffer, coverUrl, fontScale = 1, frameWidth = 440 }) {
  const scrollRef = useRef(null);
  const hostRef = useRef(null);
  const naturalWRef = useRef(0);
  const [status, setStatus] = useState('loading');

  const applyZoom = useCallback(() => {
    const el = hostRef.current;
    const sc = scrollRef.current;
    if (!el || !sc) return;
    
    const natural = naturalWRef.current;
    let z = fontScale || 1;
    if (natural > 0) {
      const avail = Math.min(frameWidth, sc.clientWidth - 28);
      const fit = Math.min(1, avail / natural);
      z = fit * (fontScale || 1);
    }
    
    // Use CSS transform instead of zoom for smoother scaling
    el.style.setProperty('transform', `scale(${z})`);
    el.style.setProperty('transform-origin', 'top center');
    el.style.setProperty('transition', 'transform 0.15s ease-out');
  }, [fontScale, frameWidth]);

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
        setStatus('ready');
      })
      .catch((e) => { console.error('[DOCX] render error', e); if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, [arrayBuffer, applyZoom]);

  useEffect(() => { applyZoom(); }, [applyZoom]);
  useEffect(() => {
    const sc = scrollRef.current;
    if (!sc) return;
    const obs = new ResizeObserver(() => { applyZoom(); });
    obs.observe(sc);
    return () => obs.disconnect();
  }, [applyZoom]);

  return (
    <div ref={scrollRef} className="w-full h-full overflow-auto bg-slate-200">
      <div className="flex flex-col items-center gap-5 py-6 px-3">
        {coverUrl && (
          <img src={coverUrl} alt="Cover" className="bg-white shadow-xl rounded-sm" style={{ width: frameWidth, maxWidth: '100%' }} />
        )}
        {status === 'loading' && <CenterMessage icon={Loader2} spin title="Rendering document…" />}
        {status === 'error' && <CenterMessage icon={AlertCircle} title="Could not render this document" />}
        <div ref={hostRef} className="docx-host" style={{ transformOrigin: 'top center' }} />
      </div>
    </div>
  );
}

const VIEW_BASE_WIDTH = { desktop: 720, tablet: 600, mobile: 480 };

export default function FaithfulReader({ book, fontScale = 1, viewMode = 'desktop' }) {
  const [state, setState] = useState('loading'); // loading | ready | nofile | error
  const [loadProgress, setLoadProgress] = useState(0);
  // EPUB/PDF never buffer the whole file in this component — `epubSource` is a
  // URL string / File / Blob handed straight to epub.js; `pdfSource` is
  // { url } or { arrayBuffer } handed straight to pdf.js. Only DOCX needs a
  // full in-memory ArrayBuffer (`docxBuffer`), since docx-preview requires it.
  const [epubSource, setEpubSource] = useState(null);
  const [pdfSource, setPdfSource] = useState(null);
  const [docxBuffer, setDocxBuffer] = useState(null);
  const ext = fileExtension(book);

  // Extract stable primitive values for dependencies
  const manuscriptUrl = book?.manuscript_url || book?.manuscriptUrl;
  const manuscriptFileName = book?.manuscriptFile?.name;
  const manuscriptFileSize = book?.manuscriptFile?.size;

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    let localObjectUrl = null;

    setState('loading');
    setLoadProgress(0);
    setEpubSource(null);
    setPdfSource(null);
    setDocxBuffer(null);

    (async () => {
      try {
        if (!ext) { if (!cancelled) setState('nofile'); return; }
        const manuscriptFile = book?.manuscriptFile;

        if (ext === 'epub') {
          if (manuscriptFile) {
            if (!cancelled) { setEpubSource(manuscriptFile); setState('ready'); }
          } else if (manuscriptUrl) {
            const remoteUrl = getRemoteReaderUrl(book);
            if (!remoteUrl) { if (!cancelled) setState('nofile'); return; }
            if (!cancelled) { setEpubSource(remoteUrl); setState('ready'); }
          } else {
            if (!cancelled) setState('nofile');
          }
          return;
        }

        if (ext === 'pdf') {
          if (manuscriptFile) {
            localObjectUrl = URL.createObjectURL(manuscriptFile);
            if (!cancelled) { setPdfSource({ url: localObjectUrl }); setState('ready'); }
          } else if (manuscriptUrl) {
            const remoteUrl = getRemoteReaderUrl(book);
            if (!remoteUrl) { if (!cancelled) setState('nofile'); return; }
            if (!cancelled) { setPdfSource({ url: remoteUrl }); setState('ready'); }
          } else {
            if (!cancelled) setState('nofile');
          }
          return;
        }

        if (ext === 'docx' || ext === 'doc') {
          const buf = await getDocxArrayBuffer(book, controller.signal, (pct) => {
            if (!cancelled) setLoadProgress(pct);
          });
          if (cancelled) return;
          if (!buf) { setState('nofile'); return; }
          setDocxBuffer(buf);
          setState('ready');
          return;
        }

        if (!cancelled) setState('nofile');
      } catch (e) {
        if (cancelled || e?.name === 'AbortError') return;
        console.error('[FaithfulReader] load error', e);
        setState('error');
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      if (localObjectUrl) URL.revokeObjectURL(localObjectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ext, manuscriptUrl, manuscriptFileName, manuscriptFileSize]);

  if (state === 'loading') {
    const progressText = loadProgress > 0 ? `Loading... ${loadProgress}%` : 'Loading manuscript…';
    return <CenterMessage icon={Loader2} spin title={progressText} />;
  }
  if (state === 'nofile') return <CenterMessage icon={FileText} title="No manuscript uploaded" subtitle="Upload an EPUB, PDF, or DOCX file to preview your book." />;
  if (state === 'error') return <CenterMessage icon={AlertCircle} title="Could not load the manuscript" subtitle="Please re-upload the file and try again." />;

  const coverUrl = book?.cover_url || book?.coverUrl;
  const baseW = VIEW_BASE_WIDTH[viewMode] || VIEW_BASE_WIDTH.desktop;
  const fontPct = Math.round((fontScale || 1) * 100);
  const docWidth = Math.round(baseW * (fontScale || 1));

  let reader;
  if (ext === 'epub') {
    if (!epubSource) return <CenterMessage icon={AlertCircle} title="Could not load the manuscript" subtitle="Please re-upload the file and try again." />;
    reader = <EpubReader source={epubSource} frameWidth={baseW} fontPct={fontPct} coverUrl={coverUrl} />;
  } else if (ext === 'pdf') {
    if (!pdfSource) return <CenterMessage icon={AlertCircle} title="Could not load the manuscript" subtitle="Please re-upload the file and try again." />;
    reader = <PdfReader source={pdfSource} coverUrl={coverUrl} pageWidth={docWidth} />;
  } else if (ext === 'docx' || ext === 'doc') {
    if (!docxBuffer) return <CenterMessage icon={AlertCircle} title="Could not load the manuscript" subtitle="Please re-upload the file and try again." />;
    reader = <DocxReader arrayBuffer={docxBuffer} coverUrl={coverUrl} fontScale={fontScale} frameWidth={baseW} />;
  } else {
    return <CenterMessage icon={FileText} title={`Preview not supported for .${ext || 'this'} files`} subtitle="Supported formats: EPUB, PDF, DOCX." />;
  }

  if (viewMode === 'tablet' || viewMode === 'mobile') {
    return <DeviceFrame type={viewMode}>{reader}</DeviceFrame>;
  }
  return <div className="w-full h-full overflow-hidden bg-gradient-to-b from-slate-100 to-slate-200">{reader}</div>;
}
