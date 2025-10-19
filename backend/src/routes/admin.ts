import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "../server";
import {
  authenticateToken,
  requireAdmin,
  requireSuperAdmin,
} from "../middleware/auth";
import { AuthRequest } from "../types/auth";
import { emailService } from "../services/email-service";

// Create a separate Supabase client for admin operations that bypasses RLS
const adminSupabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const router = Router();

// Get subscribed users (admin only)
router.get(
  "/subscribers",
  [authenticateToken, requireAdmin],
  async (req: AuthRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const tier = req.query.tier as string;
      const status = req.query.status as string;
      const offset = (page - 1) * limit;

      console.log("📊 Fetching subscribed users with filters:", {
        page,
        limit,
        tier,
        status,
      });

      // Build query for subscriptions with user profiles using admin client
      let query = adminSupabase
        .from("subscriptions")
        .select(
          `
          *,
          profiles(
            id,
            email,
            full_name,
            company,
            created_at,
            updated_at
          )
        `,
          { count: "exact" }
        )
        .order("created_at", { ascending: false });

      // Apply tier filter if provided
      if (tier && tier !== "all") {
        query = query.eq("tier", tier);
      }

      // Apply status filter if provided
      if (status && status !== "all") {
        query = query.eq("status", status);
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      const { data: subscribers, error, count } = await query;

      if (error) {
        console.error("Subscribers fetch error:", error);
        return res.status(500).json({
          success: false,
          error: "Subscribers fetch failed",
          message: "Failed to retrieve subscribed users from database",
        });
      }

      console.log(
        "📊 Successfully fetched subscribers:",
        subscribers?.length || 0
      );
      console.log(
        "📊 Raw subscribers data:",
        JSON.stringify(subscribers, null, 2)
      );

      // Get subscription statistics using admin client
      const { data: stats } = await adminSupabase
        .from("subscriptions")
        .select("tier, status");

      const subscriptionStats = {
        total: count || 0,
        by_tier: {
          free: 0,
          pro: 0,
          enterprise: 0,
        },
        by_status: {
          active: 0,
          canceled: 0,
          past_due: 0,
          unpaid: 0,
          trialing: 0,
        },
      };

      if (stats) {
        stats.forEach((sub) => {
          if (sub.tier)
            subscriptionStats.by_tier[
              sub.tier as keyof typeof subscriptionStats.by_tier
            ]++;
          if (sub.status)
            subscriptionStats.by_status[
              sub.status as keyof typeof subscriptionStats.by_status
            ]++;
        });
      }

      const response = {
        success: true,
        data: {
          subscribers: subscribers || [],
          pagination: {
            page,
            limit,
            total: count || 0,
            pages: Math.ceil((count || 0) / limit),
          },
          statistics: subscriptionStats,
        },
      };

      console.log(
        "📊 Sending response with subscribers:",
        response.data.subscribers.length
      );
      console.log("📊 Response pagination:", response.data.pagination);

      return res.json(response);
    } catch (error) {
      console.error("Get subscribers error:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "An unexpected error occurred while fetching subscribed users",
      });
    }
  }
);

// Get all users (admin only)
router.get(
  "/users",
  [authenticateToken, requireAdmin],
  async (req: AuthRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const search = req.query.search as string;
      const roleFilter = req.query.role as string;
      const offset = (page - 1) * limit;

      console.log("📋 Fetching users with filters:", {
        page,
        limit,
        search,
        roleFilter,
      });

      // Skip the expensive sync operation for now
      // await syncAuthUsersToProfiles();

      // Use direct profiles table query for better performance
      let query = supabase
        .from("profiles")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      // Apply search filter if provided
      if (search && search.trim()) {
        query = query.or(
          `email.ilike.%${search}%,full_name.ilike.%${search}%,company.ilike.%${search}%`
        );
      }

      // Apply role filter if provided
      if (roleFilter && roleFilter !== "all") {
        query = query.eq("role", roleFilter);
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      const { data: users, error, count } = await query;

      if (error) {
        console.error("Users fetch error:", error);
        return res.status(500).json({
          success: false,
          error: "Users fetch failed",
          message: "Failed to retrieve users from database",
        });
      }

      console.log("📋 Successfully fetched users:", users?.length || 0);

      return res.json({
        success: true,
        data: {
          users: users || [],
          pagination: {
            page,
            limit,
            total: count || 0,
            pages: Math.ceil((count || 0) / limit),
          },
        },
      });
    } catch (error) {
      console.error("Get users error:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "An unexpected error occurred while fetching users",
      });
    }
  }
);

// Update user role (admin only)
router.patch(
  "/users/:userId/role",
  [authenticateToken, requireAdmin],
  async (req: AuthRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (!role || !["user", "admin", "super_admin"].includes(role)) {
        return res.status(400).json({
          error: "Invalid role",
          message: "Role must be one of: user, admin, super_admin",
        });
      }

      const { data: updatedUser, error } = await supabase
        .from("profiles")
        .update({ role, updated_at: new Date().toISOString() })
        .eq("id", userId)
        .select()
        .single();

      if (error) {
        console.error("User role update error:", error);
        return res.status(500).json({
          error: "Role update failed",
          message: "Failed to update user role",
        });
      }

      return res.json({
        success: true,
        message: "User role updated successfully",
        data: {
          user: updatedUser,
        },
      });
    } catch (error) {
      console.error("Update user role error:", error);
      return res.status(500).json({
        error: "Internal server error",
        message: "An unexpected error occurred while updating user role",
      });
    }
  }
);

