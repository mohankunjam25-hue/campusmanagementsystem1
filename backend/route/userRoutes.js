const express = require("express");

const router = express.Router();

const {
    registerUser,
    loginUser,
    createAdmin,
    getAdmins,
    deleteAdmin,
    getAuthConfig,
    googleLogin,
    googleRedirectCallback,
    forgotPassword,
    resetPassword,
    sendChangePasswordOtp,
    changePassword
} = require("../controller/adminLoginController");
const { protect, superAdmin } = require("../middleware/authMiddleware");

// Public Auth Configuration (OAuth client IDs)
router.get("/auth-config", getAuthConfig);

// Standard Email/Password Auth
router.post("/register", registerUser);
router.post("/login", loginUser);

// Google OAuth Sign-In
router.post("/google-login", googleLogin);
router.post("/google-callback", googleRedirectCallback);

// Password Reset Flow (Email OTP)
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Password Change Flow for Logged-In Users (with Email OTP support)
router.post("/send-change-otp", protect, sendChangePasswordOtp);
router.post("/change-password", protect, changePassword);

// Super Admin Management Routes
router.post("/admin", protect, superAdmin, createAdmin);
router.get("/admin", protect, superAdmin, getAdmins);
router.delete("/admin/:id", protect, superAdmin, deleteAdmin);

module.exports = router;