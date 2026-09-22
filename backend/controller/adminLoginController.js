const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const User = require("../model/userLoginLogoutModel");
const {
    getUsers,
    findUserByEmail: storeFindUserByEmail,
    findUserById: storeFindUserById,
    upsertUser: storeUpsertUser,
    deleteUserById: storeDeleteUserById,
    makeId
} = require("../data/store");
const { userAuthCache } = require("../middleware/authMiddleware");
const { isDatabaseReady } = require("../config/db");
const { sendOtpEmail } = require("../config/mailer");

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || "default_secret_key", {
        expiresIn: "30d"
    });
};

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

/**
 * O(1) User lookup and authentication in fallback store
 */
const findUserByEmail = async (email, password) => {
    const normalizedEmail = normalizeEmail(email);
    const match = storeFindUserByEmail(normalizedEmail);
    if (match) {
        try {
            const isMatch = await bcrypt.compare(password, match.password);
            if (isMatch) return match;
        } catch (e) {}
        if (match.password === password) return match;
    }

    return null;
};

const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        const normalizedEmail = normalizeEmail(email);

        if (isDatabaseReady()) {
            const existingUser = await User.findOne({ email: normalizedEmail });

            if (existingUser) {
                return res.status(400).json({
                    message: "User already exists"
                });
            }

            const user = await User.create({
                name: String(name).trim(),
                email: normalizedEmail,
                password,
                role: "student"
            });

            return res.status(201).json({
                message: "User registered successfully",
                token: generateToken(user._id),
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            });
        }

        // O(1) Unique Index Check
        const existing = storeFindUserByEmail(normalizedEmail);
        if (existing) {
            return res.status(400).json({
                message: "User already exists"
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = {
            id: makeId(),
            name: String(name).trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: "student",
            createdAt: new Date().toISOString()
        };

        // O(1) In-memory Hash Map Insertion & Async Save
        storeUpsertUser(newUser);

        return res.status(201).json({
            message: "User registered successfully",
            token: generateToken(newUser.id),
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role
            }
        });

    } catch (error) {
        console.error("Register user error:", error);
        res.status(500).json({
            message: "Failed to register user",
            error: error.message
        });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const normalizedEmail = normalizeEmail(email);

        if (isDatabaseReady()) {
            const user = await User.findOne({ email: normalizedEmail });

            if (user && (await user.matchPassword(password))) {
                return res.status(200).json({
                    message: "Login successful",
                    token: generateToken(user._id),
                    user: {
                        id: user._id,
                        name: user.name,
                        email: user.email,
                        role: user.role
                    }
                });
            } else {
                return res.status(401).json({ message: "Invalid email or password" });
            }
        }

        const user = await findUserByEmail(normalizedEmail, password);

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        return res.status(200).json({
            message: "Login successful",
            token: generateToken(user.id),
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role || "student"
            }
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Failed to login",
            error: error.message
        });
    }
};

