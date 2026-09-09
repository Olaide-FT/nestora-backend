const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
const TokenBlocklist = require("../models/tokenBlocklist.model");
const generateToken = require("../utils/generateToken");
const sendMail = require("../services/nodemailer");
const sendOtp = require("../utils/sendOtp");
const hashToken = require("../utils/hashToken");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const normalizeOtp = (value) => String(value ?? "").trim();
const hashOtp = (otp) => crypto.createHash("sha256").update(normalizeOtp(otp)).digest("hex");

const register = async (req, res) => {
    try {
        const { firstName, lastName, email, password, phone, role, } = req.body;
        const normalizedEmail = String(email || "").trim().toLowerCase();

        if (!firstName || !lastName || !normalizedEmail || !password || !phone) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters", });
        }

        const existingUser = await User.findOne({ email: normalizedEmail });

        if (existingUser) {
            return res.status(409).json({ message: "Email already registered" });
        }

        const userRole = role === "owner" ? "owner" : "buyer";

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            firstName,
            lastName,
            email: normalizedEmail,
            password: hashedPassword,
            phone,
            role: userRole,
            isVerified: true
        });

        res.status(201).json({ message: "Registration successful. You can now log in." });

    } catch (error) {
        console.error("Register error:", error)
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

        const isPasswordCorrect = await bcrypt.compare(password, user.password);

        if (!isPasswordCorrect) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        if (!user.isVerified) {
            return res.status(403).json({ message: "Please verify your email before logging in" });
        }

        const token = generateToken(user);

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

        // The fallback supports unverified accounts created before OTP hashing
        // was introduced; newly issued OTPs are always stored as hashes.
        if (!user.otp || (user.otp !== hashOtp(normalizedOtp) && normalizeOtp(user.otp) !== normalizedOtp)) {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        if (user.otpExpiresAt < Date.now()) {
            return res.status(400).json({ message: "OTP has expired" });
        }

        user.isVerified = true;
        user.otp = undefined;
        user.otpExpiresAt = undefined;

        await user.save();
        void sendMail({
            to: user.email,
            subject: "Email Verified Successfully",
            text: "Your email has been verified. You can now log in to your Nestora account.",
            html: `
                <div style="margin:0;padding:32px 16px;background:#f7f5f0;font-family:Arial,sans-serif;color:#17352b;">
                  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e1d8;">
                    <div style="padding:24px 32px;background:#17352b;color:#ffffff;font-size:24px;font-weight:700;">Nestora</div>
                    <div style="padding:32px;">
                      <div style="font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#c9a45c;">Account verified</div>
                      <h1 style="margin:12px 0 16px;font-size:28px;color:#17352b;">Welcome to Nestora</h1>
                      <p style="font-size:15px;line-height:1.6;color:#63736c;">Hi ${user.firstName}, your email has been verified successfully. You can now access your account.</p>
                      <a href="${process.env.CLIENT_URL}/login" style="display:inline-block;margin-top:20px;padding:13px 22px;background:#c9a45c;color:#0d1713;text-decoration:none;border-radius:6px;font-size:14px;font-weight:700;">Log in to Nestora</a>
                    </div>
                    <div style="padding:18px 32px;border-top:1px solid #e5e1d8;font-size:12px;color:#8a9790;">© ${new Date().getFullYear()} Nestora</div>
                  </div>
                </div>
            `,
        }).catch((error) => {
            console.error("Failed to send verification confirmation:", error.message);
        });

        res.status(200).json({ message: "Email verified successfully. You can now login." });

    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const regenerateOtp = async (req, res) => {
    try {
        const normalizedEmail = String(req.body.email || "").trim().toLowerCase();
        if (!normalizedEmail) {
            return res.status(400).json({ message: "Email is required" });
        }

        const regenerate = await User.findOne({ email: normalizedEmail });

        if (!regenerate) {
            return res.status(404).json({ message: "User Not Found" });
        }

        const otp = String(Math.floor(Math.random() * 1000000)).padStart(6, "0");

        regenerate.otp = hashOtp(otp);
        regenerate.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

        await regenerate.save();

        await sendOtp(normalizedEmail, otp);

        return res.status(200).json({ message: "A new OTP has been sent to your email" });

    } catch (error) {
        console.error("Regenerate OTP error:", error);
        res.status(502).json({ message: "Unable to send OTP. Please check your email address or try again later." });
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

        console.log('Profile updated for user:', safeUser.email);
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
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];

            // Decode without verifying so we can still read exp even if the
            // token is close to expiry or already expired client-side.
            const decoded = jwt.decode(token);

            if (decoded?.exp) {
                await TokenBlocklist.create({
                    token: hashToken(token),
                    expiresAt: new Date(decoded.exp * 1000),
                });
            }
        }

        return res.status(200).json({ message: "Logout successful" });
    } catch (error) {
        // Even if blocklisting fails, complete the logout so the client
        // clears its token. Log the failure for investigation.
        console.error("Logout blocklist error:", error);
        return res.status(200).json({ message: "Logout successful" });
    }
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
