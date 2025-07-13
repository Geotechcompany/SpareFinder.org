/**
 * Keep-Alive Service for AI Service
 * Pings the AI service periodically to prevent it from sleeping on Render's free tier
 */

const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'https://ai-sparefinder-com.onrender.com';

class KeepAliveService {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly pingInterval = 5 * 60 * 1000; // 5 minutes in milliseconds
  private readonly healthEndpoint = `${AI_SERVICE_URL}/health`;

  /**
   * Start the keep-alive service
   */
  start(): void {
    if (this.intervalId) {
      console.log('Keep-alive service is already running');
      return;
    }

    console.log('Starting AI service keep-alive...');
    
    // Initial ping
    this.pingService();
    
    // Set up interval to ping every 5 minutes
    this.intervalId = setInterval(() => {
      this.pingService();
    }, this.pingInterval);
  }

  /**
   * Stop the keep-alive service
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Keep-alive service stopped');
    }
  }

  /**
   * Ping the AI service health endpoint
   */
  private async pingService(): Promise<void> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(this.healthEndpoint, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        console.log('AI service keep-alive ping successful:', data.status);
      } else {
        console.warn('AI service keep-alive ping failed:', response.status);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('AI service keep-alive ping timed out');
      } else {
        console.warn('AI service keep-alive ping error:', error);
      }
    }
  }

  /**
   * Check if the service is running
   */
  isRunning(): boolean {
    return this.intervalId !== null;
  }
}

// Export singleton instance
export const keepAliveService = new KeepAliveService();

// Auto-start in production
if (import.meta.env.PROD) {
  keepAliveService.start();
}

export default keepAliveService; 