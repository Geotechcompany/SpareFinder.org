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