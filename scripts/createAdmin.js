const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");

const User = require("../models/user.model");

dotenv.config();

const getEnvValue = (...keys) => {
    for (const key of keys) {
        const value = process.env[key];
        if (typeof value === "string") {
            const trimmed = value.trim();
            if (trimmed) return trimmed;
        }
    }
    return undefined;
};

const createAdmin = async () => {
    try {
        await mongoose.connect(
            process.env.MONGODB_URL
        );

        console.log("Database connected");

        const adminEmail = getEnvValue("ADMIN_EMAIL", "ADMIN_EMAil", "admin_email");
        const adminPassword = getEnvValue("ADMIN_PASSWORD", "admin_password");
        const adminFirstName = getEnvValue("ADMIN_FIRSTNAME", "ADMIN_FirstName", "admin_firstname");
        const adminLastName = getEnvValue("ADMIN_LASTNAME", "ADMIN_LastName", "admin_lastname");
        const adminPhone = getEnvValue("ADMIN_PHONE", "admin_phone");

        if (!adminEmail || !adminPassword || !adminFirstName || !adminLastName || !adminPhone) {
            throw new Error("Admin environment variables are missing. Check your Backend/.env file.");
        }

        const existingAdmin = await User.findOne({
            email: adminEmail,
        });

        if (existingAdmin) {
            console.log("Admin already exists");
            process.exit(0);
        }

        const hashedPassword = await bcrypt.hash(
            adminPassword,
            10
        );

        const admin = await User.create({
            firstName: adminFirstName,
            lastName: adminLastName,
            email: adminEmail,
            password: hashedPassword,
            phone: adminPhone,
            role: "admin",
            isActive: true,
            isVerified: true,
            otp: null,
            otpExpiresAt: null
        });

        console.log("Admin created successfully");
        console.log(`Admin Email: ${admin.email}`);

        process.exit(0);

    } catch (error) {
        console.error("Failed to create Admin:", error);
        process.exit(1);
    }
};

module.exports = createAdmin;

createAdmin();