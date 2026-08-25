const express = require("express");

const {register,login,getProfile,logout,regenerateOtp,verifyEmail,updateProfile} = require("../controller/auth.controller");

const protect = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/register", register);

router.post("/login", login);

router.post("/verify-email", verifyEmail);

router.post("/regenerate-otp", regenerateOtp);

router.post("/logout", logout);

router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);

module.exports = router;