// Delete user (admin only)
router.delete(
  "/users/:userId",
  [authenticateToken, requireAdmin],
  async (req: AuthRequest, res: Response) => {
    try {
      const { userId } = req.params;

      // Prevent self-deletion
      if (userId === req.user!.userId) {
        return res.status(400).json({
          error: "Cannot delete own account",
          message: "Administrators cannot delete their own account",
        });
      }

      // Delete user (cascading deletes will handle related data)
      const { error } = await supabase.auth.admin.deleteUser(userId);

      if (error) {
        console.error("User deletion error:", error);
        return res.status(500).json({
          error: "User deletion failed",
          message: "Failed to delete user",
        });
      }

      return res.json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error) {
      console.error("Delete user error:", error);
      return res.status(500).json({
        error: "Internal server error",
        message: "An unexpected error occurred while deleting user",
      });
    }
  }
);

// Get system statistics (admin only)
router.get(
  "/stats",
  [authenticateToken, requireAdmin],
  async (_req: AuthRequest, res: Response) => {
    try {
      console.log("📊 Fetching admin statistics...");

      // Get basic statistics without the expensive sync operation
      const [
        { count: userCount },
        { count: searchCount },
        { count: activeUsers },
        { data: recentSearches },
        { data: topUsers },
      ] = await Promise.all([
        // Total users
        supabase.from("profiles").select("*", { count: "exact", head: true }),

        // Total searches
        supabase
          .from("part_searches")
          .select("*", { count: "exact", head: true }),

        // Active users (last 30 days) - users who have updated their profile or logged in recently
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .gte(
            "updated_at",
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
          ),

        // Recent searches
        supabase
          .from("part_searches")
          .select(
            `
          id, created_at, confidence_score, processing_time, status,
          profiles!inner(full_name, email)
        `
          )
          .order("created_at", { ascending: false })
          .limit(10),

        // Top users by search count
        supabase
          .from("part_searches")
          .select(
            `
          user_id,
          profiles!inner(full_name, email),
          count:id.count()
        `
          )
          .order("count", { ascending: false })
          .limit(5),
      ]);

      // Calculate success rate
      const { data: successfulSearches } = await supabase
        .from("part_searches")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed")
        .gt("confidence_score", 0.7);

      const successRate =
        searchCount && searchCount > 0
          ? ((successfulSearches?.length || 0) / searchCount) * 100
          : 0;

      // Calculate additional metrics for sidebar
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Get recent activity counts
      const [
        { count: searchesToday },
        { count: newUsersToday },
        { count: searchesThisWeek },
      ] = await Promise.all([
        supabase
          .from("part_searches")
          .select("*", { count: "exact", head: true })
          .gte("created_at", last24Hours.toISOString()),

        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .gte("created_at", last24Hours.toISOString()),

        supabase
          .from("part_searches")
          .select("*", { count: "exact", head: true })
          .gte("created_at", lastWeek.toISOString()),
      ]);

      // System health check
      const systemHealth = "healthy";
      const pendingTasks = 0;
      const recentAlerts = 0;

      console.log(
        `📊 User count: ${userCount}, Active users: ${activeUsers}, Total searches: ${searchCount}`
      );

      return res.json({
        statistics: {
          total_users: userCount || 0,
          total_searches: searchCount || 0,
          active_users: activeUsers || 0,
          success_rate: Math.round(successRate * 100) / 100,
          recent_searches: recentSearches || [],
          top_users: topUsers || [],
          system_metrics: [],
          // Additional sidebar metrics
          searches_today: searchesToday || 0,
          new_users_today: newUsersToday || 0,
          searches_this_week: searchesThisWeek || 0,
          system_health: systemHealth,
          pending_tasks: pendingTasks,
          recent_alerts: recentAlerts,
          // Performance metrics
          avg_response_time: 0,
          cpu_usage: 0,
          memory_usage: 0,
          disk_usage: 0,
        },
      });
    } catch (error) {
      console.error("Get stats error:", error);
      return res.status(500).json({
        error: "Internal server error",
        message: "An unexpected error occurred while fetching statistics",
      });
    }
  }
);

