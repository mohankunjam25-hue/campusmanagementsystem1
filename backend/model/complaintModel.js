const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500
        },

        category: {
            type: String,
            required: true,
            enum: [
                "Electricity",
                "Water",
                "Food",
                "Cleanliness",
                "Internet",
                "Hostel",
                "Other",
                "Cleaning",
                "Furniture",
                "Washroom"
            ]
        },

        location: {
            type: String,
            required: true,
            trim: true
        },

        reportedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        image: {
            type: String,
            default: null
        },

        status: {
            type: String,
            enum: ["Pending", "In Progress", "Resolved"],
            default: "Pending"
        },

        resolutionMessage: {
            type: String,
            default: null,
            trim: true
        },

        resolvedBy: {
            type: String,
            default: null,
            trim: true
        }
    },
    {
        timestamps: true
    }
);

// Compound & Single B-Tree Indices for O(log N) seeks and sort elimination
complaintSchema.index({ createdAt: -1 });
complaintSchema.index({ reportedBy: 1, createdAt: -1 });
complaintSchema.index({ status: 1, createdAt: -1 });
complaintSchema.index({ category: 1, createdAt: -1 });
complaintSchema.index({ status: 1, category: 1, createdAt: -1 });

module.exports = mongoose.model("Complaint", complaintSchema);