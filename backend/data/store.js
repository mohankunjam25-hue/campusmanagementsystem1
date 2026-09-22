const fs = require("fs");
const path = require("path");

const STORAGE_PATH = path.join(__dirname, "store.json");

const defaultData = {
    users: [],
    complaints: []
};

// =========================================================================
// IN-MEMORY HASH MAP DATA STRUCTURES FOR O(1) LOOKUPS
// =========================================================================
let isInitialized = false;

// O(1) Primary Index by ID
const usersById = new Map();
// O(1) Unique Index by Normalized Email
const usersByEmail = new Map();

// O(1) Primary Index by Complaint ID
const complaintsById = new Map();
// O(1) Inverted Index by Reporter User ID -> Set<complaintId>
const complaintsByReporter = new Map();
// Pre-sorted reverse-chronological list for O(1) head insertion & O(K) slice
let complaintsChronological = [];

// Incremental Status Counters for O(1) Dashboard Analytics
const statusCounters = {
    Total: 0,
    Pending: 0,
    "In Progress": 0,
    Resolved: 0
};

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

/**
 * Initialize and populate all in-memory indexes from disk once
 * Time Complexity: O(N) one-time at boot
 * Space Complexity: O(N) in heap
 */
function initStore() {
    if (isInitialized) return;

    if (!fs.existsSync(STORAGE_PATH)) {
        try {
            fs.writeFileSync(STORAGE_PATH, JSON.stringify(defaultData, null, 2), "utf8");
        } catch (e) {}
    }

    let parsed = defaultData;
    try {
        const raw = fs.readFileSync(STORAGE_PATH, "utf8");
        parsed = JSON.parse(raw);
    } catch (error) {
        parsed = { ...defaultData };
    }

    const rawUsers = Array.isArray(parsed.users) ? parsed.users : [];
    const rawComplaints = Array.isArray(parsed.complaints) ? parsed.complaints : [];

    usersById.clear();
    usersByEmail.clear();
    complaintsById.clear();
    complaintsByReporter.clear();
    statusCounters.Total = 0;
    statusCounters.Pending = 0;
    statusCounters["In Progress"] = 0;
    statusCounters.Resolved = 0;

    // Index Users: O(U)
    for (const u of rawUsers) {
        const id = String(u.id || u._id || "");
        if (id) usersById.set(id, u);
        if (u.email) usersByEmail.set(normalizeEmail(u.email), u);
    }

    // Index Complaints: O(C)
    for (const c of rawComplaints) {
        const cid = String(c._id || c.id || "");
        if (!cid) continue;

        complaintsById.set(cid, c);

        const reporterId = String(c.reportedBy?._id || c.reportedBy || "");
        if (reporterId) {
            if (!complaintsByReporter.has(reporterId)) {
                complaintsByReporter.set(reporterId, new Set());
            }
            complaintsByReporter.get(reporterId).add(cid);
        }

        // Tally status counters
        statusCounters.Total++;
        if (statusCounters[c.status] !== undefined) {
            statusCounters[c.status]++;
        }
    }

    // Sort Chronologically descending: O(C log C) once at boot
    complaintsChronological = Array.from(complaintsById.values()).sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );

    isInitialized = true;
}

// Debounced Async Writer to decouple I/O from request-response lifecycle
let writeDebounceTimer = null;
function scheduleAsyncSave() {
    if (writeDebounceTimer) return;

    writeDebounceTimer = setTimeout(async () => {
        writeDebounceTimer = null;
        try {
            const dataToPersist = {
                users: Array.from(usersById.values()),
                complaints: Array.from(complaintsById.values())
            };
            await fs.promises.writeFile(STORAGE_PATH, JSON.stringify(dataToPersist, null, 2), "utf8");
        } catch (err) {
            console.error("Async store persistence failure:", err.message);
        }
    }, 120); // 120ms debounce amortizes multiple writes to O(1) I/O
}

// Ensure store is ready immediately
initStore();

// =========================================================================
// O(1) HIGH-PERFORMANCE DATA ACCESS METHODS
// =========================================================================

/**
 * O(1) User lookup by Unique ID
 */
function findUserById(id) {
    initStore();
    return usersById.get(String(id)) || null;
}

/**
 * O(1) User lookup by Email
 */
function findUserByEmail(email) {
    initStore();
    return usersByEmail.get(normalizeEmail(email)) || null;
}

/**
 * O(1) Insert or Update User
 */
function upsertUser(user) {
    initStore();
    const id = String(user.id || user._id || "");
    if (!id) return;

    usersById.set(id, user);
    if (user.email) usersByEmail.set(normalizeEmail(user.email), user);
    scheduleAsyncSave();
}

/**
 * O(1) Delete User by ID
 */
function deleteUserById(id) {
    initStore();
    const strId = String(id);
    const user = usersById.get(strId);
    if (!user) return false;
    usersById.delete(strId);
    if (user.email) usersByEmail.delete(normalizeEmail(user.email));
    scheduleAsyncSave();
    return true;
}

/**
 * O(1) Complaint lookup by ID
 */
function findComplaintById(id) {
    initStore();
    return complaintsById.get(String(id)) || null;
}

/**
 * O(1) Add New Complaint
 */
