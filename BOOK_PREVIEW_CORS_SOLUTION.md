# Book Preview CORS Solution

## Problem
The EPUB book files are hosted on `cdn.classpedia.ai`, but the admin panel runs on `admin.classpedia.ai`. When trying to preview books directly in the browser, CORS (Cross-Origin Resource Sharing) policy blocks the request because the CDN server doesn't include the necessary `Access-Control-Allow-Origin` headers.

**Error:**
```
Access to XMLHttpRequest at 'https://cdn.classpedia.ai/...' from origin 'https://admin.classpedia.ai' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Solutions Implemented

### 1. **Backend Proxy Endpoint (Recommended)**
The app now attempts to fetch EPUB files through a backend proxy endpoint first:

**Endpoint needed:** `GET /api/books/proxy?url={encoded_epub_url}`

**Backend Implementation Required:**
```csharp
// Add this endpoint to your backend API
[HttpGet("proxy")]
public async Task<IActionResult> ProxyBook([FromQuery] string url)
{
    try
    {
        using var httpClient = new HttpClient();
        var response = await httpClient.GetAsync(url);
        
        if (!response.IsSuccessStatusCode)
            return StatusCode((int)response.StatusCode);
        
        var content = await response.Content.ReadAsByteArrayAsync();
        return File(content, "application/epub+zip");
    }
    catch (Exception ex)
    {
        return StatusCode(500, new { error = ex.Message });
    }
}
```

### 2. **Direct Download Fallback**
If the proxy fails or CORS blocks the preview, users can download the book directly using the "Download Book" button.

### 3. **User-Friendly Error Messages**
When preview fails, the app shows:
- Clear error explanation about CORS restrictions
- Instructions to contact system administrator
- Alternative download button

## Permanent Solution (Backend Team Action Required)

### Option A: Enable CORS on CDN
Add these headers to the CDN server (`cdn.classpedia.ai`):

```
Access-Control-Allow-Origin: https://admin.classpedia.ai
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

**For CloudFlare CDN:**
1. Go to CloudFlare Dashboard
2. Select your domain
3. Go to "Transform Rules" → "Modify Response Header"
4. Add rule:
   - If: Hostname equals `cdn.classpedia.ai`
   - Then: Set header `Access-Control-Allow-Origin` to `https://admin.classpedia.ai`

**For AWS CloudFront:**
1. Go to CloudFront Distribution
2. Edit Behaviors
3. Add Response Headers Policy with CORS settings

### Option B: Use Backend Proxy (Current Implementation)
Implement the proxy endpoint in your backend API as shown above. This is already integrated in the frontend.

## Files Modified

1. **`src/components/EpubReader.jsx`**
   - Added EPUB reader with CORS handling
   - Tries backend proxy first, falls back to direct access
   - Shows user-friendly error messages with download option

2. **`src/services/bookProxyService.js`**
   - Service to generate proxied URLs
   - Handles book fetching through backend

3. **`src/pages/Admin/pages/BookManagement/BookManagement.jsx`**
   - Added "Preview Book Content" button
   - Added "Download Book" button as fallback
   - Integrated EpubReader component

4. **`package.json`**
   - Added `epubjs` (v0.3.93) for EPUB rendering
   - Added `react-reader` (v2.0.15) for React integration

## Testing

### Test Preview:
1. Go to Book Management
2. Click on any book to view details
3. Click "Preview Book Content"
4. If CORS is enabled: Book preview loads
5. If CORS blocked: Error message with download option

### Test Download:
1. Go to Book Management
2. Click on any book to view details
3. Click "Download Book"
4. File downloads directly

## Next Steps

**For Backend Team:**
- [ ] Implement the `/api/books/proxy` endpoint
- [ ] OR enable CORS on `cdn.classpedia.ai`

**For DevOps Team:**
- [ ] Configure CDN CORS headers
- [ ] Test cross-origin requests

**For Frontend Team:**
- [x] Implement EPUB reader component
- [x] Add error handling
- [x] Add download fallback
- [x] Test user experience
