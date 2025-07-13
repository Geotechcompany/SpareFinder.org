import { Router, Request, Response } from 'express';
import axios from 'axios';
import { supabase } from '../server';

const router = Router();

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  error?: string;
  details?: any;
}

interface SystemHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  services: {
    database: HealthCheckResult;
    ai_service: HealthCheckResult;
    storage: HealthCheckResult;
  };
  system: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: string;
    };
  };
}

// Check Supabase database connection
async function checkDatabase(): Promise<HealthCheckResult> {
  try {
    const startTime = Date.now();
    
    // Simple query to check database connectivity
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
      
    const responseTime = Date.now() - startTime;
    
    if (error) {
      return {
        status: 'unhealthy',
        responseTime,
        error: error.message,
        details: { code: error.code, hint: error.hint }
      };
    }
    
    return {
      status: 'healthy',
      responseTime,
      details: { connection: 'active', query: 'successful' }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown database error',
      details: { type: 'connection_error' }
    };
  }
}

// Check AI service availability
async function checkAIService(): Promise<HealthCheckResult> {
  try {
    const aiServiceUrl = process.env.AI_SERVICE_URL;
    
    if (!aiServiceUrl) {
      return {
        status: 'unhealthy',
        error: 'AI service URL not configured',
        details: { configured: false }
      };
    }
    
    const startTime = Date.now();
    
    // Check AI service health endpoint
    const response = await axios.get(`${aiServiceUrl}/health`, {
      timeout: 5000,
      validateStatus: (status) => status < 500
    });
    
    const responseTime = Date.now() - startTime;
    
    if (response.status === 200) {
      return {
        status: 'healthy',
        responseTime,
        details: {
          url: aiServiceUrl,
          service: response.data.service,
          version: response.data.version,
          response_status: response.status
        }
      };
    } else {
      return {
        status: 'degraded',
        responseTime,
        error: `AI service returned status ${response.status}`,
        details: { url: aiServiceUrl, status: response.status }
      };
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return {
        status: 'unhealthy',
        error: error.message,
        details: {
          url: process.env.AI_SERVICE_URL,
          code: error.code,
          status: error.response?.status,
          type: 'network_error'
        }
      };
    }
    
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown AI service error',
      details: { type: 'unknown_error' }
    };
  }
}

// Check Supabase storage
async function checkStorage(): Promise<HealthCheckResult> {
  try {
    const startTime = Date.now();
    const bucketName = process.env.SUPABASE_BUCKET_NAME || 'sparefinder';
    
    // Check if bucket exists and is accessible
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    const responseTime = Date.now() - startTime;
    
    if (error) {
      return {
        status: 'unhealthy',
        responseTime,
        error: error.message,
        details: { operation: 'list_buckets', bucket: bucketName }
      };
    }
    
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      return {
        status: 'degraded',
        responseTime,
        error: `Bucket '${bucketName}' not found`,
        details: { 
          bucket: bucketName, 
          available_buckets: buckets?.map(b => b.name) || []
        }
      };
    }
    
    return {
      status: 'healthy',
      responseTime,
      details: { 
        bucket: bucketName,
        bucket_exists: true,
        total_buckets: buckets.length
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown storage error',
      details: { type: 'storage_error' }
    };
  }
}

// Get system information
function getSystemInfo() {
  const memoryUsage = process.memoryUsage();
  const totalMemory = memoryUsage.heapTotal;
  const usedMemory = memoryUsage.heapUsed;
  const memoryPercentage = (usedMemory / totalMemory) * 100;
  
  return {
    memory: {
      used: Math.round(usedMemory / 1024 / 1024), // MB
      total: Math.round(totalMemory / 1024 / 1024), // MB
      percentage: Math.round(memoryPercentage)
    },
    cpu: {
      usage: 'N/A' // Node.js doesn't provide CPU usage easily
    }
  };
}

// Determine overall system status
function determineOverallStatus(services: SystemHealth['services']): SystemHealth['status'] {
  const statuses = Object.values(services).map(service => service.status);
  
  if (statuses.every(status => status === 'healthy')) {
    return 'healthy';
  } else if (statuses.some(status => status === 'unhealthy')) {
    return 'unhealthy';
  } else {
    return 'degraded';
  }
}

// Main health check endpoint
router.get('/', async (_req: Request, res: Response) => {
  try {
    console.log('🏥 Health check requested');
    
    // Run all health checks in parallel
    const [databaseHealth, aiServiceHealth, storageHealth] = await Promise.all([
      checkDatabase(),
      checkAIService(),
      checkStorage()
    ]);
    
    const services = {
      database: databaseHealth,
      ai_service: aiServiceHealth,
      storage: storageHealth
    };
    
    const systemInfo = getSystemInfo();
    const overallStatus = determineOverallStatus(services);
    
    const healthResponse: SystemHealth = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: Math.floor(process.uptime()),
      services,
      system: systemInfo
    };
    
    // Set appropriate HTTP status code
    const statusCode = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;
    
    console.log(`🏥 Health check completed: ${overallStatus} (${statusCode})`);
    
    res.status(statusCode).json(healthResponse);
    
  } catch (error) {
    console.error('❌ Health check failed:', error);
    
    const errorResponse: SystemHealth = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: Math.floor(process.uptime()),
      services: {
        database: { status: 'unhealthy', error: 'Health check failed' },
        ai_service: { status: 'unhealthy', error: 'Health check failed' },
        storage: { status: 'unhealthy', error: 'Health check failed' }
      },
      system: getSystemInfo()
    };
    
    res.status(503).json(errorResponse);
  }
});

// Simple health check endpoint (for basic monitoring)
router.get('/simple', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime())
  });
});

// Database-specific health check
router.get('/database', async (_req: Request, res: Response) => {
  try {
    const dbHealth = await checkDatabase();
    const statusCode = dbHealth.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      service: 'database',
      ...dbHealth,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      service: 'database',
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// AI service specific health check
router.get('/ai-service', async (_req: Request, res: Response) => {
  try {
    const aiHealth = await checkAIService();
    const statusCode = aiHealth.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      service: 'ai_service',
      ...aiHealth,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      service: 'ai_service',
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Storage specific health check
router.get('/storage', async (_req: Request, res: Response) => {
  try {
    const storageHealth = await checkStorage();
    const statusCode = storageHealth.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      service: 'storage',
      ...storageHealth,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      service: 'storage',
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router; 