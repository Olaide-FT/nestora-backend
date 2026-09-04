const express = require("express");
const dotenv = require("dotenv");
const morgan = require("morgan");
// const cookieParser = require("cookie-parser");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const userRoutes = require("./routes/user.route");
const authRoutes = require("./routes/auth.routes");
const propertyRoutes = require("./routes/property.routes");
const favoriteRoutes = require("./routes/favorite.routes");
const adminRoutes = require("./routes/admin.routes");
const inquiryRoutes = require("./routes/inquiry.routes");
const connectDB = require("./config/db");

dotenv.config();

const app = express();

app.use(express.json())

app.use(morgan("dev"))
app.use(express.urlencoded({ extended: true }));

app.use(cors());

// Strict limiter for sensitive auth endpoints — 10 attempts per 15 minutes per IP.
// Prevents brute-force attacks on login, registration, and OTP endpoints.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts, please try again after 15 minutes" },
});

// General limiter for all other API routes — 100 requests per 15 minutes per IP.
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please slow down" },
});

// Property browsing can trigger several read requests while users search,
// paginate, and open details. Keep write/admin APIs on the stricter limit.
const propertyBrowseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many property requests, please try again shortly" },
});

app.use('/api', userRoutes);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/verify-email", authLimiter);
app.use("/api/auth/regenerate-otp", authLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/properties", propertyBrowseLimiter, propertyRoutes);
app.use("/api/favorites", generalLimiter, favoriteRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/inquiries", generalLimiter, inquiryRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((error, req, res, next) => {
  console.error("Request error:", error);

  if (error.name === "MulterError") {
    return res.status(400).json({ message: error.message });
  }

  if (error.message === "Only JPEG, PNG, and WEBP files are allowed") {
    return res.status(400).json({ message: error.message });
  }

  return res.status(500).json({ message: "Internal Server Error" });
});


const PORT = process.env.PORT;

const startServer = async () => {
  try {
    // Do not accept API requests until MongoDB is ready. This prevents the
    // first registration request from waiting on an in-progress DB connection.
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server Running at ${PORT}`);
    });
  } catch (error) {
    console.error("Unable to start server because the database connection failed.");
    process.exit(1);
  }
};

startServer();
