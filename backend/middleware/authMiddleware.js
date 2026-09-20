const jwt = require("jsonwebtoken");
const User = require("../model/userLoginLogoutModel");
const { getUsers } = require("../data/store");
const { isDatabaseReady } = require("../config/db");

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        try {
            token = req.headers.authorization.split(" ")[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret_key");

            if (isDatabaseReady()) {
                req.user = await User.findById(decoded.id).select("-password");
            } else {
                const users = getUsers();
                req.user = users.find(u => String(u.id) === String(decoded.id) || String(u._id) === String(decoded.id));
                // clone to avoid deleting password from the store
                if (req.user) {
                    req.user = { ...req.user };
                    delete req.user.password;
                }
            }

            if (!req.user) {
                return res.status(401).json({ message: "Not authorized, user not found" });
            }

            return next();
        } catch (error) {
            console.error("Auth middleware error:", error);
            return res.status(401).json({ message: "Not authorized, token failed" });
        }
    }

    if (!token) {
        return res.status(401).json({ message: "Not authorized, no token" });
    }
};

const admin = (req, res, next) => {
    if (req.user && (req.user.role === "admin" || req.user.role === "super_admin")) {
        next();
    } else {
        return res.status(403).json({ message: "Not authorized as an admin" });
    }
};

const superAdmin = (req, res, next) => {
    if (req.user && req.user.role === "super_admin") {
        next();
    } else {
        return res.status(403).json({ message: "Not authorized as a super admin" });
    }
};

module.exports = { protect, admin, superAdmin };
