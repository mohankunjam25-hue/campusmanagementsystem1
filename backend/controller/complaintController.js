const Complaint = require("../model/complaintModel");

// Create Complaint
const createComplaint = async (req, res) => {
    try {
        const {
            title,
            description,
            category,
            location,
            reportedBy
        } = req.body;

        if (!title || !description || !category || !location || !reportedBy) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        const complaint = await Complaint.create({
            title,
            description,
            category,
            location,
            reportedBy
        });

        res.status(201).json({
            message: "Complaint created successfully",
            complaint
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: "Failed to create complaint",
            error: error.message
        });
    }
};


// Get All Complaints
const getComplaints = async (req, res) => {
    try {
        const complaints = await Complaint.find()
            .populate("reportedBy", "name email")
            .sort({ createdAt: -1 });

        res.status(200).json({
            complaints
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: "Failed to fetch complaints",
            error: error.message
        });
    }
};


// Get Single Complaint
const getComplaintById = async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id)
            .populate("reportedBy", "name email");

        if (!complaint) {
            return res.status(404).json({
                message: "Complaint not found"
            });
        }

        res.status(200).json({
            complaint
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: "Failed to fetch complaint",
            error: error.message
        });
    }
};


// Update Complaint
const updateComplaint = async (req, res) => {
    try {
        const {
            status,
            resolutionMessage
        } = req.body;

        const complaint = await Complaint.findByIdAndUpdate(
            req.params.id,
            {
                status,
                resolutionMessage
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!complaint) {
            return res.status(404).json({
                message: "Complaint not found"
            });
        }

        res.status(200).json({
            message: "Complaint updated successfully",
            complaint
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: "Failed to update complaint",
            error: error.message
        });
    }
};


module.exports = {
    createComplaint,
    getComplaints,
    getComplaintById,
    updateComplaint
};