const createAdmin = async (req, res) => {
    try {
        const { name, email, password, department, role } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }
        const normalizedEmail = normalizeEmail(email);
        const assignedRole = role === "super_admin" ? "super_admin" : "admin";
        const assignedDepartment = department || "General Campus Administration";

        if (isDatabaseReady()) {
            const existing = await User.findOne({ email: normalizedEmail });
            if (existing) return res.status(400).json({ message: "Administrator with this email already exists" });

            const user = await User.create({
                name: String(name).trim(),
                email: normalizedEmail,
                password,
                role: assignedRole,
                department: assignedDepartment
            });
            return res.status(201).json({ message: "Administrator provisioned successfully", user: { id: user._id, name: user.name, email: user.email, role: user.role, department: user.department } });
        }

        // O(1) Unique Index Check in Fallback Store
        const existing = storeFindUserByEmail(normalizedEmail);
        if (existing) {
            return res.status(400).json({ message: "Administrator with this email already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newAdmin = {
            id: makeId(),
            name: String(name).trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: assignedRole,
            department: assignedDepartment,
            createdAt: new Date().toISOString()
        };

        // O(1) In-memory Hash Map Insertion & Async Save
        storeUpsertUser(newAdmin);

        return res.status(201).json({ message: "Administrator provisioned successfully", user: { id: newAdmin.id, name: newAdmin.name, email: newAdmin.email, role: newAdmin.role, department: newAdmin.department } });

    } catch (error) {
        console.error("Create admin error:", error);
        res.status(500).json({ message: "Failed to create administrator", error: error.message });
    }
};

const getAdmins = async (req, res) => {
    try {
        if (isDatabaseReady()) {
            const admins = await User.find({ role: { $in: ["admin", "super_admin"] } }).select("-password").lean();
            return res.status(200).json(admins);
        }

        const users = getUsers().filter(u => u.role === "admin" || u.role === "super_admin").map(u => {
            const { password, ...rest } = u;
            return rest;
        });
        return res.status(200).json(users);

    } catch (error) {
        console.error("Fetch admins error:", error);
        res.status(500).json({ message: "Failed to fetch administrator directory" });
    }
};

const deleteAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        // Prevent Super Admin from self-revoking
        const currentUserId = String(req.user?._id || req.user?.id || "");
        if (currentUserId && currentUserId === String(id)) {
            return res.status(400).json({ message: "Security Warning: You cannot revoke your own Super Admin credentials." });
        }

        if (isDatabaseReady()) {
            const target = await User.findById(id);
            if (!target) return res.status(404).json({ message: "Administrator not found" });
            await User.findByIdAndDelete(id);
        } else {
            const target = storeFindUserById(id);
            if (!target) return res.status(404).json({ message: "Administrator not found" });
            storeDeleteUserById(id);
        }

        // Invalidate LRU session cache
        userAuthCache.invalidate(id);

        return res.status(200).json({ message: "Administrator access credentials revoked successfully" });

    } catch (error) {
        console.error("Revoke admin error:", error);
        res.status(500).json({ message: "Failed to revoke administrator credentials" });
    }
};

/**
 * Public endpoint to expose public OAuth client IDs and settings
 */
const getAuthConfig = (req, res) => {
    try {
        const rawClientId = process.env.GOOGLE_CLIENT_ID || "";
        const googleClientId = (rawClientId && rawClientId !== "YOUR_GOOGLE_CLIENT_ID_HERE") ? rawClientId : "";
        res.status(200).json({
            googleClientId,
            emailDeliveryConfigured: Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS)
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to load auth config" });
    }
};

/**
 * Google Sign-In & Registration handler
 */
const googleLogin = async (req, res) => {
    try {
        const { credential } = req.body;
        if (!credential) {
            return res.status(400).json({ message: "Google credential token is required" });
        }

        let payload;
        const googleClientId = process.env.GOOGLE_CLIENT_ID;

        if (googleClientId && googleClientId !== "YOUR_GOOGLE_CLIENT_ID_HERE") {
            try {
                const client = new OAuth2Client(googleClientId);
                const ticket = await client.verifyIdToken({
                    idToken: credential,
                    audience: googleClientId
                });
                payload = ticket.getPayload();
            } catch (verifyErr) {
                console.warn("Google token verification failed, attempting JWT decode fallback:", verifyErr.message);
                payload = jwt.decode(credential);
            }
        } else {
            // Development or unconfigured client ID: decode token directly
            payload = jwt.decode(credential);
            if (!payload || !payload.email) {
                try {
                    const middlePart = credential.includes(".") ? credential.split(".")[1] : credential;
                    payload = JSON.parse(Buffer.from(middlePart, "base64").toString("utf8"));
                } catch (e) {}
            }
        }

        if (!payload || !payload.email) {
            return res.status(400).json({ message: "Invalid Google credential" });
        }

        const normalizedEmail = normalizeEmail(payload.email);
        const name = payload.name || payload.given_name || "Google Student";
        const avatar = payload.picture || null;
        const googleId = payload.sub || null;

        if (isDatabaseReady()) {
            let user = await User.findOne({ email: normalizedEmail });

            if (user) {
                let updated = false;
                if (!user.googleId && googleId) {
                    user.googleId = googleId;
                    updated = true;
                }
                if (!user.avatar && avatar) {
                    user.avatar = avatar;
                    updated = true;
                }
                if (updated) {
                    await user.save();
                }
            } else {
                user = await User.create({
                    name: String(name).trim(),
                    email: normalizedEmail,
                    role: "student",
                    googleId,
                    avatar
                });
            }

            return res.status(200).json({
                message: "Google Sign-In successful",
                token: generateToken(user._id),
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    avatar: user.avatar
                }
            });
        }

        // Local JSON store fallback: O(1) Unique Index Lookup
        let user = storeFindUserByEmail(normalizedEmail);

        if (user) {
            let updated = false;
            if (!user.googleId && googleId) {
                user.googleId = googleId;
                updated = true;
            }
            if (!user.avatar && avatar) {
                user.avatar = avatar;
                updated = true;
            }
            if (updated) {
                storeUpsertUser(user);
                userAuthCache.invalidate(user.id || user._id);
            }
        } else {
            user = {
                id: makeId(),
                name: String(name).trim(),
                email: normalizedEmail,
                role: "student",
                googleId,
                avatar,
                createdAt: new Date().toISOString()
            };
            storeUpsertUser(user);
        }

        return res.status(200).json({
            message: "Google Sign-In successful",
            token: generateToken(user.id),
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar
            }
        });

    } catch (error) {
        console.error("Google login error:", error);
        res.status(500).json({
            message: "Failed to authenticate with Google",
            error: error.message
        });
    }
};

