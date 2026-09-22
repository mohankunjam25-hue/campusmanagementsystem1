const Complaint = require("../model/complaintModel");
const {
    findComplaintById,
    addComplaint,
    updateComplaintById,
    queryComplaints,
    getComplaintMetrics,
    makeId
} = require("../data/store");
const { isDatabaseReady } = require("../config/db");
require("../model/userLoginLogoutModel");

/**
 * Create Complaint
 * Time Complexity: O(1) in-memory store / O(log N) MongoDB B-tree insertion
 * Space Complexity: O(1)
 */
const createComplaint = async (req, res) => {
    try {
        const {
            title,
            description,
            category,
            location
        } = req.body;

        const reportedBy = req.user._id || req.user.id;
        
        let image = null;
        if (req.file) {
            image = `/uploads/${req.file.filename}`;
        }

        if (!title || !description || !category || !location || !reportedBy) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        if (isDatabaseReady()) {
            const complaint = await Complaint.create({
                title: String(title).trim(),
                description: String(description).trim(),
                category: String(category).trim(),
                location: String(location).trim(),
                reportedBy,
                image
            });

            return res.status(201).json({
                message: "Complaint created successfully",
                complaint
            });
        }

        const newComplaint = {
            _id: makeId(),
            title: String(title).trim(),
            description: String(description).trim(),
            category: String(category).trim(),
            location: String(location).trim(),
            reportedBy,
            image,
            status: "Pending",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            reporterName: req.user.name || "Student",
            reporterEmail: req.user.email || ""
        };

        // O(1) in-memory addition & async debounced disk write
        addComplaint(newComplaint);

        return res.status(201).json({
            message: "Complaint created successfully",
            complaint: newComplaint
        });

    } catch (error) {
        console.error("Create complaint error:", error);
        return res.status(500).json({
            message: "Failed to create complaint",
            error: error.message
        });
    }
};

/**
 * Get Complaints with Server-side B-Tree indexed Pagination and Filtering
 * Time Complexity: O(log N + K) MongoDB index scan / O(K) Fallback Inverted Index slice
 * Space Complexity: O(K) where K = limit (strictly bounded memory)
 */
const getComplaints = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            status,
            category,
            search,
            mine
        } = req.query;

        const p = Math.max(1, parseInt(page, 10) || 1);
        const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

        let reporterId = null;
        if (mine === "true" || (req.user && req.user.role === "student" && req.query.all !== "true")) {
            reporterId = req.user._id || req.user.id;
        }

        if (isDatabaseReady()) {
            const filter = {};
            if (status && status !== "All" && status !== "all") {
                filter.status = status;
            }
            if (category && category !== "All" && category !== "all") {
                filter.category = category;
            }
            if (reporterId) {
                filter.reportedBy = reporterId;
            }
            if (search) {
                const s = String(search).trim();
                filter.$or = [
                    { title: { $regex: s, $options: "i" } },
                    { description: { $regex: s, $options: "i" } },
                    { location: { $regex: s, $options: "i" } }
                ];
            }

            // Execute paginated seek and total count concurrently
            const [complaints, total] = await Promise.all([
                Complaint.find(filter)
                    .populate("reportedBy", "name email")
                    .sort({ createdAt: -1 })
                    .skip((p - 1) * l)
                    .limit(l)
                    .lean(),
                Complaint.countDocuments(filter)
            ]);

            return res.status(200).json({
                complaints,
                pagination: {
                    total,
                    page: p,
                    limit: l,
                    totalPages: Math.ceil(total / l)
                }
            });
        }

        // Fallback Store: O(K) memory and indexed slice
        const result = queryComplaints({
            page: p,
            limit: l,
            status,
            category,
            reporterId,
            search
        });

        return res.status(200).json(result);

    } catch (error) {
        console.error("Fetch complaints error:", error);
        return res.status(500).json({
            message: "Failed to fetch complaints",
            error: error.message
        });
    }
};

/**
 * Get Complaint By ID
 * Time Complexity: O(1) Hash Map lookup / O(1) MongoDB indexed ObjectId query
 * Space Complexity: O(1)
 */
const getComplaintById = async (req, res) => {
    try {
        const id = req.params.id;

        if (isDatabaseReady()) {
            const complaint = await Complaint.findById(id)
                .populate("reportedBy", "name email")
                .lean();

            if (!complaint) {
                return res.status(404).json({ message: "Complaint not found" });
            }

            return res.status(200).json({ complaint });
        }

        const complaint = findComplaintById(id);
        if (!complaint) {
            return res.status(404).json({ message: "Complaint not found" });
        }

        return res.status(200).json({ complaint });

    } catch (error) {
        console.error("Fetch complaint error:", error);
        return res.status(500).json({
            message: "Failed to fetch complaint",
            error: error.message
        });
    }
};

/**
 * Update Complaint
 * Time Complexity: O(1) Hash Map update / O(1) MongoDB update by ID
 * Space Complexity: O(1)
 */
const updateComplaint = async (req, res) => {
    try {
        const { status, resolutionMessage } = req.body;
        const id = req.params.id;

        const updateFields = {};
        if (status) updateFields.status = status;
        if (resolutionMessage !== undefined) updateFields.resolutionMessage = resolutionMessage;
        if (req.user && req.user.name) {
            updateFields.resolvedBy = req.user.name;
        }

        if (isDatabaseReady()) {
            const complaint = await Complaint.findByIdAndUpdate(
                id,
                updateFields,
                { new: true, runValidators: true }
            ).lean();

            if (!complaint) {
                return res.status(404).json({ message: "Complaint not found" });
            }

            return res.status(200).json({
                message: "Complaint updated successfully",
                complaint
            });
        }

        const updated = updateComplaintById(id, updateFields);
        if (!updated) {
            return res.status(404).json({ message: "Complaint not found" });
        }

        return res.status(200).json({
            message: "Complaint updated successfully",
            complaint: updated
        });

    } catch (error) {
        console.error("Update complaint error:", error);
        return res.status(500).json({
            message: "Failed to update complaint",
            error: error.message
        });
    }
};

/**
 * Get Complaint Statistics / Analytics
 * Time Complexity: O(1) Fallback In-memory Counters / O(log N) MongoDB B-tree covered aggregation
 * Space Complexity: O(1)
 */
const getComplaintStats = async (req, res) => {
    try {
        if (isDatabaseReady()) {
            const agg = await Complaint.aggregate([
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 }
                    }
                }
            ]);

            const stats = {
                Total: 0,
                Pending: 0,
                "In Progress": 0,
                Resolved: 0
            };

            for (const item of agg) {
                stats.Total += item.count;
                if (stats[item._id] !== undefined) {
                    stats[item._id] = item.count;
                }
            }

            return res.status(200).json(stats);
        }

        const stats = getComplaintMetrics();
        return res.status(200).json(stats);
    } catch (error) {
        console.error("Get complaint stats error:", error);
        return res.status(500).json({
            message: "Failed to calculate stats",
            error: error.message
        });
    }
};

module.exports = {
    createComplaint,
    getComplaints,
    getComplaintById,
    updateComplaint,
    getComplaintStats
};