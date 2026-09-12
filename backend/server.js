const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const { initializeDatabase } = require("./config/dbConfig");
const errorHandler = require("./middleware/errorHandler");
const path = require("path");

// ─── Import Routes ──────────────────────────────────────────
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const contactRoutes = require("./routes/contactRoutes");
const galleryRoutes = require("./routes/galleryRoutes");
const shareRoutes = require("./routes/shareRoutes");
const contentRoutes = require("./routes/contentRoutes");
const statsRoutes = require("./routes/statsRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Rate Limiting ──────────────────────────────────────────
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX || 100,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Allowed Origins ──────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:5173",
  "https://eliteimages.rw",
  "http://eliteimages.rw",
  "https://www.eliteimages.rw",
  "http://www.eliteimages.rw",
];

// ─── CORS Configuration ──────────────────────────────────
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === "development") {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  credentials: true,
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Cookie",
    "X-Requested-With",
    "Cache-Control",
    "Accept",
    "Origin",
    "User-Agent",
    "Referer",
    "Sec-Fetch-Mode",
    "Sec-Fetch-Site",
    "Sec-Fetch-Dest"
  ],
  exposedHeaders: ["Set-Cookie"],
}));

// ─── Middleware ──────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:", "http:", "res.cloudinary.com"],
      connectSrc: ["'self'", process.env.CLIENT_URL || "http://localhost:5173"],
      fontSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(limiter);
app.use(morgan(process.env.NODE_ENV === "development" ? "dev" : "combined"));
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// ─── Static Uploads (images) ─────────────────────────────────
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    maxAge: "7d",
    immutable: true,
  })
);

// ─── API Routes ──────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/galleries", galleryRoutes);
app.use("/api/share", shareRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/stats", statsRoutes);

// ─── Health Check ────────────────────────────────────────
app.get("/api/health", async (req, res) => {
  try {
    const { promisePool } = require("./config/dbConfig");
    const [result] = await promisePool.query("SELECT 1 as health");
    res.status(200).json({
      status: "healthy",
      database: "connected",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
    });
  } catch (error) {
    res.status(500).json({
      status: "unhealthy",
      database: "disconnected",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ─── Root Endpoint ───────────────────────────────────────
app.get("/", (req, res) => {
  res.status(200).json({
    name: "Elite Images Studio API",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    endpoints: {
      health: "/api/health",
      auth: "/api/auth",
      users: "/api/users",
      contact: "/api/contact",
      galleries: "/api/galleries",
      share: "/api/share/:token",
      content: "/api/content",
      stats: "/api/stats",
    }
  });
});

// ─── 404 Handler ─────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Resource not found",
    path: req.originalUrl,
    method: req.method
  });
});

// ─── Global Error Handler ──────────────────────────────
app.use(errorHandler);

// ─── Graceful Shutdown ──────────────────────────────────
const gracefulShutdown = async () => {
  console.log("\n🛑 Shutting down gracefully...");
  const { promisePool } = require("./config/dbConfig");
  if (promisePool) {
    await promisePool.end();
    console.log("✅ Database connections closed");
  }
  process.exit(0);
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

// ─── Start Server ─────────────────────────────────────────
const startServer = async () => {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`\n🚀 Server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`📍 Health: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;