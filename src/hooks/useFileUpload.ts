import { useState, useCallback, useRef } from 'react';
import { toast } from '@/hooks/use-toast';
import { validateImageFile, type ProcessedImage, type ImageProcessingOptions } from '@/lib/imageService';
import { config } from '@/lib/config';
import { apiClient } from '@/lib/api';

export interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
  processed?: ProcessedImage;
  status: 'pending' | 'processing' | 'ready' | 'error';
  error?: string;
  progress?: number;
}

export interface UseFileUploadOptions {
  maxFiles?: number;
  accept?: string;
  maxSize?: number;
  onFilesAdded?: (files: UploadedFile[]) => void;
  onFileProcessed?: (file: UploadedFile) => void;
  onFileRemoved?: (fileId: string) => void;
  autoProcess?: boolean;
  processingOptions?: ImageProcessingOptions;
}

interface UploadResponse {
  success: boolean;
  part_info?: {
    name: string;
    part_number?: string;
    category: string;
    manufacturer: string;
    price_range: string;
    confidence_score: number;
    description?: string;
    specifications?: Record<string, any>;
    compatibility?: string[];
    similar_images?: Array<{
      url: string;
      metadata: Record<string, any>;
      similarity_score: number;
      source: string;
      title: string;
      price: string;
    }>;
  };
  error?: string;
}

export interface UseFileUploadReturn {
  files: UploadedFile[];
  isDragActive: boolean;
  isProcessing: boolean;
  addFiles: (files: FileList | File[]) => void;
  removeFile: (fileId: string) => void;
  clearFiles: () => void;
  processFile: (fileId: string) => Promise<void>;
  processAllFiles: () => Promise<void>;
  getRootProps: () => {
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };
  getInputProps: () => {
    type: 'file';
    accept: string;
    multiple: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    ref: React.RefObject<HTMLInputElement>;
  };
  inputRef: React.RefObject<HTMLInputElement>;
  openFileDialog: () => void;
  uploadFile: (file: File) => Promise<UploadResponse>;
  isUploading: boolean;
  error: string | null;
}

