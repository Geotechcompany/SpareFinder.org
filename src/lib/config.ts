// Configuration service for the application
import React from 'react';

export interface AppConfig {
  ai: {
    serviceUrl: string;
    apiKey: string;
    timeout: number;
    maxFileSize: number;
    supportedFormats: string[];
    enableMock: boolean;
  };
  app: {
    name: string;
    version: string;
    environment: 'development' | 'staging' | 'production';
  };
  features: {
    analytics: boolean;
    debug: boolean;
    multipleUploads: boolean;
    batchProcessing: boolean;
  };
  upload: {
    maxFiles: number;
    maxSizePerFile: number;
    allowedTypes: string[];
    compressImages: boolean;
    generateThumbnails: boolean;
  };
}

// Default configuration
const defaultConfig: AppConfig = {
  ai: {
    serviceUrl: 'https://ai-sparefinder-org.onrender.com',
    apiKey: '',
    timeout: 60000,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    supportedFormats: ['image/jpeg', 'image/png', 'image/webp'],
    enableMock: true,
  },
  app: {
    name: 'SpareFinder',
    version: '1.0.0',
    environment: 'development',
  },
  features: {
    analytics: false,
    debug: true,
    multipleUploads: false,
    batchProcessing: false,
  },
  upload: {
    maxFiles: 5,
    maxSizePerFile: 10 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    compressImages: true,
    generateThumbnails: true,
  },
};

// Get environment-specific configuration
const getEnvironmentConfig = (): Partial<AppConfig> => {
  const env = import.meta.env;
  
  return {
    ai: {
      serviceUrl: env.VITE_AI_SERVICE_URL || defaultConfig.ai.serviceUrl,
      apiKey: env.VITE_AI_API_KEY || defaultConfig.ai.apiKey,
      enableMock: env.VITE_ENABLE_MOCK_AI === 'true' || env.NODE_ENV !== 'production',
      timeout: defaultConfig.ai.timeout,
      maxFileSize: defaultConfig.ai.maxFileSize,
      supportedFormats: defaultConfig.ai.supportedFormats,
    },
    app: {
      name: env.VITE_APP_NAME || defaultConfig.app.name,
      version: env.VITE_APP_VERSION || defaultConfig.app.version,
      environment: (env.NODE_ENV as AppConfig['app']['environment']) || 'development',
    },
    features: {
      analytics: env.VITE_ENABLE_ANALYTICS === 'true',
      debug: env.VITE_ENABLE_DEBUG === 'true' || env.NODE_ENV === 'development',
      multipleUploads: env.VITE_ENABLE_MULTIPLE_UPLOADS === 'true',
      batchProcessing: env.VITE_ENABLE_BATCH_PROCESSING === 'true',
    },
  };
};

// Merge configurations
const mergeConfig = (base: AppConfig, override: Partial<AppConfig>): AppConfig => {
  return {
    ...base,
    ai: { ...base.ai, ...override.ai },
    app: { ...base.app, ...override.app },
    features: { ...base.features, ...override.features },
    upload: { ...base.upload, ...override.upload },
  };
};

// Export final configuration
export const config: AppConfig = mergeConfig(defaultConfig, getEnvironmentConfig());

// Configuration utilities
export const isProduction = () => config.app.environment === 'production';
export const isDevelopment = () => config.app.environment === 'development';
export const isDebugEnabled = () => config.features.debug;
export const isMockEnabled = () => config.ai.enableMock;

// Validation
export const validateConfig = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Check required environment variables in production
  if (isProduction()) {
    if (!config.ai.apiKey) {
      errors.push('AI API key is required in production');
    }
    
    if (!config.ai.serviceUrl.startsWith('https://')) {
      errors.push('AI service URL must use HTTPS in production');
    }
  }
  
  // Validate file size limits
  if (config.upload.maxSizePerFile > 50 * 1024 * 1024) {
    errors.push('Max file size should not exceed 50MB');
  }
  
  // Validate timeout
  if (config.ai.timeout < 5000) {
    errors.push('AI service timeout should be at least 5 seconds');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};

// Feature flags
export const useFeatureFlag = (flag: keyof AppConfig['features']): boolean => {
  return config.features[flag];
};

// Dynamic configuration updates (for admin settings)
class ConfigManager {
  private static instance: ConfigManager;
  private currentConfig: AppConfig;
  private listeners: Array<(config: AppConfig) => void> = [];
  
  private constructor() {
    this.currentConfig = config;
  }
  
  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }
  
  getConfig(): AppConfig {
    return { ...this.currentConfig };
  }
  
  updateConfig(updates: Partial<AppConfig>): void {
    this.currentConfig = mergeConfig(this.currentConfig, updates);
    this.notifyListeners();
  }
  
  updateFeatureFlag(flag: keyof AppConfig['features'], value: boolean): void {
    this.currentConfig.features[flag] = value;
    this.notifyListeners();
  }
  
  subscribe(listener: (config: AppConfig) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
  
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentConfig));
  }
  
  // Save configuration to localStorage
  saveToStorage(): void {
    try {
      localStorage.setItem('app-config', JSON.stringify(this.currentConfig));
    } catch (error) {
      console.warn('Failed to save configuration to storage:', error);
    }
  }
  
  // Load configuration from localStorage
  loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('app-config');
      if (stored) {
        const storedConfig = JSON.parse(stored);
        this.currentConfig = mergeConfig(config, storedConfig);
        this.notifyListeners();
      }
    } catch (error) {
      console.warn('Failed to load configuration from storage:', error);
    }
  }
  
  // Reset to default configuration
  reset(): void {
    this.currentConfig = config;
    this.notifyListeners();
    localStorage.removeItem('app-config');
  }
}

export const configManager = ConfigManager.getInstance();

// React hook for configuration
export const useConfig = () => {
  const [currentConfig, setCurrentConfig] = React.useState<AppConfig>(configManager.getConfig());
  
  React.useEffect(() => {
    const unsubscribe = configManager.subscribe(setCurrentConfig);
    return unsubscribe;
  }, []);
  
  return {
    config: currentConfig,
    updateConfig: (updates: Partial<AppConfig>) => configManager.updateConfig(updates),
    updateFeatureFlag: (flag: keyof AppConfig['features'], value: boolean) => 
      configManager.updateFeatureFlag(flag, value),
    reset: () => configManager.reset(),
    save: () => configManager.saveToStorage(),
    load: () => configManager.loadFromStorage(),
  };
};

// Development helpers
export const debugConfig = () => {
  if (isDebugEnabled()) {
    console.group('🔧 App Configuration');
    console.table(config);
    const validation = validateConfig();
    if (!validation.valid) {
      console.warn('❌ Configuration Issues:', validation.errors);
    } else {
      console.log('✅ Configuration is valid');
    }
    console.groupEnd();
  }
};

// Initialize configuration debugging in development
if (isDevelopment()) {
  debugConfig();
} 