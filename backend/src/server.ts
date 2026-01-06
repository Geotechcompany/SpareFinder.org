import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
// Removed rate limiter import

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from "./routes/auth";
import userRoutes from "./routes/user";
import uploadRoutes from "./routes/upload";
import searchRoutes from "./routes/search";
import adminRoutes from "./routes/admin";
import reportsRoutes from "./routes/reports";
import dashboardRoutes from "./routes/dashboard";
import historyRoutes from "./routes/history";
import profileRoutes from "./routes/profile";
import settingsRoutes from "./routes/settings";
import notificationsRoutes from "./routes/notifications";
import billingRoutes from "./routes/billing";
import statisticsRoutes from "./routes/statistics";
import creditsRoutes from "./routes/credits";
import healthRoutes from "./routes/health";
import contactRoutes from "./routes/contact";
import reviewsRoutes from "./routes/reviews";
import cronRoutes from "./routes/cron";
import apiKeysRoutes from "./routes/api-keys";
import externalRoutes from "./routes/external";

// Initialize Supabase client
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const app = express();
const PORT = process.env.PORT || 4000;

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// CORS configuration - Allow specific origins including production domain
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://sparefinder.org",
        "https://www.sparefinder.org",
        "https://part-finder-ai-vision.netlify.app",
        "https://sparefinder.org",
        "https://www.sparefinder.org",
        "https://sparefinder-org-pp8y.onrender.com",
      ];

      console.log("🌐 CORS Request from origin:", origin);

      if (allowedOrigins.indexOf(origin) !== -1) {
        console.log("✅ CORS: Origin allowed");
        return callback(null, true);
      } else {
        console.log("❌ CORS: Origin not allowed:", origin);
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Origin",
      "Accept",
      "x-user-id",
    ],
    optionsSuccessStatus: 200,
  })
);

// Body parsing middleware
// NOTE: Stripe webhook signature verification requires the *raw* request body.
// If we parse JSON before the webhook route runs, the payload changes and
// `stripe.webhooks.constructEvent(...)` fails.
app.use((req, res, next) => {
  if (req.originalUrl === "/api/billing/stripe-webhook") {
    return express.raw({ type: "application/json" })(req, res, next);
  }
  return express.json({ limit: "10mb" })(req, res, next);
});
app.use((req, res, next) => {
  if (req.originalUrl === "/api/billing/stripe-webhook") {
    return next();
  }
  return express.urlencoded({ extended: true, limit: "10mb" })(req, res, next);
});

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan("combined"));

// Health check routes
app.use("/health", healthRoutes);

// Removed rate limiter usage

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/statistics", statisticsRoutes);
app.use("/api/credits", creditsRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/cron", cronRoutes);
app.use("/api/api-keys", apiKeysRoutes);
app.use("/api/external", externalRoutes);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
interface ErrorWithStatus extends Error {
  status?: number;
}

app.use(
  (
    error: ErrorWithStatus,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Global error handler:", error);

    const status = error.status || 500;

    res.status(status).json({
      error: error.name || "Internal Server Error",
      message: error.message || "Something went wrong",
      ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
    });
  }
);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 SpareFinder Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`  ├─ Comprehensive: http://localhost:${PORT}/health`);
  console.log(`  ├─ Simple: http://localhost:${PORT}/health/simple`);
  console.log(`  ├─ Database: http://localhost:${PORT}/health/database`);
  console.log(`  ├─ AI Service: http://localhost:${PORT}/health/ai-service`);
  console.log(`  └─ Storage: http://localhost:${PORT}/health/storage`);
  console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
});

export default app;
