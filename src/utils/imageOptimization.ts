
import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js to use browser cache for better performance
env.allowLocalModels = false;
env.useBrowserCache = true;

const MAX_IMAGE_DIMENSION = 1024;

// Cache for optimized images to avoid re-processing
const imageCache = new Map<string, string>();

function resizeImageIfNeeded(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, image: HTMLImageElement) {
  let width = image.naturalWidth;
  let height = image.naturalHeight;

  // Check if resizing is needed
  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    if (width > height) {
      height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
      width = MAX_IMAGE_DIMENSION;
    } else {
      width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
      height = MAX_IMAGE_DIMENSION;
    }
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(image, 0, 0, width, height);
  return { width, height };
}

/**
 * Loads an image from a URL
 */
export const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
};

/**
 * Compresses and optimizes an image
 * @param imageUrl URL of the image to optimize
 * @param quality Quality of the output (0-1)
 * @returns A promise that resolves to the optimized image URL
 */
export const optimizeImage = async (
  imageUrl: string, 
  options: { 
    quality?: number,
    maxWidth?: number
  } = {}
): Promise<string> => {
  const { quality = 0.7, maxWidth = 800 } = options;
  
  // Check cache first
  const cacheKey = `${imageUrl}-${quality}-${maxWidth}`;
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey)!;
  }

  try {
    // Load the image
    const image = await loadImage(imageUrl);
    
    // Create a canvas to draw the image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }
    
    // Resize if needed
    const { width, height } = resizeImageIfNeeded(canvas, ctx, image);
    
    // Compress to WebP format
    const optimizedUrl = canvas.toDataURL('image/webp', quality);
    
    // Cache the result
    imageCache.set(cacheKey, optimizedUrl);
    
    console.log(`Optimized image: ${imageUrl} -> ${Math.round(optimizedUrl.length / 1024)} KB`);
    return optimizedUrl;
  } catch (error) {
    console.error('Error optimizing image:', error);
    // Return original on error
    return imageUrl;
  }
};

// Clean up cache when low on memory
window.addEventListener('beforeunload', () => {
  imageCache.clear();
});
