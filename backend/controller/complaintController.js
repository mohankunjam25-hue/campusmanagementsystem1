const Complaint = require("../model/complaintModel");
const { getComplaints: getLocalComplaints, saveComplaints, makeId } = require("../data/store");
const { isDatabaseReady } = require("../config/db");
require("../model/userLoginLogoutModel");

const getComplaintList = () => {
    const complaints = getLocalComplaints();
    return complaints.map((complaint) => ({
        ...complaint,
        reportedBy: typeof complaint.reportedBy === "string"
            ? { _id: complaint.reportedBy, name: complaint.reporterName || "Unknown", email: complaint.reporterEmail || "" }
            : complaint.reportedBy
    }));
};

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

        if (isDatabaseReady()) {
            const complaint = await Complaint.create({
                title,
                description,
                category,
                location,
                reportedBy
            });

            return res.status(201).json({
                message: "Complaint created successfully",
                complaint
            });
        }

        const complaints = getLocalComplaints();
        const newComplaint = {
            _id: makeId(),
            title,
            description,
            category,
            location,
            reportedBy,
            status: "Pending",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            reporterName: "Student",
            reporterEmail: "student@example.com"
        };

        saveComplaints([newComplaint, ...complaints]);

        return res.status(201).json({
            message: "Complaint created successfully",
            complaint: newComplaint
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: "Failed to create complaint",
            error: error.message
        });
    }
};

const getComplaints = async (req, res) => {
    try {
        if (isDatabaseReady()) {
            const complaints = await Complaint.find()
                .populate("reportedBy", "name email")
                .sort({ createdAt: -1 });

            return res.status(200).json({ complaints });
        }

        const complaints = getComplaintList().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return res.status(200).json({ complaints });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: "Failed to fetch complaints",
            error: error.message
        });
    }
};

const getComplaintById = async (req, res) => {
    try {
        if (isDatabaseReady()) {
            const complaint = await Complaint.findById(req.params.id)
                .populate("reportedBy", "name email");

            if (!complaint) {
                return res.status(404).json({
                    message: "Complaint not found"
                });
            }

            return res.status(200).json({ complaint });
        }

        const complaint = getComplaintList().find(item => item._id === req.params.id);

        if (!complaint) {
            return res.status(404).json({
                message: "Complaint not found"
            });
        }

        return res.status(200).json({ complaint });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: "Failed to fetch complaint",
            error: error.message
        });
    }
};

const updateComplaint = async (req, res) => {
    try {
        const { status, resolutionMessage } = req.body;

        if (isDatabaseReady()) {
            const complaint = await Complaint.findByIdAndUpdate(
                req.params.id,
                { status, resolutionMessage },
                { new: true, runValidators: true }
            );

            if (!complaint) {
                return res.status(404).json({
                    message: "Complaint not found"
                });
            }

            return res.status(200).json({
                message: "Complaint updated successfully",
                complaint
            });
        }

        const complaints = getLocalComplaints();
        const updatedComplaint = complaints.map((complaint) =>
            complaint._id === req.params.id
                ? {
                    ...complaint,
                    status: status || complaint.status,
                    resolutionMessage: resolutionMessage || complaint.resolutionMessage,
                    updatedAt: new Date().toISOString()
                }
                : complaint
        );

        saveComplaints(updatedComplaint);

        const complaint = updatedComplaint.find(item => item._id === req.params.id);

        if (!complaint) {
            return res.status(404).json({
                message: "Complaint not found"
            });
        }

        return res.status(200).json({
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