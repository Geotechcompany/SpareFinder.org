import { Router, Request, Response } from "express";
import path from "path";
import fs from "fs";
import axios from "axios";
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
 * 
 * Tries multiple sources in order:
 * 1. Supabase Storage (production - recommended)
 * 2. Local file system (development/fallback)
 * 3. AI service proxy (if PDF is on AI service server)
 */
router.get("/pdf/:filename(*)", async (req: Request, res: Response) => {
  try {
    let { filename } = req.params;

    console.log(`📥 PDF download request for: ${filename}`);

    // Handle case where filename might be a full path or URL
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

    // Remove query parameters if any
    filename = filename.split("?")[0];

    // Strategy 1: Try to get PDF from Supabase Storage (production)
    const bucketName = process.env.SUPABASE_BUCKET_NAME || "sparefinder";
    const storagePath = `reports/${filename}`;
    
    console.log(`🔍 Checking Supabase Storage: ${bucketName}/${storagePath}`);

    try {
      const { data: fileData, error: storageError } = await supabase.storage
        .from(bucketName)
        .download(storagePath);

      if (!storageError && fileData) {
        console.log(`✅ Found PDF in Supabase Storage: ${storagePath}`);
        
        // Convert blob to buffer
        const arrayBuffer = await fileData.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Set headers for PDF download with CORS support
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Content-Length", buffer.length.toString());
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        res.setHeader("Cache-Control", "public, max-age=3600"); // Cache for 1 hour

        return res.send(buffer);
      } else {
        console.log(`⚠️ PDF not found in Supabase Storage: ${storageError?.message || "Not found"}`);
      }
    } catch (storageErr) {
      console.warn(`⚠️ Error checking Supabase Storage:`, storageErr);
    }

    // Strategy 2: Try local file system (development/fallback)
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
      // Reports directory in project
      path.join(process.cwd(), "reports", filename),
    ];

    let pdfPath: string | null = null;
    for (const testPath of possiblePaths) {
      try {
        if (fs.existsSync(testPath)) {
          pdfPath = testPath;
          console.log(`✅ Found PDF at local path: ${pdfPath}`);
          break;
        }
      } catch (pathError) {
        // Skip paths that cause errors (e.g., permissions)
        continue;
      }
    }

    if (pdfPath) {
      // Set headers for PDF download with CORS support
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Cache-Control", "public, max-age=3600");

      // Stream the file
      const fileStream = fs.createReadStream(pdfPath);
      return fileStream.pipe(res);
    }

    // Strategy 3: Try to get from database - query by filename in pdf_url field
    try {
      // Query for jobs where pdf_url contains the filename or equals it
      const { data: jobs, error: dbError } = await supabase
        .from("crew_analysis_jobs")
        .select("pdf_url")
        .ilike("pdf_url", `%${filename}%`)
        .limit(5);

      if (!dbError && jobs && jobs.length > 0) {
        for (const job of jobs) {
          if (!job.pdf_url) continue;
          
          const pdfUrl = job.pdf_url;
          
          // If it's already a full URL (Supabase Storage URL), try to fetch it
          if (pdfUrl.startsWith("http://") || pdfUrl.startsWith("https://")) {
            console.log(`🔗 PDF is a full URL: ${pdfUrl}`);
            
            try {
              const response = await axios.get(pdfUrl, {
                responseType: "arraybuffer",
                timeout: 10000,
                validateStatus: (status) => status === 200,
              });

              const buffer = Buffer.from(response.data);

              res.setHeader("Content-Type", "application/pdf");
              res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
              res.setHeader("Content-Length", buffer.length.toString());
              res.setHeader("Access-Control-Allow-Origin", "*");
              res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
              res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
              res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
              res.setHeader("Cache-Control", "public, max-age=3600");

              console.log(`✅ Successfully fetched PDF from URL: ${pdfUrl}`);
              return res.send(buffer);
            } catch (urlError: any) {
              console.warn(`⚠️ Failed to fetch PDF from URL ${pdfUrl}: ${urlError.message}`);
              continue; // Try next job
            }
          }
          
          // If pdf_url contains the filename but is not a URL, try alternative storage paths
          if (pdfUrl.includes(filename) && !pdfUrl.startsWith("http")) {
            // Try alternative storage paths in Supabase
            const altPaths = [
              `reports/${filename}`,
              `pdfs/${filename}`,
              `uploads/${filename}`,
              filename, // Root of bucket
              pdfUrl, // Try the exact path from database
            ];
            
            for (const altPath of altPaths) {
              try {
                const { data: altFileData, error: altError } = await supabase.storage
                  .from(bucketName)
                  .download(altPath);

                if (!altError && altFileData) {
                  console.log(`✅ Found PDF in Supabase Storage at alternative path: ${altPath}`);
                  
                  const arrayBuffer = await altFileData.arrayBuffer();
                  const buffer = Buffer.from(arrayBuffer);

                  res.setHeader("Content-Type", "application/pdf");
                  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
                  res.setHeader("Content-Length", buffer.length.toString());
                  res.setHeader("Access-Control-Allow-Origin", "*");
                  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
                  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
                  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
                  res.setHeader("Cache-Control", "public, max-age=3600");

                  return res.send(buffer);
                }
              } catch (altErr) {
                // Continue to next path
                continue;
              }
            }
          }
        }
      }
    } catch (dbErr) {
      console.warn(`⚠️ Error querying database for PDF:`, dbErr);
    }

    // If all strategies fail, return error
    console.error(`❌ PDF not found: ${filename}`);
    console.error(`Tried: Supabase Storage, Local paths, Database URL`);
    
    return res.status(404).json({
      error: "PDF file not found",
      message: `The requested PDF "${filename}" could not be found. It may have been deleted or not yet generated.`,
      suggestion: "Please check if the analysis job has completed successfully.",
    });
  } catch (error) {
    console.error("Error serving PDF:", error);
    return res.status(500).json({
      error: "Failed to serve PDF file",
      message: error instanceof Error ? error.message : "Unknown error",
    });
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
