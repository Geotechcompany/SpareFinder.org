import { Router, Response } from "express";
import { authenticateToken } from "../middleware/auth";
import { AuthRequest } from "../types/auth";
import { supabase } from "../server";
import { emailService } from "../services/email-service";

const router = Router();

// Get user notifications with pagination
router.get("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    // Get notifications with count
    const {
      data: notifications,
      error,
      count,
    } = await supabase
      .from("notifications")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching notifications:", error);
      return res.status(500).json({
        error: "Failed to fetch notifications",
      });
    }

    // Get unread count
    const { count: unreadCount, error: unreadError } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("read", false);

    if (unreadError) {
      console.warn("Error fetching unread count:", unreadError);
    }

    return res.json({
      success: true,
      data: {
        notifications: notifications || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          unreadCount: unreadCount || 0,
        },
      },
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch notifications",
    });
  }
});

// Mark notification as read
router.patch(
  "/:notificationId/read",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const notificationId = req.params.notificationId;

      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId)
        .eq("user_id", userId);

      if (error) {
        console.error("Error marking notification as read:", error);
        return res.status(500).json({
          success: false,
          error: "Failed to mark notification as read",
        });
      }

      return res.json({
        success: true,
        message: "Notification marked as read",
      });
    } catch (error) {
      console.error("Mark notification read error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to mark notification as read",
      });
    }
  }
);

// Mark all notifications as read
router.patch(
  "/mark-all-read",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;

      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", userId)
        .eq("read", false);

      if (error) {
        console.error("Error marking all notifications as read:", error);
        return res.status(500).json({
          error: "Failed to mark all notifications as read",
        });
      }

      return res.json({
        message: "All notifications marked as read",
      });
    } catch (error) {
      console.error("Mark all notifications read error:", error);
      return res.status(500).json({
        error: "Failed to mark all notifications as read",
      });
    }
  }
);

// Delete a notification
router.delete(
  "/:notificationId",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const notificationId = req.params.notificationId;

      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId)
        .eq("user_id", userId);

      if (error) {
        console.error("Error deleting notification:", error);
        return res.status(500).json({
          error: "Failed to delete notification",
        });
      }

      return res.json({
        message: "Notification deleted successfully",
      });
    } catch (error) {
      console.error("Delete notification error:", error);
      return res.status(500).json({
        error: "Failed to delete notification",
      });
    }
  }
);

// Create a notification (for system use)
router.post("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { title, message, type = "info", action_url } = req.body;
    const userId = req.user!.userId;

    if (!title || !message) {
      return res.status(400).json({
        error: "Title and message are required",
      });
    }

    const { data: notification, error } = await supabase
      .from("notifications")
      .insert([
        {
          user_id: userId,
          title,
          message,
          type,
          action_url,
          read: false,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating notification:", error);
      return res.status(500).json({
        error: "Failed to create notification",
      });
    }

    return res.status(201).json({
      message: "Notification created successfully",
      notification,
    });
  } catch (error) {
    console.error("Create notification error:", error);
    return res.status(500).json({
      error: "Failed to create notification",
    });
  }
});

// Get notification statistics
router.get(
  "/stats",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;

      // Get total count
      const { count: totalCount, error: totalError } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      // Get unread count
      const { count: unreadCount, error: unreadError } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("read", false);

      // Get count by type
      const { data: typeStats, error: typeError } = await supabase
        .from("notifications")
        .select("type")
        .eq("user_id", userId);

      if (totalError || unreadError || typeError) {
        console.error("Error fetching notification stats:", {
          totalError,
          unreadError,
          typeError,
        });
        return res.status(500).json({
          error: "Failed to fetch notification statistics",
        });
      }

      const typeCounts = (typeStats || []).reduce((acc, notification) => {
        acc[notification.type] = (acc[notification.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return res.json({
        success: true,
        data: {
          total: totalCount || 0,
          unread: unreadCount || 0,
          read: (totalCount || 0) - (unreadCount || 0),
          byType: typeCounts,
        },
      });
    } catch (error) {
      console.error("Get notification stats error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch notification statistics",
      });
    }
  }
);

// POST /api/notifications/analysis-started
router.post(
  "/analysis-started",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const { analysisId, imageUrl } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
        });
      }

      if (!analysisId) {
        return res.status(400).json({
          success: false,
          error: "Analysis ID is required",
        });
      }

      // Create notification using database function
      const { data: notificationId, error } = await supabase.rpc(
        "create_analysis_started_notification",
        {
          p_user_id: userId,
          p_analysis_id: analysisId,
          p_image_url: imageUrl || null,
        }
      );

      if (error) {
        console.error("Failed to create analysis started notification:", error);
        return res.status(500).json({
          success: false,
          error: "Failed to create notification",
        });
      }

      return res.json({
        success: true,
        data: {
          notificationId,
          message: "Analysis started notification created",
        },
      });
    } catch (error) {
      console.error("Analysis started notification error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to create analysis started notification",
      });
    }
  }
);