// Get system analytics (admin only)
router.get(
  "/analytics",
  [authenticateToken, requireAdmin],
  async (req: AuthRequest, res: Response) => {
    try {
      const timeRange = (req.query.range as string) || "30d";

      let startDate: Date;
      switch (timeRange) {
        case "7d":
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30d":
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "90d":
          startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      }

      // Get daily search counts
      const { data: dailySearches } = await supabase
        .from("part_searches")
        .select("created_at")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true });

      // Get daily user registrations
      const { data: dailyRegistrations } = await supabase
        .from("profiles")
        .select("created_at")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true });

      // Process data for charts
      const searchesByDay =
        dailySearches?.reduce((acc: any, search) => {
          const date = new Date(search.created_at).toISOString().split("T")[0];
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {}) || {};

      const registrationsByDay =
        dailyRegistrations?.reduce((acc: any, user) => {
          const date = new Date(user.created_at).toISOString().split("T")[0];
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {}) || {};

      return res.json({
        analytics: {
          searches_by_day: searchesByDay,
          registrations_by_day: registrationsByDay,
          time_range: timeRange,
        },
      });
    } catch (error) {
      console.error("Get analytics error:", error);
      return res.status(500).json({
        error: "Internal server error",
        message: "An unexpected error occurred while fetching analytics",
      });
    }
  }
);

// Get all searches with filters (admin only)
router.get(
  "/searches",
  [authenticateToken, requireAdmin],
  async (req: AuthRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const status = req.query.status as string;
      const userId = req.query.userId as string;
      const offset = (page - 1) * limit;

      let query = supabase
        .from("part_searches")
        .select(
          `
        *,
        profiles!inner(full_name, email)
      `,
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) {
        query = query.eq("status", status);
      }

      if (userId) {
        query = query.eq("user_id", userId);
      }

      const { data: searches, error, count } = await query;

      if (error) {
        console.error("Searches fetch error:", error);
        return res.status(500).json({
          error: "Searches fetch failed",
          message: "Failed to retrieve searches",
        });
      }

      return res.json({
        searches,
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit),
        },
      });
    } catch (error) {
      console.error("Get searches error:", error);
      return res.status(500).json({
        error: "Internal server error",
        message: "An unexpected error occurred while fetching searches",
      });
    }
  }
);

// AI Models Management
router.get(
  "/ai-models",
  [authenticateToken, requireAdmin],
  async (_req: AuthRequest, res: Response) => {
    try {
      const { data: models, error } = await supabase
        .from("ai_models")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("AI models fetch error:", error);
        return res.status(500).json({
          error: "AI models fetch failed",
          message: "Failed to retrieve AI models",
        });
      }

      return res.json({ models: models || [] });
    } catch (error) {
      console.error("Get AI models error:", error);
      return res.status(500).json({
        error: "Internal server error",
        message: "An unexpected error occurred while fetching AI models",
      });
    }
  }
);

router.post(
  "/ai-models",
  [authenticateToken, requireAdmin],
  async (req: AuthRequest, res: Response) => {
    try {
      const { provider, model_name, api_key, description } = req.body;

      if (!provider || !model_name || !api_key) {
        return res.status(400).json({
          error: "Missing required fields",
          message: "Provider, model name, and API key are required",
        });
      }

      const { data: model, error } = await supabase
        .from("ai_models")
        .insert({
          provider,
          model_name,
          api_key,
          description,
          status: "inactive",
        })
        .select()
        .single();

      if (error) {
        console.error("AI model creation error:", error);
        return res.status(500).json({
          error: "AI model creation failed",
          message: "Failed to create AI model",
        });
      }

      return res.json({
        message: "AI model created successfully",
        model,
      });
    } catch (error) {
      console.error("Create AI model error:", error);
      return res.status(500).json({
        error: "Internal server error",
        message: "An unexpected error occurred while creating AI model",
      });
    }
  }
);

router.patch(
  "/ai-models/:id",
  [authenticateToken, requireAdmin],
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const { data: model, error } = await supabase
        .from("ai_models")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("AI model update error:", error);
        return res.status(500).json({
          error: "AI model update failed",
          message: "Failed to update AI model",
        });
      }

      return res.json({
        message: "AI model updated successfully",
        model,
      });
    } catch (error) {
      console.error("Update AI model error:", error);
      return res.status(500).json({
        error: "Internal server error",
        message: "An unexpected error occurred while updating AI model",
      });
    }
  }
);

// Payment Methods Management
router.get(
  "/payment-methods",
  [authenticateToken, requireAdmin],
  async (_req: AuthRequest, res: Response) => {
    try {
      const { data: methods, error } = await supabase
        .from("payment_methods")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Payment methods fetch error:", error);
        return res.status(500).json({
          error: "Payment methods fetch failed",
          message: "Failed to retrieve payment methods",
        });
      }

      return res.json({ methods: methods || [] });
    } catch (error) {
      console.error("Get payment methods error:", error);
      return res.status(500).json({
        error: "Internal server error",
        message: "An unexpected error occurred while fetching payment methods",
      });
    }
  }
);

