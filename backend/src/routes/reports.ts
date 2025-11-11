import { Router, Request, Response } from "express";
import path from "path";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const router = Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey =
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Handle CORS preflight for PDF downloads
 * OPTIONS /api/reports/pdf/:filename
 */
router.options("/pdf/:filename(*)", async (_req: Request, res: Response) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400"); // 24 hours
  return res.status(200).end();
});

/**
 * Serve PDF file
 * GET /api/reports/pdf/:filename
 * Note: This endpoint is public (no authentication required) to support shared links
 */
router.get("/pdf/:filename(*)", async (req: Request, res: Response) => {
  try {
    let { filename } = req.params;

    console.log(`📥 PDF download request for: ${filename}`);

    // Handle case where filename might be a full path (legacy data)
    // Extract just the filename part
    if (filename.includes("/") || filename.includes("\\")) {
      // Replace all backslashes with forward slashes and split
      const parts = filename
        .replace(/\\\\/g, "/")
        .replace(/\\/g, "/")
        .split("/");
      filename = parts[parts.length - 1];
      console.log(`📝 Extracted filename: ${filename}`);
    }

    // Security: Validate filename to prevent directory traversal
    if (!filename || filename.includes("..")) {
      return res.status(400).json({ error: "Invalid filename" });
    }

    // Check multiple possible locations for the PDF
    const possiblePaths = [
      // New location: ai-analysis-crew/temp (relative to backend)
      path.join(__dirname, "../../../ai-analysis-crew/temp", filename),
      // Legacy location: /tmp (Unix/Linux)
      path.join("/tmp", filename),
      // Windows temp location (absolute)
      path.join("C:\\tmp", filename),
      // Windows temp in xampp directory
      path.join(
        "C:\\xampp\\htdocs\\GEOTECH COMPANY PROJECTS\\SpareFinder.org\\ai-analysis-crew\\temp",
        filename
      ),
      // Relative tmp from project root
      path.join(process.cwd(), "tmp", filename),
      path.join(process.cwd(), "temp", filename),
    ];

    let pdfPath: string | null = null;
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        pdfPath = testPath;
        console.log(`✅ Found PDF at: ${pdfPath}`);
        break;
      }
    }

    if (!pdfPath) {
      console.error(`❌ PDF not found: ${filename}`);
      console.error(`Tried locations:`, possiblePaths);
      return res.status(404).json({ error: "PDF file not found" });
    }

    // Set headers for PDF download with CORS support
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

    // Stream the file
    const fileStream = fs.createReadStream(pdfPath);
    return fileStream.pipe(res);
  } catch (error) {
    console.error("Error serving PDF:", error);
    return res.status(500).json({ error: "Failed to serve PDF file" });
  }
});

/**
 * Create shareable public link for analysis
 * POST /api/reports/share/:jobId
 */
router.post("/share/:jobId", async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const userId = req.body.userId || req.headers["x-user-id"];

    if (!jobId) {
      return res.status(400).json({ error: "Job ID is required" });
    }

    // Fetch the analysis from database
    const { data: job, error } = await supabase
      .from("crew_analysis_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (error || !job) {
      return res.status(404).json({ error: "Analysis not found" });
    }

    // Verify ownership if userId is provided
    if (userId && job.user_id !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Generate shareable token (use job ID as token for simplicity)
    const shareToken = Buffer.from(jobId).toString("base64url");

    // Create public share URL
    const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const shareUrl = `${baseUrl}/share/${shareToken}`;

    // Update job to mark as shared
    const { error: updateError } = await supabase
      .from("crew_analysis_jobs")
      .update({
        is_public: true,
        share_token: shareToken,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    if (updateError) {
      console.error("Error updating share status:", updateError);
    }

    return res.json({
      success: true,
      shareUrl,
      shareToken,
      message: "Shareable link created successfully",
    });
  } catch (error) {
    console.error("Error creating shareable link:", error);
    return res.status(500).json({ error: "Failed to create shareable link" });
  }
});

/**
 * Get shared analysis by token
 * GET /api/reports/shared/:token
 */
router.get("/shared/:token", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ error: "Share token is required" });
    }

    // Decode token to get job ID
    let jobId: string;
    try {
      jobId = Buffer.from(token, "base64url").toString("utf-8");
    } catch (e) {
      return res.status(400).json({ error: "Invalid share token" });
    }

    // Fetch the shared analysis
    const { data: job, error } = await supabase
      .from("crew_analysis_jobs")
      .select("*")
      .eq("id", jobId)
      .eq("is_public", true)
      .eq("share_token", token)
      .single();

    if (error || !job) {
      return res
        .status(404)
        .json({ error: "Shared analysis not found or no longer available" });
    }

    // Return public-safe data (hide sensitive info)
    return res.json({
      success: true,
      data: {
        id: job.id,
        keywords: job.keywords,
        status: job.status,
        result_data: job.result_data,
        pdf_url: job.pdf_url,
        image_url: job.image_url,
        created_at: job.created_at,
        completed_at: job.completed_at,
        // Don't expose user email or user_id
      },
    });
  } catch (error) {
    console.error("Error fetching shared analysis:", error);
    return res.status(500).json({ error: "Failed to fetch shared analysis" });
  }
});

/**
 * Revoke shared link
 * DELETE /api/reports/share/:jobId
 */
router.delete("/share/:jobId", async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const userId = req.body.userId || req.headers["x-user-id"];

    // Verify ownership
    const { data: job, error: fetchError } = await supabase
      .from("crew_analysis_jobs")
      .select("user_id")
      .eq("id", jobId)
      .single();

    if (fetchError || !job) {
      return res.status(404).json({ error: "Analysis not found" });
    }

    if (userId && job.user_id !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Revoke sharing
    const { error: updateError } = await supabase
      .from("crew_analysis_jobs")
      .update({
        is_public: false,
        share_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    if (updateError) {
      return res.status(500).json({ error: "Failed to revoke share" });
    }

    return res.json({
      success: true,
      message: "Shareable link revoked successfully",
    });
  } catch (error) {
    console.error("Error revoking shared link:", error);
    return res.status(500).json({ error: "Failed to revoke shareable link" });
  }
});

export default router;
