interface ImageLoadResult {
  url: string;
  success: boolean;
  error?: Error;
}

export const preloadImage = (url: string): Promise<ImageLoadResult> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ url, success: true });
    img.onerror = (error) => resolve({ 
      url, 
      success: false, 
      error: error instanceof Error ? error : new Error('Image failed to load') 
    });
    img.src = url;
  });
};

export const getOptimizedImageUrl = (url: string, width: number = 100): string => {
  if (!url) return '';
  
  // If using Supabase Storage
  if (url.includes('supabase.co/storage')) {
    // Add any necessary transformations here
    return `${url}?width=${width}&quality=80`;
  }
  
  return url;
};