router.post(
  "/payment-methods",
  [authenticateToken, requireAdmin],
  async (req: AuthRequest, res: Response) => {
    try {
      const { name, provider, api_key, secret_key, description } = req.body;

      if (!name || !provider || !api_key || !secret_key) {
        return res.status(400).json({
          error: "Missing required fields",
          message: "Name, provider, API key, and secret key are required",
        });
      }

      const { data: method, error } = await supabase
        .from("payment_methods")
        .insert({
          name,
          provider,
          api_key,
          secret_key,
          description,
          status: "inactive",
        })
        .select()
        .single();

      if (error) {
        console.error("Payment method creation error:", error);
        return res.status(500).json({
          error: "Payment method creation failed",
          message: "Failed to create payment method",
        });
      }

      return res.json({
        message: "Payment method created successfully",
        method,
      });
    } catch (error) {
      console.error("Create payment method error:", error);
      return res.status(500).json({
        error: "Internal server error",
        message: "An unexpected error occurred while creating payment method",
      });
    }
  }
);

// Delete payment method (admin only)
router.delete(
  "/payment-methods/:id",
  [authenticateToken, requireAdmin],
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          error: "Missing payment method ID",
          message: "Payment method ID is required",
        });
      }

      // Check if payment method exists
      const { data: existingMethod, error: checkError } = await supabase
        .from("payment_methods")
        .select("id, name, status")
        .eq("id", id)
        .single();

      if (checkError || !existingMethod) {
        return res.status(404).json({
          error: "Payment method not found",
          message: "The specified payment method does not exist",
        });
      }

      // Prevent deletion of active payment methods
      if (existingMethod.status === "active") {
        return res.status(400).json({
          error: "Cannot delete active payment method",
          message: "Please disable the payment method before deleting it",
        });
      }

      // Delete the payment method
      const { error: deleteError } = await supabase
        .from("payment_methods")
        .delete()
        .eq("id", id);

      if (deleteError) {
        console.error("Payment method deletion error:", deleteError);
        return res.status(500).json({
          error: "Payment method deletion failed",
          message: "Failed to delete payment method",
        });
      }

      return res.json({
        success: true,
        message: `Payment method "${existingMethod.name}" deleted successfully`,
      });
    } catch (error) {
      console.error("Delete payment method error:", error);
      return res.status(500).json({
        error: "Internal server error",
        message: "An unexpected error occurred while deleting payment method",
      });
    }
  }
);

// Get SMTP Configuration for AI Service
router.get(
  "/smtp-config",
  [authenticateToken, requireAdmin],
  async (_req: AuthRequest, res: Response) => {
    try {
      // Get SMTP settings from database
      const { data: smtpSettings, error } = await supabase
        .from("system_settings")
        .select("setting_key, setting_value")
        .eq("category", "email");

      if (error) {
        console.error("Failed to fetch SMTP settings:", error);
        return res.status(500).json({
          error: "Failed to fetch SMTP settings",
          message: "Could not retrieve SMTP configuration",
        });
      }

      // Convert settings to object
      const settings: Record<string, any> = {};
      smtpSettings?.forEach((setting) => {
        settings[setting.setting_key] = setting.setting_value;
      });

      // Check if email notifications are enabled
      const { data: notificationSettings } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("category", "notifications")
        .eq("setting_key", "email_enabled")
        .single();

      const emailEnabled =
        notificationSettings?.setting_value === true ||
        notificationSettings?.setting_value === "true" ||
        process.env.EMAIL_ENABLED === "true";

      if (!emailEnabled) {
        return res.json({
          success: false,
          message: "Email notifications are disabled",
          enabled: false,
        });
      }

      // Return SMTP configuration
      const smtpConfig = {
        host: settings.smtp_host || process.env.SMTP_HOST || "smtp.gmail.com",
        port:
          parseInt(settings.smtp_port) ||
          parseInt(process.env.SMTP_PORT || "587"),
        secure:
          settings.smtp_secure === "true" || process.env.SMTP_SECURE === "true",
        user: settings.smtp_user || process.env.SMTP_USER,
        password:
          settings.smtp_password ||
          process.env.SMTP_PASS ||
          process.env.SMTP_PASSWORD,
        from_name: settings.smtp_from_name || "SpareFinder",
        from_email: settings.smtp_user || process.env.SMTP_USER,
      };

      // Validate required settings
      if (!smtpConfig.user || !smtpConfig.password) {
        return res.json({
          success: false,
          message: "SMTP credentials not configured",
          enabled: false,
        });
      }

      return res.json({
        success: true,
        enabled: true,
        config: smtpConfig,
      });
    } catch (error) {
      console.error("Get SMTP config error:", error);
      return res.status(500).json({
        error: "Internal server error",
        message: "Failed to get SMTP configuration",
      });
    }
  }
);

