const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const adminSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        password: {
            type: String,
            required: false
        },

        role: {
            type: String,
            enum: ["student", "admin", "super_admin"],
            default: "student"
        },

        googleId: {
            type: String,
            default: null
        },

        avatar: {
            type: String,
            default: null
        },

        resetPasswordOtp: {
            type: String,
            default: null
        },

        resetPasswordExpires: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

// High-performance B-Tree indices
adminSchema.index({ googleId: 1 }, { sparse: true });
adminSchema.index({ role: 1 });
adminSchema.index({ resetPasswordOtp: 1, resetPasswordExpires: 1 });

// Hash password before saving
adminSchema.pre("save", async function () {
    if (!this.password || !this.isModified("password")) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Compare password
adminSchema.methods.matchPassword = async function (enteredPassword) {
    if (!this.password) return false;
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", adminSchema);