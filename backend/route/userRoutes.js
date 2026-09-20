const express = require("express");

const router = express.Router();

const {
    registerUser,
    loginUser,
    createAdmin,
    getAdmins,
    deleteAdmin
} = require("../controller/adminLoginController");
const { protect, superAdmin } = require("../middleware/authMiddleware");

// Register
router.post("/register", registerUser);

// Login
router.post("/login", loginUser);

// Super Admin Management Routes
router.post("/admin", protect, superAdmin, createAdmin);
router.get("/admin", protect, superAdmin, getAdmins);
router.delete("/admin/:id", protect, superAdmin, deleteAdmin);

module.exports = router;