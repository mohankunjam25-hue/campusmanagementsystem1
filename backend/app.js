const express = require("express");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const compression = require("compression");
const morgan = require("morgan");

require("dotenv").config();

const app = express();
const frontendPath = path.join(__dirname, "..", "frontend");

// 1. Security HTTP headers
app.use(helmet());
// Allow images from anywhere since it might load external images or data URIs
app.use(helmet.contentSecurityPolicy({
    directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "*"],
        connectSrc: ["'self'", "*"]
    }
}));

// 2. Logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan("dev"));
} else {
    app.use(morgan("combined"));
}

// 3. Rate Limiting for API routes
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    message: "Too many requests from this IP, please try again after 15 minutes",
    standardHeaders: true,
    legacyHeaders: false,
});
app.use("/api", apiLimiter);

// 4. Body parser, reading data from body into req.body
app.use(express.json({ limit: "10mb" })); // Limit payload size to 10MB
app.use(cors());

// 5. Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// 6. Compression
app.use(compression());

// Routes
const complaintRoutes = require("./route/complaintRoutes");
const userRoutes = require("./route/userRoutes");

// Serve static frontend files
app.use(express.static(frontendPath));

app.get("/api", (req, res) => {
    res.json({
        message: "Campus Complaint Management System API is running"
    });
});

app.use("/api/complaints", complaintRoutes);
app.use("/api/users", userRoutes);

app.get("*", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
    console.error("Unhandled Error:", err);
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    res.status(statusCode).json({
        status: "error",
        statusCode,
        message,
        ...(process.env.NODE_ENV === "development" && { stack: err.stack })
    });
});

module.exports = app;