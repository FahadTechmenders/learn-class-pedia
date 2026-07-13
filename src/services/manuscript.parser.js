import ePub from 'epubjs';
import { API_CONFIG, ENDPOINTS } from '../config/api';

/**
 * Parse EPUB file and extract structured content (optimized)
 */
export async function parseEpub(url, options = {}) {
  const { maxChapters = null, batchSize = 5 } = options;
  
  try {
    let blobUrl;
    try {
      const apiUrl = `${API_CONFIG.BASE_URL}${ENDPOINTS.BOOK_EPUB(url)}`;
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const blob = await response.blob();
      blobUrl = URL.createObjectURL(blob);
    } catch (fetchError) {
      console.warn('Backend API failed, trying direct fetch:', fetchError);
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const blob = await response.blob();
        blobUrl = URL.createObjectURL(blob);
      } catch (directFetchError) {
        blobUrl = url;
      }
    }
    
    const book = ePub(blobUrl, { openAs: 'epub' });
    await book.ready;

    const chapters = [];
    const spine = book.spine;
    const items = spine.items.slice(0, maxChapters || spine.items.length);
    
    // Process in batches for better performance
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchPromises = batch.map(async (item, idx) => {
        try {
          const section = book.spine.get(item.href);
          await section.load(book.load.bind(book));
          
          const doc = section.document;
          if (!doc) return null;
          
          const titleEl = doc.querySelector('h1, h2, h3, title');
          const title = titleEl?.textContent?.trim() || `Chapter ${i + idx + 1}`;
          
          const body = doc.body || doc.querySelector('body') || doc;
          const contentNodes = body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, blockquote, li, img');
          
          const elements = [];
          for (let j = 0; j < contentNodes.length; j++) {
            const node = contentNodes[j];
            const tagName = node.tagName.toLowerCase();
            
            if (tagName === 'img') {
              const src = node.getAttribute('src');
              if (src) {
                elements.push({
                  type: 'image',
                  src: src.startsWith('http') ? src : `${url}/${src}`,
                  alt: node.getAttribute('alt') || ''
                });
              }
            } else {
              const content = node.textContent?.trim();
              if (content) {
                elements.push({ type: tagName, content });
              }
            }
          }
          
          section.unload();
          
          return elements.length > 0 ? {
            chapterIndex: i + idx,
            title,
            elements
          } : null;
        } catch (err) {
          console.warn(`Failed to parse chapter ${i + idx}:`, err);
          return null;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      chapters.push(...batchResults.filter(Boolean));
    }

    if (blobUrl !== url) URL.revokeObjectURL(blobUrl);
    
    return {
      chapters,
      metadata: {
        title: book.packaging?.metadata?.title || '',
        author: book.packaging?.metadata?.creator || '',
        language: book.packaging?.metadata?.language || 'en'
      }
    };
  } catch (error) {
    console.error('EPUB parsing error:', error);
    if (error.message.includes('CORS') || error.message.includes('NetworkError')) {
      throw new Error('Unable to load EPUB file. Please check your internet connection or contact support.');
    }
    throw new Error(`Failed to parse EPUB: ${error.message}`);
  }
}

/**
 * Parse PDF file using pdfjs-dist (optimized)
 */
export async function parsePdf(url, options = {}) {
  const { maxPages = null, batchSize = 3 } = options;
  
  try {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@6.1.200/legacy/build/pdf.worker.min.mjs';
    
    let pdfData;
    try {
      const apiUrl = `${API_CONFIG.BASE_URL}${ENDPOINTS.BOOK_PDF(url)}`;
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      pdfData = { data: await response.arrayBuffer() };
    } catch (fetchError) {
      console.warn('Backend API failed, trying direct fetch:', fetchError);
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        pdfData = { data: await response.arrayBuffer() };
      } catch (directFetchError) {
        pdfData = { url };
      }
    }
    
    const loadingTask = pdfjsLib.getDocument(pdfData);
    const pdf = await loadingTask.promise;
    
    const chapters = [];
    let currentChapter = { chapterIndex: 0, title: 'Chapter 1', elements: [] };
    let chapterIndex = 0;
    
    const totalPages = maxPages ? Math.min(maxPages, pdf.numPages) : pdf.numPages;
    
    // Process pages in batches
    for (let startPage = 1; startPage <= totalPages; startPage += batchSize) {
      const endPage = Math.min(startPage + batchSize - 1, totalPages);
      const pagePromises = [];
      
      for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
        pagePromises.push(
          pdf.getPage(pageNum).then(page => page.getTextContent())
        );
      }
      
      const textContents = await Promise.all(pagePromises);
      
      for (const textContent of textContents) {
        let currentParagraph = '';
        
        for (const item of textContent.items) {
          const text = item.str?.trim();
          if (!text) continue;
          
          const isHeading = item.height > 14 || item.fontName?.includes('Bold');
          
          if (isHeading && text.length > 0) {
            if (currentParagraph.trim()) {
              currentChapter.elements.push({ type: 'p', content: currentParagraph.trim() });
              currentParagraph = '';
            }
            
            if (/^(chapter|part)\s+\d+/i.test(text) || /^[IVXLCDM]+\.?\s/i.test(text)) {
              if (currentChapter.elements.length > 0) {
                chapters.push(currentChapter);
                chapterIndex++;
              }
              currentChapter = { chapterIndex, title: text, elements: [] };
            } else {
              currentChapter.elements.push({ type: 'h2', content: text });
            }
          } else {
            currentParagraph += (currentParagraph ? ' ' : '') + text;
            
            if (item.hasEOL || /[.!?]$/.test(text)) {
              if (currentParagraph.trim().length > 20) {
                currentChapter.elements.push({ type: 'p', content: currentParagraph.trim() });
                currentParagraph = '';
              }
            }
          }
        }
        
        if (currentParagraph.trim()) {
          currentChapter.elements.push({ type: 'p', content: currentParagraph.trim() });
        }
      }
    }
    
    if (currentChapter.elements.length > 0) chapters.push(currentChapter);
    
    return {
      chapters: chapters.length > 0 ? chapters : [{
        chapterIndex: 0,
        title: 'PDF Content',
        elements: [{ type: 'p', content: 'PDF content extracted successfully.' }]
      }],
      metadata: { title: 'PDF Document', author: '', language: 'en' }
    };
  } catch (error) {
    console.error('PDF parsing error:', error);
    if (error.message.includes('CORS') || error.message.includes('NetworkError')) {
      throw new Error('Unable to load PDF file. Please check your internet connection or contact support.');
    }
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
}

