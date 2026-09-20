const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const {
    createComplaint,
    getComplaints,
    getComplaintById,
    updateComplaint
} = require("../controller/complaintController");

// Create complaint
router.post("/", protect, upload.single("image"), createComplaint);

// Get all complaints
router.get("/", protect, getComplaints);

// Get single complaint
router.get("/:id", protect, getComplaintById);

// Update complaint
router.put("/:id", protect, admin, updateComplaint);

module.exports = router;