// Get SMTP Configuration for AI Service (API Key Authentication)
router.get("/ai/smtp-config", async (req: Request, res: Response) => {
  try {
    // Check API key authentication
    const apiKey = req.headers["x-api-key"] as string;
    const expectedApiKey = process.env.AI_SERVICE_API_KEY;

    if (!apiKey || !expectedApiKey || apiKey !== expectedApiKey) {
      console.warn(
        "Invalid or missing API key for AI service SMTP config request"
      );
      return res.status(401).json({
        success: false,
        enabled: false,
        message: "Unauthorized: Invalid API key",
      });
    }

    console.log("✅ AI service authenticated for SMTP config request");

    // Get SMTP settings from database
    const { data: smtpSettings, error } = await supabase
      .from("system_settings")
      .select("setting_key, setting_value")
      .eq("category", "email");

    if (error) {
      console.error("Failed to fetch SMTP settings:", error);
      return res.status(500).json({
        success: false,
        enabled: false,
        message: "Could not retrieve SMTP configuration",
      });
    }

    // Convert settings to object
    const settings: Record<string, any> = {};
    smtpSettings?.forEach((setting) => {
      settings[setting.setting_key] = setting.setting_value;
    });

    // Check if email notifications are enabled
    const { data: notificationSettings } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("category", "notifications")
      .eq("setting_key", "email_enabled")
      .single();

    const emailEnabled =
      notificationSettings?.setting_value === true ||
      notificationSettings?.setting_value === "true" ||
      process.env.EMAIL_ENABLED === "true";

    if (!emailEnabled) {
      return res.json({
        success: false,
        enabled: false,
        message: "Email notifications are disabled",
      });
    }

    // Return SMTP configuration
    const smtpConfig = {
      host: settings.smtp_host || process.env.SMTP_HOST || "smtp.gmail.com",
      port:
        parseInt(settings.smtp_port) ||
        parseInt(process.env.SMTP_PORT || "587"),
      secure:
        settings.smtp_secure === "true" || process.env.SMTP_SECURE === "true",
      user: settings.smtp_user || process.env.SMTP_USER,
      password:
        settings.smtp_password ||
        process.env.SMTP_PASS ||
        process.env.SMTP_PASSWORD,
      from_name: settings.smtp_from_name || "SpareFinder",
      from_email: settings.smtp_user || process.env.SMTP_USER,
    };

    // Validate required settings
    if (!smtpConfig.user || !smtpConfig.password) {
      return res.json({
        success: false,
        enabled: false,
        message: "SMTP credentials not configured",
      });
    }

    console.log("📧 Returning SMTP config to AI service:", {
      host: smtpConfig.host,
      port: smtpConfig.port,
      user: smtpConfig.user,
      enabled: emailEnabled,
    });

    return res.json({
      success: true,
      enabled: true,
      config: smtpConfig,
    });
  } catch (error) {
    console.error("Error fetching SMTP config for AI service:", error);
    return res.status(500).json({
      success: false,
      enabled: false,
      message: "Failed to fetch SMTP configuration",
    });
  }
});

// Email Templates Management
router.get(
  "/email-templates",
  [authenticateToken, requireAdmin],
  async (_req: AuthRequest, res: Response) => {
    try {
      const { data: templates, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Email templates fetch error:", error);
        return res.status(500).json({
          error: "Email templates fetch failed",
          message: "Failed to retrieve email templates",
        });
      }

      return res.json({
        success: true,
        templates: templates || [],
      });
    } catch (error) {
      console.error("Get email templates error:", error);
      return res.status(500).json({
        error: "Internal server error",
        message: "An unexpected error occurred while fetching email templates",
      });
    }
  }
);

// Create new email template
router.post(
  "/email-templates",
  [authenticateToken, requireSuperAdmin],
  async (req: AuthRequest, res: Response) => {
    try {
      const {
        name,
        subject,
        html_content,
        text_content,
        status,
        description,
        variables,
      } = req.body;

      if (!name || !subject) {
        return res.status(400).json({
          error: "Invalid template data",
          message: "Name and subject are required",
        });
      }

      const { data: template, error } = await supabase
        .from("email_templates")
        .insert([
          {
            name,
            subject,
            html_content: html_content || null,
            text_content: text_content || null,
            status: status || "draft",
            description: description || null,
            variables: variables || [],
            created_by: req.user!.userId,
            updated_by: req.user!.userId,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error("Create template error:", error);
        return res.status(500).json({
          error: "Failed to create template",
          message: "Failed to create email template",
        });
      }

      return res.status(201).json({
        success: true,
        message: "Email template created successfully",
        data: template,
      });
    } catch (error) {
      console.error("Create email template error:", error);
      return res.status(500).json({
        error: "Internal server error",
        message: "Failed to create email template",
      });
    }
  }
);

// Update email template
router.put(
  "/email-templates/:id",
  [authenticateToken, requireSuperAdmin],
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const {
        name,
        subject,
        html_content,
        text_content,
        status,
        description,
        variables,
      } = req.body;

      if (!name || !subject) {
        return res.status(400).json({
          error: "Invalid template data",
          message: "Name and subject are required",
        });
      }

      const { data: template, error } = await supabase
        .from("email_templates")
        .update({
          name,
          subject,
          html_content: html_content || null,
          text_content: text_content || null,
          status: status || "draft",
          description: description || null,
          variables: variables || [],
          updated_by: req.user!.userId,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Update template error:", error);
        return res.status(500).json({
          error: "Failed to update template",
          message: "Failed to update email template",
        });
      }

      if (!template) {
        return res.status(404).json({
          error: "Template not found",
          message: "Email template not found",
        });
      }

      return res.json({
        success: true,
        message: "Email template updated successfully",
        data: template,
      });
    } catch (error) {
      console.error("Update email template error:", error);
      return res.status(500).json({
        error: "Internal server error",
        message: "Failed to update email template",
      });
    }
  }
);

// Delete email template
router.delete(
  "/email-templates/:id",
  [authenticateToken, requireSuperAdmin],
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const { error } = await supabase
        .from("email_templates")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Delete template error:", error);
        return res.status(500).json({
          error: "Failed to delete template",
          message: "Failed to delete email template",
        });
      }

      return res.json({
        success: true,
        message: "Email template deleted successfully",
      });
    } catch (error) {
      console.error("Delete email template error:", error);
      return res.status(500).json({
        error: "Internal server error",
        message: "Failed to delete email template",
      });
    }
  }
);

