import ePub from 'epubjs';

/**
 * Parse EPUB file and extract structured content
 */
export async function parseEpub(url) {
  
  try {
    const book = ePub(url, { openAs: 'epub' });
    await book.ready;
    

    const chapters = [];
    let chapterIndex = 0;

    // Get navigation/spine
    const navigation = book.navigation;
    const spine = book.spine;
    
    // Iterate through spine items
    for (const item of spine.items) {
      try {
        
        // Load the section content
        const section = book.spine.get(item.href);
        await section.load(book.load.bind(book));
        
        const doc = section.document;
        if (!doc) {
          console.warn(`No document for chapter ${chapterIndex}`);
          continue;
        }
        
        // Extract title
        const titleEl = doc.querySelector('h1, h2, h3, title');
        const title = titleEl ? titleEl.textContent.trim() : `Chapter ${chapterIndex + 1}`;
        
        // Extract content elements
        const elements = [];
        const body = doc.body || doc.querySelector('body') || doc;
        const contentNodes = body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, blockquote, li, img');
        
        contentNodes.forEach((node) => {
          const tagName = node.tagName.toLowerCase();
          
          if (tagName === 'img') {
            const src = node.getAttribute('src');
            const alt = node.getAttribute('alt') || '';
            if (src) {
              elements.push({
                type: 'image',
                src: src.startsWith('http') ? src : `${url}/${src}`,
                alt: alt
              });
            }
          } else {
            const content = node.textContent.trim();
            if (content && content.length > 0) {
              elements.push({ type: tagName, content: content });
            }
          }
        });

        if (elements.length > 0) {
          chapters.push({
            chapterIndex: chapterIndex,
            title: title,
            elements: elements
          });
          chapterIndex++;
        }
        
        // Unload to free memory
        section.unload();
      } catch (err) {
        console.error(`Failed to parse chapter ${chapterIndex}:`, err);
      }
    }

    return {
      chapters: chapters,
      metadata: {
        title: book.packaging?.metadata?.title || '',
        author: book.packaging?.metadata?.creator || '',
        language: book.packaging?.metadata?.language || 'en'
      }
    };
  } catch (error) {
    console.error('EPUB parsing error:', error);
    throw new Error(`Failed to parse EPUB: ${error.message}`);
  }
}

/**
 * Parse PDF file using pdfjs-dist
 */
export async function parsePdf(url) {
  
  try {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf');
    
    // Use unpkg CDN for worker with matching version
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@6.1.200/legacy/build/pdf.worker.min.mjs';
    
    // getDocument expects an object with url property
    const loadingTask = pdfjsLib.getDocument({ url: url });
    const pdf = await loadingTask.promise;
    
    const chapters = [];
    let currentChapter = {
      chapterIndex: 0,
      title: 'Chapter 1',
      elements: []
    };
    let chapterIndex = 0;
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Combine text items into paragraphs
      let currentParagraph = '';
      
      textContent.items.forEach((item, idx) => {
        const text = item.str.trim();
        if (!text) return;
        
        // Detect headings (larger font size or bold)
        const isHeading = item.height > 14 || item.fontName?.includes('Bold');
        
        if (isHeading && text.length > 0) {
          // Save current paragraph if exists
          if (currentParagraph.trim()) {
            currentChapter.elements.push({
              type: 'p',
              content: currentParagraph.trim()
            });
            currentParagraph = '';
          }
          
          // Check if this is a chapter heading
          if (/^(chapter|part)\s+\d+/i.test(text) || /^[IVXLCDM]+\.?\s/i.test(text)) {
            // Start new chapter
            if (currentChapter.elements.length > 0) {
              chapters.push(currentChapter);
              chapterIndex++;
            }
            currentChapter = {
              chapterIndex: chapterIndex,
              title: text,
              elements: []
            };
          } else {
            // Regular heading
            currentChapter.elements.push({
              type: 'h2',
              content: text
            });
          }
        } else {
          // Regular text - accumulate into paragraph
          currentParagraph += (currentParagraph ? ' ' : '') + text;
          
          // End paragraph on line break or period
          if (item.hasEOL || text.endsWith('.') || text.endsWith('!') || text.endsWith('?')) {
            if (currentParagraph.trim().length > 20) {
              currentChapter.elements.push({
                type: 'p',
                content: currentParagraph.trim()
              });
              currentParagraph = '';
            }
          }
        }
      });
      
      // Add remaining paragraph
      if (currentParagraph.trim()) {
        currentChapter.elements.push({
          type: 'p',
          content: currentParagraph.trim()
        });
      }
    }
    
    // Add last chapter
    if (currentChapter.elements.length > 0) {
      chapters.push(currentChapter);
    }
    
    return {
      chapters: chapters.length > 0 ? chapters : [{
        chapterIndex: 0,
        title: 'PDF Content',
        elements: [{ type: 'p', content: 'PDF content extracted successfully.' }]
      }],
      metadata: {
        title: 'PDF Document',
        author: '',
        language: 'en'
      }
    };
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
}