function addComplaint(complaint) {
    initStore();
    const cid = String(complaint._id || complaint.id || "");
    if (!cid) return;

    complaintsById.set(cid, complaint);

    // Update Inverted Reporter Index: O(1)
    const reporterId = String(complaint.reportedBy?._id || complaint.reportedBy || "");
    if (reporterId) {
        if (!complaintsByReporter.has(reporterId)) {
            complaintsByReporter.set(reporterId, new Set());
        }
        complaintsByReporter.get(reporterId).add(cid);
    }

    // Prepend to sorted array: O(1) amortized
    complaintsChronological.unshift(complaint);

    // Update Counters: O(1)
    statusCounters.Total++;
    if (statusCounters[complaint.status] !== undefined) {
        statusCounters[complaint.status]++;
    }

    scheduleAsyncSave();
}

/**
 * O(1) Update Complaint by ID
 */
function updateComplaintById(id, updates) {
    initStore();
    const existing = complaintsById.get(String(id));
    if (!existing) return null;

    const prevStatus = existing.status;
    const nextStatus = updates.status || prevStatus;

    if (prevStatus !== nextStatus) {
        if (statusCounters[prevStatus] !== undefined) statusCounters[prevStatus]--;
        if (statusCounters[nextStatus] !== undefined) statusCounters[nextStatus]++;
    }

    const updated = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString()
    };

    complaintsById.set(String(id), updated);

    // Update in sorted array
    const idx = complaintsChronological.findIndex(c => String(c._id) === String(id));
    if (idx !== -1) {
        complaintsChronological[idx] = updated;
    }

    scheduleAsyncSave();
    return updated;
}

/**
 * O(K) Paginated Complaints Query (where K = page limit)
 * Filters by status, category, reporter in bounded memory
 */
function queryComplaints({ page = 1, limit = 20, status, category, reporterId, search } = {}) {
    initStore();
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    let candidateIds = null;

    // Use Inverted Index if filtering by reporter: O(1) candidate lookup
    if (reporterId) {
        const reporterSet = complaintsByReporter.get(String(reporterId));
        if (!reporterSet || reporterSet.size === 0) {
            return { complaints: [], total: 0, page: p, totalPages: 0 };
        }
        candidateIds = reporterSet;
    }

    let source = candidateIds 
        ? Array.from(candidateIds).map(id => complaintsById.get(id)).filter(Boolean)
        : complaintsChronological;

    // Filter by status & category if needed
    if (status && status !== "all") {
        source = source.filter(c => c.status === status);
    }
    if (category && category !== "all") {
        source = source.filter(c => c.category === category);
    }
    if (search) {
        const q = String(search).toLowerCase();
        source = source.filter(c => 
            (c.title && c.title.toLowerCase().includes(q)) ||
            (c.description && c.description.toLowerCase().includes(q)) ||
            (c.location && c.location.toLowerCase().includes(q))
        );
    }

    const total = source.length;
    const startIndex = (p - 1) * l;
    const paginated = source.slice(startIndex, startIndex + l).map(c => {
        if (typeof c.reportedBy === "string") {
            const user = usersById.get(c.reportedBy);
            return {
                ...c,
                reportedBy: user
                    ? { _id: user.id || user._id, name: user.name, email: user.email }
                    : { _id: c.reportedBy, name: c.reporterName || "Unknown", email: c.reporterEmail || "" }
            };
        }
        return c;
    });

    return {
        complaints: paginated,
        total,
        page: p,
        totalPages: Math.ceil(total / l)
    };
}

/**
 * O(1) Get Incremental Analytics Metrics
 */
function getComplaintMetrics() {
    initStore();
    return { ...statusCounters };
}

// =========================================================================
// BACKWARD-COMPATIBLE API (For existing calls)
// =========================================================================

function getUsers() {
    initStore();
    return Array.from(usersById.values());
}

function saveUsers(users) {
    initStore();
    usersById.clear();
    usersByEmail.clear();
    for (const u of users) {
        const id = String(u.id || u._id || "");
        if (id) usersById.set(id, u);
        if (u.email) usersByEmail.set(normalizeEmail(u.email), u);
    }
    scheduleAsyncSave();
}

function getComplaints() {
    initStore();
    return Array.from(complaintsChronological);
}

function saveComplaints(complaints) {
    initStore();
    complaintsById.clear();
    complaintsByReporter.clear();
    statusCounters.Total = 0;
    statusCounters.Pending = 0;
    statusCounters["In Progress"] = 0;
    statusCounters.Resolved = 0;

    for (const c of complaints) {
        const cid = String(c._id || c.id || "");
        if (!cid) continue;
        complaintsById.set(cid, c);

        const reporterId = String(c.reportedBy?._id || c.reportedBy || "");
        if (reporterId) {
            if (!complaintsByReporter.has(reporterId)) {
                complaintsByReporter.set(reporterId, new Set());
            }
            complaintsByReporter.get(reporterId).add(cid);
        }

        statusCounters.Total++;
        if (statusCounters[c.status] !== undefined) statusCounters[c.status]++;
    }

    complaintsChronological = Array.from(complaintsById.values()).sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );

    scheduleAsyncSave();
}

function makeId() {
    return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

module.exports = {
    // High-performance algorithmic methods:
    findUserById,
    findUserByEmail,
    upsertUser,
    deleteUserById,
    findComplaintById,
    addComplaint,
    updateComplaintById,
    queryComplaints,
    getComplaintMetrics,
    
    // Backward-compatible methods:
    getUsers,
    saveUsers,
    getComplaints,
    saveComplaints,
    makeId
};