// Test email template
router.post(
  "/email-templates/:id/test",
  [authenticateToken, requireAdmin],
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { test_email, variables } = req.body;

      if (!test_email) {
        return res.status(400).json({
          error: "Invalid test data",
          message: "Test email address is required",
        });
      }

      // Get template
      const { data: template, error: templateError } = await supabase
        .from("email_templates")
        .select("*")
        .eq("id", id)
        .single();

      if (templateError || !template) {
        return res.status(404).json({
          error: "Template not found",
          message: "Email template not found",
        });
      }

      // Replace variables in content
      let htmlContent = template.html_content || "";
      let textContent = template.text_content || "";
      let subject = template.subject;

      if (variables) {
        Object.entries(variables).forEach(([key, value]) => {
          const placeholder = `{{${key}}}`;
          htmlContent = htmlContent.replace(
            new RegExp(placeholder, "g"),
            String(value)
          );
          textContent = textContent.replace(
            new RegExp(placeholder, "g"),
            String(value)
          );
          subject = subject.replace(
            new RegExp(placeholder, "g"),
            String(value)
          );
        });
      }

      // Import nodemailer dynamically
      const nodemailer = require("nodemailer");

      // Get SMTP settings
      const { data: smtpSettings } = await supabase
        .from("system_settings")
        .select("setting_key, setting_value")
        .eq("category", "email");

      const settings: Record<string, any> = {};
      smtpSettings?.forEach((setting) => {
        settings[setting.setting_key] = setting.setting_value;
      });

      if (
        !settings.smtp_host ||
        !settings.smtp_user ||
        !settings.smtp_password
      ) {
        return res.status(500).json({
          error: "SMTP not configured",
          message: "SMTP settings are not properly configured",
        });
      }

      // Create transporter
      const transporter = nodemailer.createTransport({
        host: settings.smtp_host,
        port: parseInt(settings.smtp_port) || 587,
        secure: settings.smtp_secure === "true",
        auth: {
          user: settings.smtp_user,
          pass: settings.smtp_password,
        },
      });

      // Send test email
      const testEmailResult = await transporter.sendMail({
        from: `"${settings.smtp_from_name || "SpareFinder"}" <${
          settings.smtp_user
        }>`,
        to: test_email,
        subject: `[TEST] ${subject}`,
        html: htmlContent,
        text: textContent,
      });

      return res.json({
        success: true,
        message: "Test email sent successfully",
        data: {
          messageId: testEmailResult.messageId,
          template: template.name,
        },
      });
    } catch (error) {
      console.error("Test email template error:", error);
      return res.status(500).json({
        error: "Failed to send test email",
        message:
          error instanceof Error ? error.message : "Failed to send test email",
      });
    }
  }
);

// Test SMTP Connection
router.post(
  "/test-smtp",
  [authenticateToken, requireAdmin],
  async (req: AuthRequest, res: Response) => {
    try {
      const { smtpConfig } = req.body;

      if (
        !smtpConfig ||
        !smtpConfig.host ||
        !smtpConfig.username ||
        !smtpConfig.password
      ) {
        return res.status(400).json({
          error: "Invalid SMTP configuration",
          message: "Host, username, and password are required",
        });
      }

      // Import nodemailer dynamically to avoid circular dependency
      const nodemailer = require("nodemailer");

      // Create transporter with provided config
      const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: parseInt(smtpConfig.port) || 587,
        secure: smtpConfig.encryption === "SSL" || smtpConfig.port === 465,
        auth: {
          user: smtpConfig.username,
          pass: smtpConfig.password,
        },
      });

      // Test connection
      await transporter.verify();

      // Send test email
      const testEmailResult = await transporter.sendMail({
        from: `"${smtpConfig.fromName || "SpareFinder"}" <${
          smtpConfig.username
        }>`,
        to: smtpConfig.username, // Send to self for testing
        subject: "SMTP Test - SpareFinder Configuration",
        html: `
          <h2>SMTP Configuration Test</h2>
          <p>This is a test email to verify your SMTP configuration is working correctly.</p>
          <p><strong>Configuration Details:</strong></p>
          <ul>
            <li>Host: ${smtpConfig.host}</li>
            <li>Port: ${smtpConfig.port}</li>
            <li>Encryption: ${smtpConfig.encryption}</li>
            <li>From Name: ${smtpConfig.fromName}</li>
          </ul>
          <p>If you received this email, your SMTP configuration is working properly!</p>
        `,
        text: `
          SMTP Configuration Test
          
          This is a test email to verify your SMTP configuration is working correctly.
          
          Configuration Details:
          - Host: ${smtpConfig.host}
          - Port: ${smtpConfig.port}
          - Encryption: ${smtpConfig.encryption}
          - From Name: ${smtpConfig.fromName}
          
          If you received this email, your SMTP configuration is working properly!
        `,
      });

      return res.json({
        success: true,
        message: "SMTP test successful",
        data: {
          connectionVerified: true,
          testEmailSent: true,
          messageId: testEmailResult.messageId,
        },
      });
    } catch (error) {
      console.error("SMTP test error:", error);
      return res.status(500).json({
        error: "SMTP test failed",
        message:
          error instanceof Error
            ? error.message
            : "Failed to test SMTP configuration",
      });
    }
  }
);

