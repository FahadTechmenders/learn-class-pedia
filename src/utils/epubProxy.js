export const getProxiedEpubUrl = (originalUrl) => {
  if (!originalUrl) return null;
  
  const encodedUrl = encodeURIComponent(originalUrl);
  return `https://cors-anywhere.herokuapp.com/${originalUrl}`;
};

export const downloadEpubAsBlob = async (url) => {
  try {
    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'omit',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch EPUB: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Error downloading EPUB:', error);
    throw error;
  }
};
