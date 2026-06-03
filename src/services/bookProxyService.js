import appSettings from '../config/appSettings';

export const getProxiedBookUrl = (manuscriptUrl) => {
  if (!manuscriptUrl) return null;
  
  const encodedUrl = encodeURIComponent(manuscriptUrl);
  return `${appSettings.api.baseUrl}/books/proxy?url=${encodedUrl}`;
};

export const fetchBookAsBlob = async (manuscriptUrl) => {
  try {
    const proxiedUrl = getProxiedBookUrl(manuscriptUrl);
    
    const response = await fetch(proxiedUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/epub+zip',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch book: ${response.statusText}`);
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Book proxy error:', error);
    throw error;
  }
};
