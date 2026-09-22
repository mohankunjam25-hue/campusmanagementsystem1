const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const {
    createComplaint,
    getComplaints,
    getComplaintById,
    updateComplaint,
    getComplaintStats
} = require("../controller/complaintController");

// Create complaint
router.post("/", protect, upload.single("image"), createComplaint);

// Get complaints (paginated & filtered)
router.get("/", protect, getComplaints);

// Get complaint analytics / statistics (O(1) covered index / in-memory counters)
router.get("/stats", protect, getComplaintStats);

// Get single complaint
router.get("/:id", protect, getComplaintById);

// Update complaint
router.put("/:id", protect, admin, updateComplaint);

module.exports = router;