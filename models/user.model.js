const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true,
    },

    lastName: {
        type: String,
        required: true,
        trim: true,
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },

    password: {
        type: String,
        required: true,
        minlength: 6,
    },

    phone: {
        type: String,
        required: true,
        trim: true,
    },

    role: {
        type: String,
        enum: ["buyer", "owner", "admin"],
        default: "buyer",
    },

    isActive: {
        type: Boolean,
        default: true,
    },
    otp: {
        type: String,
        default: null,
    },
    otpExpiresAt: {
        type: Date,
        default: null,
    },
    isVerified: {
        type: Boolean,
        default: false,
    }
},
    {
        timestamps: true,
    }
);

const User = mongoose.model("User", userSchema);

module.exports = User;