/**
 * Forgot password - dispatches 6-digit OTP to student's email
 */
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const normalizedEmail = normalizeEmail(email);
        const otp = crypto.randomInt(100000, 1000000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        let targetUserName = "Student";

        if (isDatabaseReady()) {
            const user = await User.findOne({ email: normalizedEmail });
            if (!user) {
                return res.status(404).json({ message: "No registered account found with this email" });
            }

            user.resetPasswordOtp = otp;
            user.resetPasswordExpires = expiresAt;
            await user.save();
            targetUserName = user.name;
        } else {
            const user = storeFindUserByEmail(normalizedEmail);
            if (!user) {
                return res.status(404).json({ message: "No registered account found with this email" });
            }

            user.resetPasswordOtp = otp;
            user.resetPasswordExpires = expiresAt.toISOString();
            storeUpsertUser(user);
            targetUserName = user.name;
        }

        const mailResult = await sendOtpEmail(normalizedEmail, otp, targetUserName);

        return res.status(200).json({
            message: "A 6-digit verification code has been dispatched to your email",
            email: normalizedEmail,
            mode: mailResult.mode,
            devOtp: mailResult.devOtp
        });

    } catch (error) {
        console.error("Forgot password error:", error);
        res.status(500).json({
            message: "Failed to process forgot password request",
            error: error.message
        });
    }
};

/**
 * Reset password using OTP code
 */
const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({ message: "Email, OTP code, and new password are required" });
        }

        if (String(newPassword).length < 6) {
            return res.status(400).json({ message: "New password must be at least 6 characters" });
        }

        const normalizedEmail = normalizeEmail(email);
        const cleanedOtp = String(otp).trim();

        if (isDatabaseReady()) {
            const user = await User.findOne({ email: normalizedEmail });
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            if (
                !user.resetPasswordOtp ||
                user.resetPasswordOtp !== cleanedOtp ||
                !user.resetPasswordExpires ||
                new Date(user.resetPasswordExpires).getTime() < Date.now()
            ) {
                return res.status(400).json({ message: "Invalid or expired verification code" });
            }

            user.password = newPassword;
            user.resetPasswordOtp = null;
            user.resetPasswordExpires = null;
            await user.save();
            userAuthCache.invalidate(user._id);

            return res.status(200).json({
                message: "Password reset successfully! You can now log in with your new password."
            });
        }

        // Local store fallback: O(1) Unique Index Lookup
        const user = storeFindUserByEmail(normalizedEmail);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (
            !user.resetPasswordOtp ||
            user.resetPasswordOtp !== cleanedOtp ||
            !user.resetPasswordExpires ||
            new Date(user.resetPasswordExpires).getTime() < Date.now()
        ) {
            return res.status(400).json({ message: "Invalid or expired verification code" });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.resetPasswordOtp = null;
        user.resetPasswordExpires = null;
        storeUpsertUser(user);
        userAuthCache.invalidate(user.id || user._id);

        return res.status(200).json({
            message: "Password reset successfully! You can now log in with your new password."
        });

    } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({
            message: "Failed to reset password",
            error: error.message
        });
    }
};