// Save SMTP Settings
router.post(
  "/smtp-settings",
  [authenticateToken, requireSuperAdmin],
  async (req: AuthRequest, res: Response) => {
    try {
      const { smtpConfig } = req.body;

      if (
        !smtpConfig ||
        !smtpConfig.host ||
        !smtpConfig.username ||
        !smtpConfig.password
      ) {
        return res.status(400).json({
          error: "Invalid SMTP configuration",
          message: "Host, username, and password are required",
        });
      }

      // Update SMTP settings in database
      const settingsToUpdate = [
        {
          category: "email",
          setting_key: "smtp_host",
          setting_value: smtpConfig.host,
        },
        {
          category: "email",
          setting_key: "smtp_port",
          setting_value: smtpConfig.port.toString(),
        },
        {
          category: "email",
          setting_key: "smtp_user",
          setting_value: smtpConfig.username,
        },
        {
          category: "email",
          setting_key: "smtp_password",
          setting_value: smtpConfig.password,
        },
        {
          category: "email",
          setting_key: "smtp_secure",
          setting_value: smtpConfig.encryption === "SSL",
        },
        {
          category: "email",
          setting_key: "smtp_from_name",
          setting_value: smtpConfig.fromName || "SpareFinder",
        },
      ];

      for (const setting of settingsToUpdate) {
        const { error } = await supabase.from("system_settings").upsert(
          {
            category: setting.category,
            setting_key: setting.setting_key,
            setting_value: setting.setting_value,
            description: `SMTP ${setting.setting_key.replace(
              "smtp_",
              ""
            )} setting`,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "category,setting_key",
          }
        );

        if (error) {
          console.error("Error updating SMTP setting:", error);
          return res.status(500).json({
            error: "Failed to save SMTP settings",
            message: `Failed to update ${setting.setting_key}`,
          });
        }
      }

      // Refresh email service configuration with new settings
      try {
        const refreshSuccess = await emailService.refreshSmtpConfiguration();
        if (refreshSuccess) {
          console.log("✅ Email service configuration refreshed successfully");
        } else {
          console.warn("⚠️ Email service configuration refresh failed");
        }
      } catch (refreshError) {
        console.error(
          "Error refreshing email service configuration:",
          refreshError
        );
        // Don't fail the request if refresh fails
      }

      return res.json({
        success: true,
        message: "SMTP settings saved successfully",
        data: smtpConfig,
      });
    } catch (error) {
      console.error("Save SMTP settings error:", error);
      return res.status(500).json({
        error: "Internal server error",
        message: "Failed to save SMTP settings",
      });
    }
  }
);

// System Settings Management
router.get(
  "/system-settings",
  [authenticateToken, requireAdmin],
  async (_req: AuthRequest, res: Response) => {
    try {
      const { data: settings, error } = await supabase
        .from("system_settings")
        .select("*")
        .order("category", { ascending: true });

      if (error) {
        console.error("System settings fetch error:", error);
        return res.status(500).json({
          error: "System settings fetch failed",
          message: "Failed to retrieve system settings",
        });
      }

      // Group settings by category
      const groupedSettings =
        settings?.reduce((acc: any, setting) => {
          if (!acc[setting.category]) {
            acc[setting.category] = {};
          }
          acc[setting.category][setting.setting_key] = setting.setting_value;
          return acc;
        }, {}) || {};

      return res.json({ settings: groupedSettings });
    } catch (error) {
      console.error("Get system settings error:", error);
      return res.status(500).json({
        error: "Internal server error",
        message: "An unexpected error occurred while fetching system settings",
      });
    }
  }
);

