const jwt = require("jsonwebtoken");
const User = require("../model/userLoginLogoutModel");
const { findUserById } = require("../data/store");
const { isDatabaseReady } = require("../config/db");

// =========================================================================
// IN-MEMORY LRU CACHE FOR AUTHENTICATED USER SESSIONS
// - Time Complexity: O(1) hit lookup, O(1) insertion, O(1) eviction
// - Space Complexity: Strictly bounded to O(M) where M = capacity (500 items)
// - Eliminates redundant database roundtrips on consecutive API calls
// =========================================================================
class UserLruCache {
    constructor(capacity = 500, ttlMs = 60 * 1000) {
        this.capacity = capacity;
        this.ttlMs = ttlMs;
        this.cache = new Map();
    }

    get(id) {
        if (!id) return null;
        const entry = this.cache.get(String(id));
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(String(id));
            return null;
        }
        // Refresh access order (delete and re-insert to tail)
        this.cache.delete(String(id));
        this.cache.set(String(id), entry);
        return entry.user;
    }

    set(id, user) {
        if (!id || !user) return;
        const key = String(id);
        if (this.cache.has(key)) {
            this.cache.delete(key);
        } else if (this.cache.size >= this.capacity) {
            // Evict least recently used (first element in Map iteration)
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey !== undefined) {
                this.cache.delete(oldestKey);
            }
        }
        this.cache.set(key, {
            user,
            expiresAt: Date.now() + this.ttlMs
        });
    }

    invalidate(id) {
        if (id) {
            this.cache.delete(String(id));
        } else {
            this.cache.clear();
        }
    }
}

const userAuthCache = new UserLruCache(500, 60 * 1000);

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        try {
            token = req.headers.authorization.split(" ")[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret_key");
            const userId = decoded.id;

            // 1. Fast Path: In-memory O(1) LRU Cache Hit
            const cachedUser = userAuthCache.get(userId);
            if (cachedUser) {
                req.user = cachedUser;
                return next();
            }

            // 2. Slow Path: Database or Fallback Store Lookup in O(1)
            let user = null;
            if (isDatabaseReady()) {
                user = await User.findById(userId).select("-password").lean();
            } else {
                const found = findUserById(userId);
                if (found) {
                    user = { ...found };
                    delete user.password;
                }
            }

            if (!user) {
                return res.status(401).json({ message: "Not authorized, user not found" });
            }

            // Cache for subsequent requests
            userAuthCache.set(userId, user);
            req.user = user;
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

module.exports = { protect, admin, superAdmin, userAuthCache };
