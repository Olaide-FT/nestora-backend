const express = require("express");
const dotenv = require("dotenv");
const morgan = require("morgan");
// const cookieParser = require("cookie-parser");
const cors = require("cors");

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

const allowedOrigins = [
  "http://localhost:5173",
  "https://nestora-lake.vercel.app/",
];

if (process.env.NODE_ENV === 'production' && process.env.CLIENT_URL) {
  app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
} else {
  app.use(cors({ origin: allowedOrigins, credentials: true }));
}

// ({ origin: allowedOrigins, credentials: true })

app.use('/api', userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/inquiries", inquiryRoutes);


const PORT = process.env.PORT;

connectDB();

app.listen(PORT, () => {
    console.log(`Server Running at ${PORT}`)
})