const express = require("express");

const router = express.Router();

const {
    createComplaint,
    getComplaints,
    getComplaintById,
    updateComplaint
} = require("../controller/complaintController");


// Create complaint
router.post("/", createComplaint);


// Get all complaints
router.get("/", getComplaints);


// Get single complaint
router.get("/:id", getComplaintById);


// Update complaint
router.put("/:id", updateComplaint);


module.exports = router;