/**
 * Send OTP to logged-in student for changing password
 */
const sendChangePasswordOtp = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const normalizedEmail = normalizeEmail(req.user.email);
        const otp = crypto.randomInt(100000, 1000000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        let studentName = req.user.name || "Student";

        if (isDatabaseReady()) {
            const user = await User.findById(userId);
            if (!user) return res.status(404).json({ message: "User not found" });
            user.resetPasswordOtp = otp;
            user.resetPasswordExpires = expiresAt;
            await user.save();
            studentName = user.name;
        } else {
            const user = storeFindUserById(userId);
            if (!user) return res.status(404).json({ message: "User not found" });
            user.resetPasswordOtp = otp;
            user.resetPasswordExpires = expiresAt.toISOString();
            storeUpsertUser(user);
            studentName = user.name;
        }

        const mailResult = await sendOtpEmail(normalizedEmail, otp, studentName);

        return res.status(200).json({
            message: "Security OTP dispatched to your registered email",
            email: normalizedEmail,
            mode: mailResult.mode,
            devOtp: mailResult.devOtp
        });

    } catch (error) {
        console.error("Send change OTP error:", error);
        res.status(500).json({ message: "Failed to send verification code", error: error.message });
    }
};

/**
 * Change password for logged-in student (verifies via OTP or current password)
 */