export const useFileUpload = (options: UseFileUploadOptions = {}): UseFileUploadReturn => {
  const {
    maxFiles = config.upload.maxFiles,
    accept = 'image/*',
    maxSize = config.upload.maxSizePerFile,
    onFilesAdded,
    onFileProcessed,
    onFileRemoved,
    autoProcess = true,
    processingOptions = {},
  } = options;

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate unique ID for files
  const generateFileId = () => Math.random().toString(36).substr(2, 9);

  // Validate and create uploaded file objects
  const createUploadedFiles = useCallback((fileList: FileList | File[]): UploadedFile[] => {
    const newFiles: UploadedFile[] = [];
    const filesArray = Array.from(fileList);

    for (const file of filesArray) {
      // Validate file
      const validation = validateImageFile(file);
      if (!validation.valid) {
        toast({
          title: 'Invalid File',
          description: `${file.name}: ${validation.error}`,
          variant: 'destructive',
        });
        continue;
      }

      // Check file size
      if (file.size > maxSize) {
        toast({
          title: 'File Too Large',
          description: `${file.name} exceeds ${maxSize / 1024 / 1024}MB limit`,
          variant: 'destructive',
        });
        continue;
      }

      // Create preview URL
      const preview = URL.createObjectURL(file);

      const uploadedFile: UploadedFile = {
        id: generateFileId(),
        file,
        preview,
        status: 'pending',
      };

      newFiles.push(uploadedFile);
    }

    return newFiles;
  }, [maxSize]);

  // Add files
  const addFiles = useCallback((fileList: FileList | File[]) => {
    const newFiles = createUploadedFiles(fileList);
    
    setFiles(prevFiles => {
      const totalFiles = prevFiles.length + newFiles.length;
      
      if (totalFiles > maxFiles) {
        toast({
          title: 'Too Many Files',
          description: `Maximum ${maxFiles} files allowed`,
          variant: 'destructive',
        });
        return prevFiles;
      }

      const updatedFiles = [...prevFiles, ...newFiles];
      
      // Auto-process if enabled
      if (autoProcess) {
        setTimeout(() => {
          newFiles.forEach(file => processFile(file.id));
        }, 100);
      }

      onFilesAdded?.(newFiles);
      return updatedFiles;
    });
  }, [maxFiles, createUploadedFiles, autoProcess, onFilesAdded]);

  // Remove file
  const removeFile = useCallback((fileId: string) => {
    setFiles(prevFiles => {
      const fileToRemove = prevFiles.find(f => f.id === fileId);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      if (fileToRemove?.processed?.url) {
        URL.revokeObjectURL(fileToRemove.processed.url);
      }
      
      const updatedFiles = prevFiles.filter(f => f.id !== fileId);
      onFileRemoved?.(fileId);
      return updatedFiles;
    });
  }, [onFileRemoved]);

  // Clear all files
  const clearFiles = useCallback(() => {
    setFiles(prevFiles => {
      // Clean up URLs
      prevFiles.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
        if (file.processed?.url) {
          URL.revokeObjectURL(file.processed.url);
        }
      });
      return [];
    });
  }, []);

  // Process single file
  const processFile = useCallback(async (fileId: string) => {
    setFiles(prevFiles => 
      prevFiles.map(f => 
        f.id === fileId 
          ? { ...f, status: 'processing' as const, progress: 0 }
          : f
      )
    );

    try {
      const file = files.find(f => f.id === fileId);
      if (!file) return;

      // Simulate processing with progress updates
      const progressInterval = setInterval(() => {
        setFiles(prevFiles => 
          prevFiles.map(f => 
            f.id === fileId && f.progress !== undefined
              ? { ...f, progress: Math.min((f.progress || 0) + 10, 90) }
              : f
          )
        );
      }, 200);

      // Simulate async processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      clearInterval(progressInterval);

      // Mark as ready
      setFiles(prevFiles => {
        const updatedFiles = prevFiles.map(f => 
          f.id === fileId 
            ? { ...f, status: 'ready' as const, progress: 100 }
            : f
        );
        
        const processedFile = updatedFiles.find(f => f.id === fileId);
        if (processedFile) {
          onFileProcessed?.(processedFile);
        }
        
        return updatedFiles;
      });

    } catch (error) {
      setFiles(prevFiles => 
        prevFiles.map(f => 
          f.id === fileId 
            ? { 
                ...f, 
                status: 'error' as const, 
                error: error instanceof Error ? error.message : 'Processing failed',
                progress: undefined 
              }
            : f
        )
      );

      toast({
        title: 'Processing Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    }
  }, [files, onFileProcessed, processingOptions]);

  // Process all files
  const processAllFiles = useCallback(async () => {
    setIsProcessing(true);
    const pendingFiles = files.filter(f => f.status === 'pending');
    
    try {
      await Promise.all(
        pendingFiles.map(file => processFile(file.id))
      );
    } finally {
      setIsProcessing(false);
    }
  }, [files, processFile]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (dragCounter.current === 0) {
      setIsDragActive(true);
    }
    dragCounter.current++;
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragActive(false);
    dragCounter.current = 0;
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      addFiles(droppedFiles);
    }
  }, [addFiles]);

  // File input handler
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      addFiles(selectedFiles);
    }
    // Reset input value to allow selecting the same file again
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [addFiles]);

  // Open file dialog
  const openFileDialog = useCallback(() => {
    inputRef.current?.click();
  }, []);

  // Get root props for drag and drop
  const getRootProps = useCallback(() => ({
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
  }), [handleDragOver, handleDragLeave, handleDrop]);

  // Get input props
  const getInputProps = useCallback(() => ({
    type: 'file' as const,
    accept,
    multiple: maxFiles > 1,
    onChange: handleInputChange,
    ref: inputRef,
  }), [accept, maxFiles, handleInputChange]);

  const uploadFile = async (file: File): Promise<UploadResponse> => {
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload file';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsUploading(false);
    }
  };

  return {
    files,
    isDragActive,
    isProcessing,
    addFiles,
    removeFile,
    clearFiles,
    processFile,
    processAllFiles,
    getRootProps,
    getInputProps,
    inputRef,
    openFileDialog,
    uploadFile,
    isUploading,
    error,
  };
}; 