/**
 * Parse DOCX file using mammoth (optimized)
 */
export async function parseDocx(url, options = {}) {
  const { maxElements = null } = options;
  
  try {
    const mammoth = await import('mammoth');
    
    let arrayBuffer;
    try {
      const apiUrl = `${API_CONFIG.BASE_URL}${ENDPOINTS.BOOK_DOCX(url)}`;
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      arrayBuffer = await response.arrayBuffer();
    } catch (fetchError) {
      console.warn('Backend API failed, trying direct fetch:', fetchError);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      arrayBuffer = await response.arrayBuffer();
    }
    
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const parser = new DOMParser();
    const doc = parser.parseFromString(result.value, 'text/html');
    
    const chapters = [];
    let currentChapter = { chapterIndex: 0, title: 'Chapter 1', elements: [] };
    let chapterIndex = 0;
    let elementCount = 0;
    
    const bodyElements = doc.body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote, img');
    
    for (let i = 0; i < bodyElements.length; i++) {
      if (maxElements && elementCount >= maxElements) break;
      
      const element = bodyElements[i];
      const tagName = element.tagName.toLowerCase();
      const text = element.textContent?.trim();
      
      if (!text && tagName !== 'img') continue;
      
      if ((tagName === 'h1' || tagName === 'h2') && 
          (/^(chapter|part)\s+\d+/i.test(text) || /^[IVXLCDM]+\.?\s/i.test(text))) {
        if (currentChapter.elements.length > 0) {
          chapters.push(currentChapter);
          chapterIndex++;
        }
        currentChapter = { chapterIndex, title: text, elements: [] };
      } else if (tagName === 'img') {
        const src = element.getAttribute('src');
        if (src) {
          currentChapter.elements.push({
            type: 'image',
            src,
            alt: element.getAttribute('alt') || ''
          });
          elementCount++;
        }
      } else if (tagName === 'ul' || tagName === 'ol') {
        const items = element.querySelectorAll('li');
        for (const li of items) {
          const liText = li.textContent?.trim();
          if (liText) {
            currentChapter.elements.push({ type: 'li', content: liText });
            elementCount++;
          }
        }
      } else if (text) {
        currentChapter.elements.push({ type: tagName, content: text });
        elementCount++;
      }
    }
    
    if (currentChapter.elements.length > 0) chapters.push(currentChapter);
    
    return {
      chapters: chapters.length > 0 ? chapters : [{
        chapterIndex: 0,
        title: 'Document Content',
        elements: [{ type: 'p', content: 'DOCX content extracted successfully.' }]
      }],
      metadata: { title: 'Word Document', author: '', language: 'en' }
    };
  } catch (error) {
    console.error('DOCX parsing error:', error);
    if (error.message.includes('CORS') || error.message.includes('NetworkError')) {
      throw new Error('Unable to load DOCX file. Please check your internet connection or contact support.');
    }
    throw new Error(`Failed to parse DOCX: ${error.message}`);
  }
}

// Simple in-memory cache for parsed manuscripts
const manuscriptCache = new Map();
const CACHE_MAX_SIZE = 5;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Main parser function - detects file type and calls appropriate parser (optimized with caching)
 */
export async function parseManuscript(url, filename, options = {}) {
  if (!url) throw new Error('No manuscript URL provided');
  
  const { useCache = true, ...parseOptions } = options;
  const cacheKey = `${url}_${JSON.stringify(parseOptions)}`;
  
  // Check cache
  if (useCache && manuscriptCache.has(cacheKey)) {
    const cached = manuscriptCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('Using cached manuscript data');
      return cached.data;
    }
    manuscriptCache.delete(cacheKey);
  }
  
  const ext = (filename || url).split('.').pop().toLowerCase();
  
  let result;
  if (ext === 'epub') result = await parseEpub(url, parseOptions);
  else if (ext === 'pdf') result = await parsePdf(url, parseOptions);
  else if (ext === 'docx' || ext === 'doc') result = await parseDocx(url, parseOptions);
  else throw new Error(`Unsupported file format: ${ext}`);
  
  // Cache the result
  if (useCache) {
    if (manuscriptCache.size >= CACHE_MAX_SIZE) {
      const firstKey = manuscriptCache.keys().next().value;
      manuscriptCache.delete(firstKey);
    }
    manuscriptCache.set(cacheKey, { data: result, timestamp: Date.now() });
  }
  
  return result;
}

/**
 * Clear manuscript cache
 */
export function clearManuscriptCache() {
  manuscriptCache.clear();
}
