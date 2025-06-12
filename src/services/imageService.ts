// Image Processing Service
export interface ImageMetadata {
  width: number;
  height: number;
  size: number;
  format: string;
  aspectRatio: number;
  quality?: number;
}

export interface ProcessedImage {
  file: File;
  url: string;
  metadata: ImageMetadata;
  thumbnail?: string;
}

export interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  maintainAspectRatio?: boolean;
  generateThumbnail?: boolean;
  thumbnailSize?: number;
}

// Image validation utilities
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const supportedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }
  
  if (!supportedTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: `Unsupported format. Please use: ${supportedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')}` 
    };
  }
  
  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: `File too large. Maximum size: ${maxSize / 1024 / 1024}MB` 
    };
  }
  
  return { valid: true };
};

// Get image metadata from file
export const getImageMetadata = (file: File): Promise<ImageMetadata> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      const metadata: ImageMetadata = {
        width: img.naturalWidth,
        height: img.naturalHeight,
        size: file.size,
        format: file.type,
        aspectRatio: img.naturalWidth / img.naturalHeight,
      };
      
      URL.revokeObjectURL(url);
      resolve(metadata);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
};

// Process and optimize image
export const processImage = async (
  file: File, 
  options: ImageProcessingOptions = {}
): Promise<ProcessedImage> => {
  const {
    maxWidth = 1024,
    maxHeight = 1024,
    quality = 0.8,
    format = 'jpeg',
    maintainAspectRatio = true,
    generateThumbnail = false,
    thumbnailSize = 150
  } = options;

  const metadata = await getImageMetadata(file);
  
  // Calculate new dimensions
  let { width, height } = metadata;
  
  if (width > maxWidth || height > maxHeight) {
    if (maintainAspectRatio) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    } else {
      width = Math.min(width, maxWidth);
      height = Math.min(height, maxHeight);
    }
  }
  
  // Create canvas and process image
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }
  
  canvas.width = width;
  canvas.height = height;
  
  // Load and draw image
  const img = new Image();
  const originalUrl = URL.createObjectURL(file);
  
  return new Promise((resolve, reject) => {
    img.onload = async () => {
      // Draw image to canvas
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to blob
      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            reject(new Error('Failed to process image'));
            return;
          }
          
          const processedFile = new File([blob], file.name, {
            type: `image/${format}`,
            lastModified: Date.now(),
          });
          
          const processedUrl = URL.createObjectURL(processedFile);
          
          let thumbnail: string | undefined;
          
          // Generate thumbnail if requested
          if (generateThumbnail) {
            thumbnail = await generateThumbnailFromCanvas(canvas, thumbnailSize);
          }
          
          const result: ProcessedImage = {
            file: processedFile,
            url: processedUrl,
            metadata: {
              ...metadata,
              width,
              height,
              size: processedFile.size,
              format: processedFile.type,
              quality,
            },
            thumbnail,
          };
          
          URL.revokeObjectURL(originalUrl);
          resolve(result);
        },
        `image/${format}`,
        quality
      );
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(originalUrl);
      reject(new Error('Failed to load image for processing'));
    };
    
    img.src = originalUrl;
  });
};

// Generate thumbnail from canvas
const generateThumbnailFromCanvas = (sourceCanvas: HTMLCanvasElement, size: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const thumbnailCanvas = document.createElement('canvas');
    const ctx = thumbnailCanvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Failed to create thumbnail canvas'));
      return;
    }
    
    // Calculate thumbnail dimensions (square)
    const sourceSize = Math.min(sourceCanvas.width, sourceCanvas.height);
    const scale = size / sourceSize;
    
    thumbnailCanvas.width = size;
    thumbnailCanvas.height = size;
    
    // Calculate source crop
    const cropX = (sourceCanvas.width - sourceSize) / 2;
    const cropY = (sourceCanvas.height - sourceSize) / 2;
    
    // Draw cropped and scaled image
    ctx.drawImage(
      sourceCanvas,
      cropX, cropY, sourceSize, sourceSize,
      0, 0, size, size
    );
    
    thumbnailCanvas.toBlob(
      (blob) => {
        if (blob) {
          const thumbnailUrl = URL.createObjectURL(blob);
          resolve(thumbnailUrl);
        } else {
          reject(new Error('Failed to generate thumbnail'));
        }
      },
      'image/jpeg',
      0.7
    );
  });
};

// Extract colors from image
export const extractImageColors = async (file: File): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }
    
    img.onload = () => {
      // Use small canvas for color sampling
      canvas.width = 50;
      canvas.height = 50;
      
      ctx.drawImage(img, 0, 0, 50, 50);
      
      const imageData = ctx.getImageData(0, 0, 50, 50);
      const colors = new Map<string, number>();
      
      // Sample every 4th pixel
      for (let i = 0; i < imageData.data.length; i += 16) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        
        // Convert to hex
        const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        
        colors.set(hex, (colors.get(hex) || 0) + 1);
      }
      
      // Get top colors
      const sortedColors = Array.from(colors.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([color]) => color);
      
      resolve(sortedColors);
    };
    
    img.onerror = () => reject(new Error('Failed to load image for color extraction'));
    img.src = URL.createObjectURL(file);
  });
};

// Convert file to base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

// Detect if image has transparency
export const hasTransparency = async (file: File): Promise<boolean> => {
  if (file.type !== 'image/png') {
    return false; // Only PNG supports transparency in common formats
  }
  
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Check alpha channel
      for (let i = 3; i < imageData.data.length; i += 4) {
        if (imageData.data[i] < 255) {
          resolve(true);
          return;
        }
      }
      
      resolve(false);
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

// Batch process multiple images
export const processImages = async (
  files: File[],
  options: ImageProcessingOptions = {},
  onProgress?: (processed: number, total: number) => void
): Promise<ProcessedImage[]> => {
  const results: ProcessedImage[] = [];
  
  for (let i = 0; i < files.length; i++) {
    try {
      const processed = await processImage(files[i], options);
      results.push(processed);
      onProgress?.(i + 1, files.length);
    } catch (error) {
      console.error(`Failed to process image ${files[i].name}:`, error);
      // Continue with other images
    }
  }
  
  return results;
};

// Clean up blob URLs to prevent memory leaks
export const cleanupImageUrls = (images: ProcessedImage[]) => {
  images.forEach(image => {
    URL.revokeObjectURL(image.url);
    if (image.thumbnail) {
      URL.revokeObjectURL(image.thumbnail);
    }
  });
};

// Image format conversion
export const convertImageFormat = async (
  file: File,
  targetFormat: 'jpeg' | 'png' | 'webp',
  quality = 0.8
): Promise<File> => {
  const processed = await processImage(file, {
    format: targetFormat,
    quality,
    maxWidth: 2048,
    maxHeight: 2048,
  });
  
  return processed.file;
};

// Service class for easier usage
export class ImageService {
  static async validateAndProcess(
    file: File,
    options: ImageProcessingOptions = {}
  ): Promise<ProcessedImage> {
    // Validate
    const validation = validateImageFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    // Process
    return processImage(file, {
      maxWidth: 1024,
      maxHeight: 1024,
      quality: 0.85,
      generateThumbnail: true,
      ...options,
    });
  }
  
  static async createPreview(file: File): Promise<string> {
    const processed = await this.validateAndProcess(file, {
      maxWidth: 400,
      maxHeight: 400,
      quality: 0.7,
    });
    
    return processed.url;
  }
  
  static cleanup(processed: ProcessedImage) {
    URL.revokeObjectURL(processed.url);
    if (processed.thumbnail) {
      URL.revokeObjectURL(processed.thumbnail);
    }
  }
} 