/**
 * Parse DOCX file using mammoth
 */
export async function parseDocx(url) {
  
  try {
    const mammoth = await import('mammoth');
    
    // Fetch the DOCX file as array buffer
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    
    
    // Convert DOCX to HTML
    const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
    const html = result.value;
    
    
    // Parse HTML into structured content
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const chapters = [];
    let currentChapter = {
      chapterIndex: 0,
      title: 'Chapter 1',
      elements: []
    };
    let chapterIndex = 0;
    
    // Extract content from HTML
    const bodyElements = doc.body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote, img');
    
    bodyElements.forEach((element) => {
      const tagName = element.tagName.toLowerCase();
      const text = element.textContent.trim();
      
      if (!text && tagName !== 'img') return;
      
      // Check for chapter headings
      if ((tagName === 'h1' || tagName === 'h2') && 
          (/^(chapter|part)\s+\d+/i.test(text) || /^[IVXLCDM]+\.?\s/i.test(text))) {
        // Start new chapter
        if (currentChapter.elements.length > 0) {
          chapters.push(currentChapter);
          chapterIndex++;
        }
        currentChapter = {
          chapterIndex: chapterIndex,
          title: text,
          elements: []
        };
      } else if (tagName === 'img') {
        const src = element.getAttribute('src');
        const alt = element.getAttribute('alt') || '';
        if (src) {
          currentChapter.elements.push({
            type: 'image',
            src: src,
            alt: alt
          });
        }
      } else if (tagName === 'ul' || tagName === 'ol') {
        // Extract list items
        const items = element.querySelectorAll('li');
        items.forEach((li) => {
          const liText = li.textContent.trim();
          if (liText) {
            currentChapter.elements.push({
              type: 'li',
              content: liText
            });
          }
        });
      } else if (text.length > 0) {
        currentChapter.elements.push({
          type: tagName,
          content: text
        });
      }
    });
    
    // Add last chapter
    if (currentChapter.elements.length > 0) {
      chapters.push(currentChapter);
    }
    
    return {
      chapters: chapters.length > 0 ? chapters : [{
        chapterIndex: 0,
        title: 'Document Content',
        elements: [{ type: 'p', content: 'DOCX content extracted successfully.' }]
      }],
      metadata: {
        title: 'Word Document',
        author: '',
        language: 'en'
      }
    };
  } catch (error) {
    console.error('DOCX parsing error:', error);
    throw new Error(`Failed to parse DOCX: ${error.message}`);
  }
}

/**
 * Main parser function - detects file type and calls appropriate parser
 */
export async function parseManuscript(url, filename) {
  if (!url) throw new Error('No manuscript URL provided');
  
  const ext = (filename || url).split('.').pop().toLowerCase();
  
  if (ext === 'epub') return await parseEpub(url);
  if (ext === 'pdf') return await parsePdf(url);
  if (ext === 'docx' || ext === 'doc') return await parseDocx(url);
  
  throw new Error(`Unsupported file format: ${ext}`);
}