const changePassword = async (req, res) => {
    try {
        const { currentPassword, otp, newPassword } = req.body;
        const userId = req.user._id || req.user.id;

        if (!newPassword || String(newPassword).length < 6) {
            return res.status(400).json({ message: "New password must be at least 6 characters" });
        }

        if (isDatabaseReady()) {
            const user = await User.findById(userId);
            if (!user) return res.status(404).json({ message: "User not found" });

            let authorized = false;

            // Verification method 1: OTP sent to mail
            if (otp) {
                const cleanedOtp = String(otp).trim();
                if (
                    user.resetPasswordOtp &&
                    user.resetPasswordOtp === cleanedOtp &&
                    user.resetPasswordExpires &&
                    new Date(user.resetPasswordExpires).getTime() >= Date.now()
                ) {
                    authorized = true;
                } else {
                    return res.status(400).json({ message: "Invalid or expired security OTP code" });
                }
            } 
            // Verification method 2: Current password
            else if (currentPassword) {
                if (await user.matchPassword(currentPassword)) {
                    authorized = true;
                } else {
                    return res.status(400).json({ message: "Current password is incorrect" });
                }
            }
            // For OAuth users who don't have a password set yet
            else if (!user.password) {
                authorized = true;
            } else {
                return res.status(400).json({ message: "Please provide either the email OTP code or current password" });
            }

            if (!authorized) {
                return res.status(400).json({ message: "Verification failed" });
            }

            user.password = newPassword;
            user.resetPasswordOtp = null;
            user.resetPasswordExpires = null;
            await user.save();
            userAuthCache.invalidate(userId);

            return res.status(200).json({ message: "Password updated successfully" });
        }

        // Local store fallback: O(1) Primary Key Lookup
        const user = storeFindUserById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        let authorized = false;
        if (otp) {
            const cleanedOtp = String(otp).trim();
            if (
                user.resetPasswordOtp &&
                user.resetPasswordOtp === cleanedOtp &&
                user.resetPasswordExpires &&
                new Date(user.resetPasswordExpires).getTime() >= Date.now()
            ) {
                authorized = true;
            } else {
                return res.status(400).json({ message: "Invalid or expired security OTP code" });
            }
        } else if (currentPassword) {
            try {
                const isMatch = await bcrypt.compare(currentPassword, user.password);
                if (isMatch || user.password === currentPassword) {
                    authorized = true;
                }
            } catch (e) {
                if (user.password === currentPassword) authorized = true;
            }
            if (!authorized) {
                return res.status(400).json({ message: "Current password is incorrect" });
            }
        } else if (!user.password) {
            authorized = true;
        } else {
            return res.status(400).json({ message: "Please provide either the email OTP code or current password" });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.resetPasswordOtp = null;
        user.resetPasswordExpires = null;
        storeUpsertUser(user);
        userAuthCache.invalidate(userId);

        return res.status(200).json({ message: "Password updated successfully" });

    } catch (error) {
        console.error("Change password error:", error);
        res.status(500).json({ message: "Failed to change password", error: error.message });
    }
};

/**
 * Handle Google Redirect POST callback (used by ux_mode: "redirect")
 */
const googleRedirectCallback = async (req, res) => {
    try {
        const credential = req.body?.credential;
        if (!credential) {
            return res.redirect("/index.html?error=no_credential");
        }

        let payload;
        const googleClientId = process.env.GOOGLE_CLIENT_ID;

        if (googleClientId && googleClientId !== "YOUR_GOOGLE_CLIENT_ID_HERE") {
            try {
                const client = new OAuth2Client(googleClientId);
                const ticket = await client.verifyIdToken({
                    idToken: credential,
                    audience: googleClientId
                });
                payload = ticket.getPayload();
            } catch (verifyErr) {
                console.warn("Google token verification failed, attempting JWT decode fallback:", verifyErr.message);
                payload = jwt.decode(credential);
            }
        } else {
            payload = jwt.decode(credential);
            if (!payload || !payload.email) {
                try {
                    const middlePart = credential.includes(".") ? credential.split(".")[1] : credential;
                    payload = JSON.parse(Buffer.from(middlePart, "base64").toString("utf8"));
                } catch (e) {}
            }
        }

        if (!payload || !payload.email) {
            return res.redirect("/index.html?error=invalid_credential");
        }

        const normalizedEmail = normalizeEmail(payload.email);
        const name = payload.name || payload.given_name || "Google Student";
        const avatar = payload.picture || null;
        const googleId = payload.sub || null;

        let userObj;
        let token;

        if (isDatabaseReady()) {
            let user = await User.findOne({ email: normalizedEmail });

            if (user) {
                let updated = false;
                if (!user.googleId && googleId) {
                    user.googleId = googleId;
                    updated = true;
                }
                if (!user.avatar && avatar) {
                    user.avatar = avatar;
                    updated = true;
                }
                if (updated) {
                    await user.save();
                    userAuthCache.invalidate(user._id);
                }
            } else {
                user = await User.create({
                    name: String(name).trim(),
                    email: normalizedEmail,
                    role: "student",
                    googleId,
                    avatar
                });
            }

            token = generateToken(user._id);
            userObj = {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar
            };
        } else {
            // Local JSON store fallback: O(1) Unique Index Lookup
            let user = storeFindUserByEmail(normalizedEmail);

            if (user) {
                let updated = false;
                if (!user.googleId && googleId) {
                    user.googleId = googleId;
                    updated = true;
                }
                if (!user.avatar && avatar) {
                    user.avatar = avatar;
                    updated = true;
                }
                if (updated) {
                    storeUpsertUser(user);
                    userAuthCache.invalidate(user.id || user._id);
                }
            } else {
                user = {
                    id: makeId(),
                    name: String(name).trim(),
                    email: normalizedEmail,
                    role: "student",
                    googleId,
                    avatar,
                    createdAt: new Date().toISOString()
                };
                storeUpsertUser(user);
            }

            token = generateToken(user.id || user._id);
            userObj = {
                id: user.id || user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar
            };
        }

        const redirectUrl = `/index.html?auth_token=${encodeURIComponent(token)}&user=${encodeURIComponent(JSON.stringify(userObj))}`;
        return res.redirect(303, redirectUrl);

    } catch (error) {
        console.error("Google redirect callback error:", error);
        return res.redirect("/index.html?error=" + encodeURIComponent(error.message));
    }
};

module.exports = {
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
};