router.patch(
  "/system-settings",
  [authenticateToken, requireSuperAdmin],
  async (req: AuthRequest, res: Response) => {
    try {
      const { settings } = req.body;

      if (!settings || typeof settings !== "object") {
        return res.status(400).json({
          error: "Invalid settings",
          message: "Settings must be an object",
        });
      }

      // Update each setting
      for (const [category, categorySettings] of Object.entries(settings)) {
        for (const [key, value] of Object.entries(categorySettings as any)) {
          const { error } = await supabase
            .from("system_settings")
            .update({ setting_value: value })
            .eq("category", category)
            .eq("setting_key", key);

          if (error) {
            console.error("System setting update error:", error);
            return res.status(500).json({
              error: "System setting update failed",
              message: "Failed to update system settings",
            });
          }
        }
      }

      return res.json({
        message: "System settings updated successfully",
        settings,
      });
    } catch (error) {
      console.error("Update system settings error:", error);
      return res.status(500).json({
        error: "Internal server error",
        message: "An unexpected error occurred while updating system settings",
      });
    }
  }
);

// Update system settings (super admin only)
router.patch(
  "/settings",
  [
    authenticateToken,
    requireSuperAdmin,
    body("settings").isObject().withMessage("Settings must be an object"),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { settings } = req.body;

      // Update system metrics with new settings
      const timestamp = new Date().toISOString();
      const settingsEntries = Object.entries(settings).map(([key, value]) => ({
        metric_name: `setting_${key}`,
        metric_value: typeof value === "number" ? value : null,
        tags: { type: "setting", value: String(value) },
        timestamp,
      }));

      const { error } = await supabase
        .from("system_metrics")
        .insert(settingsEntries);

      if (error) {
        console.error("Settings update error:", error);
        return res.status(500).json({
          error: "Settings update failed",
          message: "Failed to update system settings",
        });
      }

      return res.json({
        message: "System settings updated successfully",
        settings,
      });
    } catch (error) {
      console.error("Update settings error:", error);
      return res.status(500).json({
        error: "Internal server error",
        message: "An unexpected error occurred while updating settings",
      });
    }
  }
);

// Get system logs (admin only)
router.get(
  "/logs",
  [authenticateToken, requireAdmin],
  async (req: AuthRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 100;
      const level = req.query.level as string;
      const offset = (page - 1) * limit;

      let query = supabase
        .from("user_activities")
        .select(
          `
        *,
        profiles!inner(full_name, email)
      `,
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (level) {
        query = query.eq("action", level);
      }

      const { data: logs, error, count } = await query;

      if (error) {
        console.error("Logs fetch error:", error);
        return res.status(500).json({
          error: "Logs fetch failed",
          message: "Failed to retrieve system logs",
        });
      }

      return res.json({
        logs,
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit),
        },
      });
    } catch (error) {
      console.error("Get logs error:", error);
      return res.status(500).json({
        error: "Internal server error",
        message: "An unexpected error occurred while fetching logs",
      });
    }
  }
);

// Get audit logs (admin only)
router.get(
  "/audit-logs",
  [authenticateToken, requireAdmin],
  async (req: AuthRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = (page - 1) * limit;

      console.log("📋 Fetching audit logs from database...");

      // First, try to get audit logs from the audit_logs table
      const {
        data: auditLogs,
        error: auditError,
        count,
      } = await supabase
        .from("audit_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (auditError) {
        console.error("Direct audit logs query failed:", auditError);

        // Fallback: Use user_activities table as audit logs
        console.log("📋 Falling back to user_activities table...");
        const {
          data: activities,
          error: activitiesError,
          count: activitiesCount,
        } = await supabase
          .from("user_activities")
          .select(
            `
          id,
          user_id,
          action,
          details,
          created_at,
          profiles!inner(full_name, email)
        `,
            { count: "exact" }
          )
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);

        if (activitiesError) {
          console.error("User activities fallback failed:", activitiesError);
          return res.status(500).json({
            success: false,
            error: "Audit logs fetch failed",
            message: "Failed to retrieve audit logs from database",
          });
        }

        // Transform user activities to audit log format
        const transformedLogs =
          activities?.map((activity) => ({
            id: activity.id,
            user_id: activity.user_id,
            action: activity.action,
            resource_type: "user_activity",
            resource_id: null,
            old_values: null,
            new_values: null,
            ip_address: null,
            user_agent: null,
            created_at: activity.created_at,
            profiles: activity.profiles,
          })) || [];

        return res.json({
          success: true,
          logs: transformedLogs,
          pagination: {
            page,
            limit,
            total: activitiesCount || 0,
            pages: Math.ceil((activitiesCount || 0) / limit),
          },
        });
      }

      // If audit logs exist, we need to manually join with profiles
      const logsWithProfiles = [];
      if (auditLogs && auditLogs.length > 0) {
        for (const log of auditLogs) {
          let profile = null;

          if (log.user_id) {
            // Get profile information for this user
            const { data: userProfile } = await supabase
              .from("profiles")
              .select("full_name, email")
              .eq("id", log.user_id)
              .single();

            profile = userProfile;
          }

          logsWithProfiles.push({
            ...log,
            profiles: profile,
          });
        }
      }

      console.log(`✅ Retrieved ${logsWithProfiles.length} audit logs`);

      return res.json({
        success: true,
        logs: logsWithProfiles,
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit),
        },
      });
    } catch (error) {
      console.error("Get audit logs error:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "An unexpected error occurred while fetching audit logs",
      });
    }
  }
);

export default router;
