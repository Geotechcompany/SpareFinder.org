/**
 * Deep Research Job Service
 * 
 * Manages Deep Research jobs and automatically starts analysis for pending jobs
 */

import { aiAnalysisCrew, CrewProgressUpdate } from './aiAnalysisCrew';
import { api } from '@/lib/api';

interface CrewAnalysisJob {
  id: string;
  user_id: string;
  user_email: string;
  image_url: string;
  image_name: string;
  keywords: string;
  status: string;
  current_stage?: string;
  progress?: number;
  error_message?: string;
  result_data?: any;
  pdf_url?: string;
  created_at: string;
  updated_at?: string;
  completed_at?: string;
}

class CrewAnalysisJobService {
  private processingJobs = new Set<string>();
  private progressCallbacks = new Map<string, (update: CrewProgressUpdate) => void>();

  /**
   * Start analysis for a pending job
   */
  async startAnalysis(job: CrewAnalysisJob, onProgress?: (update: CrewProgressUpdate) => void) {
    // Check if already processing
    if (this.processingJobs.has(job.id)) {
      console.log(`Job ${job.id} is already being processed`);
      return;
    }

    // Mark as processing
    this.processingJobs.add(job.id);
    
    // Store progress callback
    if (onProgress) {
      this.progressCallbacks.set(job.id, onProgress);
    }

    try {
      console.log(`🚀 Starting Deep Research for job ${job.id}`);

      // Convert image URL to blob
      const imageBlob = await this.fetchImageAsBlob(job.image_url);

      // Create analysis request
      const request = {
        email: job.user_email,
        keywords: job.keywords,
        image: imageBlob,
      };

      // Start analysis with progress tracking
      const handleProgress = (update: CrewProgressUpdate) => {
        console.log(`Progress update for job ${job.id}:`, update);
        
        // Call registered callback
        const callback = this.progressCallbacks.get(job.id);
        if (callback) {
          callback(update);
        }

        // Update job in database
        this.updateJobProgress(job.id, update);
      };

      // Use WebSocket for real-time updates
      const result = await aiAnalysisCrew.analyzePartWebSocket(request, handleProgress);

      console.log(`✅ Analysis complete for job ${job.id}:`, result);

      // Mark as complete
      this.processingJobs.delete(job.id);
      this.progressCallbacks.delete(job.id);

      return result;
    } catch (error) {
      console.error(`❌ Analysis failed for job ${job.id}:`, error);
      
      // Mark as failed
      this.processingJobs.delete(job.id);
      this.progressCallbacks.delete(job.id);

      throw error;
    }
  }

  /**
   * Fetch image from URL as Blob
   */
  private async fetchImageAsBlob(imageUrl: string): Promise<Blob> {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    return await response.blob();
  }

  /**
   * Update job progress in database (stub - would need backend endpoint)
   */
  private async updateJobProgress(jobId: string, update: CrewProgressUpdate) {
    // This would call a backend endpoint to update the job progress
    // For now, we just log it
    console.log(`Updating job ${jobId} progress:`, update);
    
    // TODO: Implement backend endpoint to update job progress
    // await api.upload.updateCrewAnalysisJob(jobId, {
    //   current_stage: update.stage,
    //   progress: calculateProgress(update.stage),
    //   status: update.status === 'error' ? 'failed' : 'analyzing',
    //   error_message: update.status === 'error' ? update.message : null,
    // });
  }

  /**
   * Check if a job is currently being processed
   */
  isProcessing(jobId: string): boolean {
    return this.processingJobs.has(jobId);
  }

  /**
   * Register a progress callback for a job
   */
  registerProgressCallback(jobId: string, callback: (update: CrewProgressUpdate) => void) {
    this.progressCallbacks.set(jobId, callback);
  }

  /**
   * Unregister a progress callback for a job
   */
  unregisterProgressCallback(jobId: string) {
    this.progressCallbacks.delete(jobId);
  }
}

// Export singleton instance
export const crewAnalysisJobService = new CrewAnalysisJobService();
export type { CrewAnalysisJob };







