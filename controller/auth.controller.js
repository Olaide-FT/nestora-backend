const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
const generateToken = require("../utils/generateToken");
const sendMail = require("../services/nodemailer");
const sendOtp = require("../utils/sendOtp");
const jwt = require("jsonwebtoken");

const normalizeOtp = (value) => String(value ?? "").trim();

const register = async (req, res) => {
    try {
        const { firstName, lastName, email, password, phone, role, } = req.body;

        if (!firstName || !lastName || !email || !password || !phone) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters", });
        }

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(409).json({ message: "Email already registered" });
        }

        const userRole = role === "owner" ? "owner" : "buyer";

        const hashedPassword = await bcrypt.hash(password, 10);
        const otp = String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
        const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

        const user = await User.create({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            phone,
            role: userRole,
            otp,
            otpExpiresAt: otpExpires,
            isVerified: false
        });

        await sendOtp(email, otp)

        res.status(201).json({ message: "Registration successful. Please check your email for OTP." });

    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Internal Server Error" })
    }
}


const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const user = await User.findOne({ email }).select("+password");

        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        if (!user.isActive) {
            return res.status(403).json({ message: "Your account has been deactivated" });
        }

        // const isPasswordCorrect = await bcrypt.compare(password, user.password);

        console.log("Email:", email);
        console.log("User:", user.email);
        console.log("Password entered:", password);
        console.log("Password from DB:", user.password);

        const isPasswordCorrect =
            await bcrypt.compare(
                password,
                user.password
            );

        console.log(
            "Password correct:",
            isPasswordCorrect
        );

        if (!isPasswordCorrect) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        if (!user.isVerified) {
            return res.status(403).json({ message: "Please verify your email before logging in" });
        }

        const token = jwt.sign(
            {
                userId: user._id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        res.status(200).json({
            message: "Login successful",
            token,
            user: {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                role: user.role,
                isActive: user.isActive,
                isVerified: user.isVerified,
            }
        });
    } catch (error) {
        console.error(error)

        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const verifyEmail = async (req, res) => {
    const { email, otp } = req.body;

    try {
        if (!email || !otp) {
            return res.status(400).json({ message: "Email and Otp are required" });
        }

        const normalizedOtp = normalizeOtp(otp);
        const user = await User.findOne({ email: String(email).trim().toLowerCase() });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.isVerified) {
            return res.status(400).json({ message: "Email already verified" });
        }

        if (!user.otp || normalizeOtp(user.otp) !== normalizedOtp) {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        if (user.otpExpiresAt < Date.now()) {
            return res.status(400).json({ message: "OTP has expired" });
        }

        user.isVerified = true;
        user.otp = undefined;
        user.otpExpiresAt = undefined;

        await user.save();
        await sendMail(user.email, "Your email has been verified");

        res.status(200).json({ message: "Email verified successfully. You can now login." });

    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const regenerateOtp = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            res.status(403).send("Invalid Email")
        }

        const regenerate = await User.findOne({ email });

        if (!regenerate) {
            res.status(404).json({ message: "User Not Found" })
        }

        const otp = String(Math.floor(1000 + Math.random() * 9000)).padStart(4, "0");

        regenerate.otp = otp;
        regenerate.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

        await regenerate.save();

        await sendOtp(email, otp)

        return res.status(200).json({ message: "A new oTP has been sent to your email" });

    } catch (error) {
        console.log(error);

        res.status(500).json({ message: "Internal Server Error", });
    }
};


const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select("-password");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ message: "Profile fetched successfully", user });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error", error });
    }
};

const updateProfile = async (req, res) => {
    try {
        const { firstName, lastName, email, phone } = req.body;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        if (!firstName || !lastName || !email || !phone) {
            return res.status(400).json({ message: "First name, last name, email and phone are required" });
        }

        const normalizedEmail = String(email).trim().toLowerCase();

        const existingUser = await User.findOne({
            email: normalizedEmail,
            _id: { $ne: userId },
        });

        if (existingUser) {
            return res.status(409).json({ message: "Email already in use" });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        user.firstName = firstName.trim();
        user.lastName = lastName.trim();
        user.email = normalizedEmail;
        user.phone = phone.trim();

        await user.save();

        const safeUser = {
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            role: user.role,
            isActive: user.isActive,
            isVerified: user.isVerified,
        };

        console.log('Profile updated for user:', safeUser);
        res.status(200).json({
            message: "Profile updated successfully",
            user: safeUser,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};


const logout = async (req, res) => {
    return res.status(200).json({ message: "Logout successful" });
};


module.exports = {
    register,
    login,
    verifyEmail,
    regenerateOtp,
    updateProfile,
    getProfile,
    logout,
};