// POST /api/notifications/analysis-failed
router.post(
  "/analysis-failed",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const { analysisId, errorMessage, imageUrl } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
        });
      }

      if (!analysisId || !errorMessage) {
        return res.status(400).json({
          success: false,
          error: "Analysis ID and error message are required",
        });
      }

      // Create notification using database function
      const { data: notificationId, error } = await supabase.rpc(
        "create_analysis_failed_notification",
        {
          p_user_id: userId,
          p_analysis_id: analysisId,
          p_error_message: errorMessage,
          p_image_url: imageUrl || null,
        }
      );

      if (error) {
        console.error("Failed to create analysis failed notification:", error);
        return res.status(500).json({
          success: false,
          error: "Failed to create notification",
        });
      }

      return res.json({
        success: true,
        data: {
          notificationId,
          message: "Analysis failed notification created",
        },
      });
    } catch (error) {
      console.error("Analysis failed notification error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to create analysis failed notification",
      });
    }
  }
);

// POST /api/notifications/analysis-processing
router.post(
  "/analysis-processing",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const { analysisId, processingTimeMinutes } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
        });
      }

      if (!analysisId) {
        return res.status(400).json({
          success: false,
          error: "Analysis ID is required",
        });
      }

      // Create notification using database function
      const { data: notificationId, error } = await supabase.rpc(
        "create_analysis_processing_notification",
        {
          p_user_id: userId,
          p_analysis_id: analysisId,
          p_processing_time_minutes: processingTimeMinutes || null,
        }
      );

      if (error) {
        console.error(
          "Failed to create analysis processing notification:",
          error
        );
        return res.status(500).json({
          success: false,
          error: "Failed to create notification",
        });
      }

      return res.json({
        success: true,
        data: {
          notificationId,
          message: "Analysis processing notification created",
        },
      });
    } catch (error) {
      console.error("Analysis processing notification error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to create analysis processing notification",
      });
    }
  }
);

// POST /api/notifications/send-analysis-email
router.post(
  "/send-analysis-email",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const {
        type,
        analysisId,
        errorMessage,
        imageUrl,
        processingTimeMinutes,
      } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
        });
      }

      if (!type || !analysisId) {
        return res.status(400).json({
          success: false,
          error: "Email type and analysis ID are required",
        });
      }

      // Get user email details
      const { data: userDetails, error: userError } = await supabase.rpc(
        "get_user_email_details",
        { p_user_id: userId }
      );

      if (userError || !userDetails || userDetails.length === 0) {
        console.error("Failed to get user email details:", userError);
        return res.status(500).json({
          success: false,
          error: "Failed to get user details",
        });
      }

      const { email, full_name } = userDetails[0];

      // Check if user has email notifications enabled
      const { data: emailEnabled, error: emailError } = await supabase.rpc(
        "user_email_notifications_enabled",
        { p_user_id: userId }
      );

      if (emailError || !emailEnabled) {
        return res.json({
          success: true,
          data: {
            message: "Email notifications disabled for user",
            emailSent: false,
          },
        });
      }

      let emailSent = false;

      // Send appropriate email based on type
      switch (type) {
        case "started":
          emailSent = await emailService.sendAnalysisStartedEmail({
            userEmail: email,
            userName: full_name,
            analysisId,
            imageUrl,
          });
          break;

        case "failed":
          if (!errorMessage) {
            return res.status(400).json({
              success: false,
              error: "Error message is required for failed analysis emails",
            });
          }
          emailSent = await emailService.sendAnalysisFailedEmail({
            userEmail: email,
            userName: full_name,
            analysisId,
            errorMessage,
            imageUrl,
          });
          break;

        case "processing":
          emailSent = await emailService.sendAnalysisProcessingEmail({
            userEmail: email,
            userName: full_name,
            analysisId,
            processingTimeMinutes,
          });
          break;

        default:
          return res.status(400).json({
            success: false,
            error:
              "Invalid email type. Must be 'started', 'failed', or 'processing'",
          });
      }

      return res.json({
        success: true,
        data: {
          message: `Analysis ${type} email ${emailSent ? "sent" : "failed"}`,
          emailSent,
        },
      });
    } catch (error) {
      console.error("Send analysis email error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to send analysis email",
      });
    }
  }
);

export default router;
