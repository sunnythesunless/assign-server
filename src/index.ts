import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { config } from "./config";
import { errorHandler } from "./middleware/error.middleware";
import authRoutes from "./modules/auth/auth.routes";
import invoiceRoutes from "./modules/invoice/invoice.routes";

const app = express();

// ── Security ────────────────────────────────────────────────────────────────
app.use(helmet());

// Handle CORS — support wildcard "*" or specific origin
const corsOrigin = config.CORS_ORIGIN === "*"
    ? true
    : config.CORS_ORIGIN.startsWith("http")
        ? config.CORS_ORIGIN
        : `https://${config.CORS_ORIGIN}`;

app.use(
    cors({
        origin: corsOrigin,
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

// ── Rate Limiting ───────────────────────────────────────────────────────────
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: "Too many requests, please try again later" },
});
app.use("/api/", limiter);

// ── Body Parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Logging ─────────────────────────────────────────────────────────────────
app.use(morgan(config.NODE_ENV === "production" ? "combined" : "dev"));

// ── Health Check ────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
    res.json({
        success: true,
        data: {
            status: "healthy",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: config.NODE_ENV,
        },
    });
});

// ── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/invoices", invoiceRoutes);

// ── 404 Handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ success: false, error: "Route not found" });
});

// ── Error Handler ───────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start Server ────────────────────────────────────────────────────────────
const server = app.listen(config.PORT, () => {
    console.log(`\n🚀 Invoice API Server`);
    console.log(`   Environment: ${config.NODE_ENV}`);
    console.log(`   Port:        ${config.PORT}`);
    console.log(`   URL:         http://localhost:${config.PORT}`);
    console.log(`   Health:      http://localhost:${config.PORT}/api/health\n`);
});

// ── Graceful Shutdown ───────────────────────────────────────────────────────
function gracefulShutdown(signal: string) {
    console.log(`\n🛑 ${signal} received. Shutting down gracefully...`);
    server.close(() => {
        console.log("✅ Server closed");
        process.exit(0);
    });

    // Force close after 10s
    setTimeout(() => {
        console.error("⚠️ Forced shutdown after timeout");
        process.exit(1);
    }, 10000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

export default app;
