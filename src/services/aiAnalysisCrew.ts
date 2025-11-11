/**
 * AI Analysis Crew Service
 *
 * Integrates with the CrewAI-powered backend for comprehensive part analysis
 * Features:
 * - WebSocket real-time progress updates
 * - Multi-agent analysis (Part Identifier, Research, Suppliers, Report Generator, Email)
 * - GPT-4o Vision image analysis
 * - PDF report generation
 * - Email delivery
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface CrewAnalysisRequest {
  email: string;
  keywords?: string;
  image?: File | Blob;
}

export interface CrewProgressUpdate {
  stage: string;
  message: string;
  status: "in_progress" | "completed" | "error";
  timestamp?: number;
}

export interface CrewAnalysisResult {
  status: "success" | "error";
  message: string;
  email: string;
  error?: string;
}

// Agent stages for tracking
export const CREW_STAGES = {
  IMAGE_ANALYSIS: "image_analysis",
  PART_IDENTIFIER: "part_identifier",
  RESEARCH: "research_agent",
  SUPPLIER_FINDER: "supplier_finder",
  REPORT_GENERATOR: "report_generator",
  DATABASE_STORAGE: "database_storage",
  EMAIL_AGENT: "email_agent",
  COMPLETION: "completion",
  ERROR: "error",
} as const;

export type CrewStage = (typeof CREW_STAGES)[keyof typeof CREW_STAGES];

// Progress callback type
export type CrewProgressCallback = (update: CrewProgressUpdate) => void;

// ============================================================================
// Configuration
// ============================================================================

const AI_CREW_CONFIG = {
  baseUrl: import.meta.env.VITE_AI_CREW_API_URL || "https://aiagent.sparefinder.org",
  wsUrl: import.meta.env.VITE_AI_CREW_WS_URL || "ws://aiagent.sparefinder.org",
  reconnectAttempts: 3,
  reconnectDelay: 2000,
  heartbeatInterval: 30000,
};

// ============================================================================
// AI Analysis Crew Service Class
// ============================================================================

class AIAnalysisCrewService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private progressCallback: CrewProgressCallback | null = null;

  /**
   * Get API health status
   */
  async checkHealth(): Promise<{
    status: string;
    service: string;
    timestamp: string;
  }> {
    const response = await fetch(`${AI_CREW_CONFIG.baseUrl}/health`);

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Start comprehensive analysis via HTTP (no real-time updates)
   */
  async analyzePartHTTP(
    request: CrewAnalysisRequest
  ): Promise<CrewAnalysisResult> {
    try {
      const formData = new FormData();
      formData.append("user_email", request.email);

      if (request.keywords) {
        formData.append("keywords", request.keywords);
      }

      if (request.image) {
        formData.append("file", request.image);
      }

      const response = await fetch(`${AI_CREW_CONFIG.baseUrl}/analyze-part`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Analysis failed");
      }

      const result = await response.json();

      return {
        status: "success",
        message: result.message || "Analysis started successfully",
        email: request.email,
      };
    } catch (error) {
      console.error("HTTP Analysis error:", error);
      return {
        status: "error",
        message: "Failed to start analysis",
        email: request.email,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Start comprehensive analysis via WebSocket (real-time updates)
   */
  async analyzePartWebSocket(
    request: CrewAnalysisRequest,
    onProgress: CrewProgressCallback
  ): Promise<CrewAnalysisResult> {
    return new Promise((resolve, reject) => {
      this.progressCallback = onProgress;

      try {
        // Create WebSocket connection
        this.ws = new WebSocket(`${AI_CREW_CONFIG.wsUrl}/ws/progress`);

        this.ws.onopen = async () => {
          console.log("WebSocket connected to AI Analysis Crew");
          this.reconnectAttempts = 0;
          this.startHeartbeat();

          try {
            // Convert image to base64 if provided
            let imageBase64: string | undefined;

            if (request.image) {
              imageBase64 = await this.fileToBase64(request.image);
            }

            // Send analysis request
            const wsRequest = {
              email: request.email,
              keywords: request.keywords || "",
              image: imageBase64,
            };

            this.ws?.send(JSON.stringify(wsRequest));

            onProgress({
              stage: "setup",
              message: "Initializing AI Analysis Crew...",
              status: "in_progress",
            });
          } catch (error) {
            console.error("Error sending request:", error);
            reject({
              status: "error",
              message: "Failed to send analysis request",
              email: request.email,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        };

        this.ws.onmessage = (event) => {
          try {
            const update: CrewProgressUpdate = JSON.parse(event.data);

            // Call progress callback
            onProgress(update);

            // Check for completion or error
            if (update.stage === "final" || update.stage === "completion") {
              resolve({
                status: "success",
                message: update.message,
                email: request.email,
              });
              this.disconnect();
            } else if (update.status === "error") {
              reject({
                status: "error",
                message: update.message,
                email: request.email,
                error: update.message,
              });
              this.disconnect();
            }
          } catch (error) {
            console.error("Error parsing message:", error);
          }
        };

        this.ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          onProgress({
            stage: "error",
            message: "Connection error occurred",
            status: "error",
          });

          reject({
            status: "error",
            message: "WebSocket connection error",
            email: request.email,
            error: "Connection failed",
          });
        };

        this.ws.onclose = (event) => {
          console.log("WebSocket closed:", event.code, event.reason);
          this.stopHeartbeat();

          // Try to reconnect if not a normal closure
          if (
            event.code !== 1000 &&
            this.reconnectAttempts < AI_CREW_CONFIG.reconnectAttempts
          ) {
            this.reconnect(request, onProgress);
          }
        };
      } catch (error) {
        console.error("WebSocket setup error:", error);
        reject({
          status: "error",
          message: "Failed to establish connection",
          email: request.email,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  }

  /**
   * Convert File/Blob to base64
   */
  private fileToBase64(file: File | Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64 = result.split(",")[1];
        resolve(base64);
      };

      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Reconnect WebSocket
   */
  private reconnect(
    request: CrewAnalysisRequest,
    onProgress: CrewProgressCallback
  ) {
    this.reconnectAttempts++;

    onProgress({
      stage: "reconnecting",
      message: `Reconnecting... (attempt ${this.reconnectAttempts}/${AI_CREW_CONFIG.reconnectAttempts})`,
      status: "in_progress",
    });

    setTimeout(() => {
      this.analyzePartWebSocket(request, onProgress);
    }, AI_CREW_CONFIG.reconnectDelay);
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, AI_CREW_CONFIG.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close(1000, "Normal closure");
      this.ws = null;
    }

    this.progressCallback = null;
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// ============================================================================
// Export Singleton Instance
// ============================================================================

export const aiAnalysisCrew = new AIAnalysisCrewService();

// ============================================================================
// React Hook for Easier Integration
// ============================================================================

export const useAIAnalysisCrew = () => {
  const analyzeWithCrew = async (
    email: string,
    image: File | Blob,
    keywords?: string,
    onProgress?: CrewProgressCallback
  ): Promise<CrewAnalysisResult> => {
    try {
      const request: CrewAnalysisRequest = {
        email,
        keywords,
        image,
      };

      if (onProgress) {
        return await aiAnalysisCrew.analyzePartWebSocket(request, onProgress);
      } else {
        return await aiAnalysisCrew.analyzePartHTTP(request);
      }
    } catch (error) {
      console.error("AI Deep Research error:", error);
      return {
        status: "error",
        message: "Analysis failed",
        email,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };

  const checkServiceHealth = async () => {
    try {
      return await aiAnalysisCrew.checkHealth();
    } catch (error) {
      console.error("Health check failed:", error);
      throw error;
    }
  };

  return {
    analyzeWithCrew,
    checkServiceHealth,
    disconnect: () => aiAnalysisCrew.disconnect(),
    isConnected: () => aiAnalysisCrew.isConnected(),
  };
};

// ============================================================================
// Stage Display Helpers
// ============================================================================

export const getStageDisplayName = (stage: string): string => {
  const stageNames: Record<string, string> = {
    [CREW_STAGES.IMAGE_ANALYSIS]: "Part Being Identified...",
    [CREW_STAGES.PART_IDENTIFIER]: "Part Being Identified...",
    [CREW_STAGES.RESEARCH]: "Technical Research Ongoing...",
    [CREW_STAGES.SUPPLIER_FINDER]: "Supplier Search In Progress...",
    [CREW_STAGES.REPORT_GENERATOR]: "Compiling Structured Report...",
    [CREW_STAGES.DATABASE_STORAGE]: "Finalizing Output for Delivery...",
    [CREW_STAGES.EMAIL_AGENT]: "Finalizing Output for Delivery...",
    [CREW_STAGES.COMPLETION]: "Analysis Ready & Delivery Confirmed",
    completed: "Analysis Ready & Delivery Confirmed",
    setup: "Initializing AI Crew...",
    execution: "Processing...",
    reconnecting: "Reconnecting...",
    initialization: "Initializing...",
    retrying: "Retrying...",
  };

  return stageNames[stage] || stage;
};

export const getStageIcon = (stage: string): string => {
  const stageIcons: Record<string, string> = {
    [CREW_STAGES.IMAGE_ANALYSIS]: "🔍",
    [CREW_STAGES.PART_IDENTIFIER]: "🔬",
    [CREW_STAGES.RESEARCH]: "📊",
    [CREW_STAGES.SUPPLIER_FINDER]: "🏪",
    [CREW_STAGES.REPORT_GENERATOR]: "📄",
    [CREW_STAGES.DATABASE_STORAGE]: "💾",
    [CREW_STAGES.EMAIL_AGENT]: "📧",
    [CREW_STAGES.COMPLETION]: "✅",
    [CREW_STAGES.ERROR]: "❌",
    setup: "⚙️",
    execution: "🚀",
    reconnecting: "🔄",
  };

  return stageIcons[stage] || "📝";
};
