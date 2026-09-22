// =========================================================
// CAMPUSCARE - ADMIN DASHBOARD & SIDEBAR CONTROLLER (2026)
// =========================================================

const API_URL = "/api";
let adminToken = sessionStorage.getItem("adminToken") || localStorage.getItem("adminToken") || localStorage.getItem("campusToken");
let allComplaintsCache = [];
const complaintStore = (typeof CampusDSA !== "undefined" && CampusDSA.ComplaintStore)
    ? new CampusDSA.ComplaintStore()
    : null;
let currentFilterStatus = "all";
let currentSortOrder = "smart";
let currentViewMode = localStorage.getItem("adminViewMode") || "grid";
const skippedComplaintIds = new Set(JSON.parse(sessionStorage.getItem("adminSkippedComplaints") || "[]"));
let isViewingSkippedOnly = false;

// =========================================================
// DOM ELEMENTS
// =========================================================

const adminLogin = document.getElementById("adminLogin");
const adminDashboard = document.getElementById("adminDashboard");
const adminLoginForm = document.getElementById("adminLoginForm");
const adminEmail = document.getElementById("adminEmail");
const adminPassword = document.getElementById("adminPassword");
const adminLogout = document.getElementById("adminLogout");

// Sidebar & Layout
const adminSidebar = document.getElementById("adminSidebar");
const sidebarCollapseBtn = document.getElementById("sidebarCollapseBtn");
const mobileSidebarToggle = document.getElementById("mobileSidebarToggle");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const sidebarPendingBadge = document.getElementById("sidebarPendingBadge");
const manageAdminsNavGroup = document.getElementById("manageAdminsNavGroup");
const manageAdminsNav = document.getElementById("manageAdminsNav");
const sidebarSearchTrigger = document.getElementById("sidebarSearchTrigger");

// Topbar
const topbarCurrentView = document.getElementById("topbarCurrentView");
const topbarSearchInput = document.getElementById("topbarSearchInput");
const refreshDataBtn = document.getElementById("refreshDataBtn");
const refreshIcon = document.getElementById("refreshIcon");

// View Toggle & Filters
const viewTableBtn = document.getElementById("viewTableBtn");
const viewCardsBtn = document.getElementById("viewCardsBtn");
const adminComplaintTableWrap = document.getElementById("adminComplaintTableWrap");
const adminComplaintList = document.getElementById("adminComplaintList");
const adminSearch = document.getElementById("adminSearch");
const adminCategory = document.getElementById("adminCategory");
const adminSortOrder = document.getElementById("adminSortOrder");

// Resolution Modal
const resolutionModal = document.getElementById("resolutionModal");
const closeResolutionModal = document.getElementById("closeResolutionModal");
const cancelResolutionBtn = document.getElementById("cancelResolutionBtn");
const resolutionForm = document.getElementById("resolutionForm");
const modalComplaintId = document.getElementById("modalComplaintId");
const modalComplaintTitle = document.getElementById("modalComplaintTitle");
const modalReporter = document.getElementById("modalReporter");
const modalCategory = document.getElementById("modalCategory");
const modalLocation = document.getElementById("modalLocation");
const modalDate = document.getElementById("modalDate");
const modalDescription = document.getElementById("modalDescription");
const modalImageWrap = document.getElementById("modalImageWrap");
const modalImagePreview = document.getElementById("modalImagePreview");
const modalImageLink = document.getElementById("modalImageLink");
const modalStatusSelect = document.getElementById("modalStatusSelect");
const modalResolutionNotes = document.getElementById("modalResolutionNotes");

// Helper: Auth Headers
function getAuthHeaders() {
    const token = sessionStorage.getItem("adminToken") || localStorage.getItem("adminToken") || localStorage.getItem("campusToken") || adminToken;
    return {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    };
}

// Helper: Escape HTML
function escapeHTML(value) {
    if (!value) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getComplaintId(complaint) {
    if (!complaint) return "";
    return String(complaint._id || complaint.id || "").trim();
}

function getComplaintReporterName(complaint) {
    const reportedBy = complaint.reportedBy;
    if (!reportedBy) return "Student";
    if (typeof reportedBy === "object") return reportedBy.name || reportedBy.email || "Student";
    return String(reportedBy);
}

function getComplaintReporterEmail(complaint) {
    const reportedBy = complaint.reportedBy;
    if (!reportedBy) return "";
    if (typeof reportedBy === "object") return reportedBy.email || "";
    return "";
}

// =========================================================
// SIDEBAR COLLAPSE & MOBILE DRAWER HANDLER
// =========================================================

function initSidebarState() {
    const isCollapsed = localStorage.getItem("adminSidebarCollapsed") === "true";
    if (isCollapsed && window.innerWidth > 768) {
        adminSidebar?.classList.add("collapsed");
    }
}

sidebarCollapseBtn?.addEventListener("click", () => {
    adminSidebar?.classList.toggle("collapsed");
    const collapsed = adminSidebar?.classList.contains("collapsed");
    localStorage.setItem("adminSidebarCollapsed", collapsed ? "true" : "false");
});

document.querySelector(".brand-logo")?.addEventListener("click", () => {
    if (adminSidebar?.classList.contains("collapsed")) {
        adminSidebar?.classList.remove("collapsed");
        localStorage.setItem("adminSidebarCollapsed", "false");
    }
});

sidebarSearchTrigger?.addEventListener("click", () => {
    if (adminSidebar?.classList.contains("collapsed")) {
        adminSidebar?.classList.remove("collapsed");
        localStorage.setItem("adminSidebarCollapsed", "false");
    }
    if (window.location.hash !== "#allComplaints") {
        window.location.hash = "allComplaints";
    }
    setTimeout(() => {
        if (topbarSearchInput) {
            topbarSearchInput.focus();
            topbarSearchInput.select();
        } else if (adminSearch) {
            adminSearch.focus();
            adminSearch.select();
        }
    }, 60);
});

mobileSidebarToggle?.addEventListener("click", () => {
    adminSidebar?.classList.add("mobile-open");
    sidebarOverlay?.classList.add("active");
});

sidebarOverlay?.addEventListener("click", () => {
    adminSidebar?.classList.remove("mobile-open");
    sidebarOverlay?.classList.remove("active");
});

// Close mobile drawer on navigation click
document.querySelectorAll(".admin-nav a").forEach(link => {
    link.addEventListener("click", () => {
        if (window.innerWidth <= 768) {
            adminSidebar?.classList.remove("mobile-open");
            sidebarOverlay?.classList.remove("active");
        }
    });
});

// =========================================================
// AUTHENTICATION (LOGIN & LOGOUT)
// =========================================================

adminLoginForm?.addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = adminEmail.value.trim();
    const password = adminPassword.value.trim();

    try {
        const response = await fetch(`${API_URL}/users/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || "Invalid administrative credentials.");
            return;
        }

        if (data.user.role !== "admin" && data.user.role !== "super_admin") {
            alert("Access Denied: Only campus administrators can log into this console.");
            return;
        }

        adminToken = data.token;
        sessionStorage.setItem("adminToken", data.token);
        sessionStorage.setItem("adminRole", data.user.role);
        sessionStorage.setItem("adminName", data.user.name);
        sessionStorage.setItem("adminEmail", data.user.email);

        showAdminDashboard();
        showToast(`Welcome back, ${data.user.name}!`, "success");

    } catch (error) {
        console.error("Admin Login Error:", error);
        alert("Server connection failed. Ensure the backend server is running.");
    }
});

adminLogout?.addEventListener("click", function () {
    sessionStorage.removeItem("adminToken");
    sessionStorage.removeItem("adminRole");
    sessionStorage.removeItem("adminName");
    sessionStorage.removeItem("adminEmail");
    adminToken = null;

    adminDashboard.style.display = "none";
    adminLogin.style.display = "flex";
    adminLoginForm?.reset();
    showToast("Signed out successfully", "info");
});

// =========================================================
// DASHBOARD INITIALIZATION
// =========================================================

function showAdminDashboard() {
    if (adminLogin) adminLogin.style.display = "none";
    if (adminDashboard) adminDashboard.style.display = "flex";

    const role = sessionStorage.getItem("adminRole");
    const name = sessionStorage.getItem("adminName");

    // Profile UI
    const nameEl = document.getElementById("adminProfileName");
    const avatarEl = document.getElementById("adminAvatarText");
    const roleEl = document.getElementById("adminProfileRole");

    if (nameEl && name) nameEl.textContent = name;
    if (avatarEl && name) avatarEl.textContent = name.charAt(0).toUpperCase();
    if (roleEl) {
        roleEl.textContent = role === "super_admin" ? "Super Admin" : "Campus Admin";
    }

    // Role-Aware Navigation
    if (role === "super_admin") {
        if (manageAdminsNavGroup) manageAdminsNavGroup.style.display = "flex";
    } else {
        if (manageAdminsNavGroup) manageAdminsNavGroup.style.display = "none";
    }

    initSidebarState();
    setViewMode(currentViewMode);

    // Initial Hash Route
    if (!window.location.hash || window.location.hash === "#") {
        window.location.hash = "adminOverview";
    } else {
        handleRoute();
    }
}

// =========================================================
// DATA FETCHING & SYNCHRONIZATION
// =========================================================

async function getComplaints() {
    try {
        const response = await fetch(`${API_URL}/complaints?limit=100`, {
            headers: getAuthHeaders()
        });

        const data = await response.json();

        if (!response.ok) {
            console.error(data.message || "Failed to load complaints");
            if (response.status === 401) {
                sessionStorage.removeItem("adminToken");
                sessionStorage.removeItem("adminRole");
                sessionStorage.removeItem("adminName");
                sessionStorage.removeItem("adminEmail");
                adminToken = null;
                if (adminDashboard) adminDashboard.style.display = "none";
                if (adminLogin) adminLogin.style.display = "flex";
                showToast("Session expired. Please log in to view complaints.", "error");
            }
            return [];
        }

        allComplaintsCache = data.complaints || [];
        if (complaintStore) {
            complaintStore.load(allComplaintsCache);
        }
        return allComplaintsCache;

    } catch (error) {
        console.error("Admin complaints fetch error:", error);
        return [];
    }
}

async function loadAdminData() {
    if (refreshIcon) refreshIcon.style.animation = "spin 0.6s linear infinite";

    const complaints = await getComplaints();

    updateStatsAndBadges(complaints);
    showRecentComplaints(complaints);
    applyFiltersAndRender(complaints);

    if (refreshIcon) {
        setTimeout(() => {
            refreshIcon.style.animation = "";
        }, 500);
    }
}

refreshDataBtn?.addEventListener("click", () => {
    loadAdminData();
    showToast("Live data synced", "info");
});

// =========================================================
// STATS & BADGE COUNTERS (O(1) with Multi-Index Metrics)
// =========================================================

function updateStatsAndBadges(complaints) {
    let total = 0;
    let pending = 0;
    let progress = 0;
    let resolved = 0;

    if (complaintStore && (!complaints || complaints === allComplaintsCache || complaints === complaintStore.getAll())) {
        const metrics = complaintStore.getMetrics();
        total = metrics.total;
        pending = metrics.pending;
        progress = metrics.progress !== undefined ? metrics.progress : (metrics.inProgress || 0);
        resolved = metrics.resolved;
    } else {
        const list = complaints || [];
        total = list.length;
        pending = list.filter(c => c.status === "Pending").length;
        progress = list.filter(c => c.status === "In Progress").length;
        resolved = list.filter(c => c.status === "Resolved").length;
    }

    // Stat Cards
    const totalEl = document.getElementById("adminTotal");
    const pendingEl = document.getElementById("adminPending");
    const progressEl = document.getElementById("adminProgress");
    const resolvedEl = document.getElementById("adminResolved");

    if (totalEl) totalEl.textContent = total;
    if (pendingEl) pendingEl.textContent = pending;
    if (progressEl) progressEl.textContent = progress;
    if (resolvedEl) resolvedEl.textContent = resolved;

    // Sidebar Badge
    if (sidebarPendingBadge) {
        if (pending > 0) {
            sidebarPendingBadge.textContent = pending;
            sidebarPendingBadge.style.display = "inline-flex";
            sidebarPendingBadge.classList.add("pulse");
        } else {
            sidebarPendingBadge.style.display = "none";
            sidebarPendingBadge.classList.remove("pulse");
        }
    }

    // Status Tab Badges
    const countAll = document.getElementById("tabCountAll");
    const countPending = document.getElementById("tabCountPending");
    const countProgress = document.getElementById("tabCountProgress");
    const countResolved = document.getElementById("tabCountResolved");

    if (countAll) countAll.textContent = total;
    if (countPending) countPending.textContent = pending;
    if (countProgress) countProgress.textContent = progress;
    if (countResolved) countResolved.textContent = resolved;
}

// Clickable Overview KPI Cards: Click to Filter Complaints Queue
document.querySelectorAll("#adminOverview .kpi-card").forEach(card => {
    card.addEventListener("click", () => {
        const filterStatus = card.getAttribute("data-filter");
        if (!filterStatus) return;
        window.location.hash = "allComplaints";
        setTimeout(() => {
            setActiveStatusTab(filterStatus);
        }, 50);
    });
});

// =========================================================
// RECENT INFLOW COMPLAINTS (DASHBOARD WIDGET)
// =========================================================

function showRecentComplaints(complaints) {
    const container = document.getElementById("adminRecentComplaints");
    if (!container) return;

    if (complaints.length === 0) {
        container.innerHTML = `
            <div class="empty-state-wrap">
                <i data-lucide="inbox" class="empty-state-icon"></i>
                <h3>No Submissions Found</h3>
                <p>Campus facilities are operating smoothly with no recent reports.</p>
            </div>
        `;
        initIcons();
        return;
    }

    const recent = [...complaints].slice(0, 4);
    container.innerHTML = recent.map(complaint => createComplaintCardHtml(complaint)).join("");
    initIcons();
}

// =========================================================
// QUEUE RENDERING (TABLE & CARD GRID VIEWS)
// =========================================================

function setViewMode(mode) {
    currentViewMode = mode;
    localStorage.setItem("adminViewMode", mode);

    if (mode === "table") {
        viewTableBtn?.classList.add("active");
        viewCardsBtn?.classList.remove("active");
        if (adminComplaintTableWrap) adminComplaintTableWrap.style.display = "block";
        if (adminComplaintList) adminComplaintList.style.display = "none";
    } else {
        viewCardsBtn?.classList.add("active");
        viewTableBtn?.classList.remove("active");
        if (adminComplaintTableWrap) adminComplaintTableWrap.style.display = "none";
        if (adminComplaintList) adminComplaintList.style.display = "flex";
    }
}

viewTableBtn?.addEventListener("click", () => setViewMode("table"));
viewCardsBtn?.addEventListener("click", () => setViewMode("grid"));

function renderComplaintsQueue(complaints) {
    const tbody = document.getElementById("adminComplaintTableBody");
    const cardsGrid = document.getElementById("adminComplaintList");

    if (!tbody || !cardsGrid) return;

    if (!complaints || complaints.length === 0) {
        const search = (adminSearch?.value || topbarSearchInput?.value || "").trim();
        const category = adminCategory?.value || "all";
        
        const activeCriteria = [];
        if (currentFilterStatus && currentFilterStatus !== "all") {
            activeCriteria.push(`status "<strong>${escapeHTML(currentFilterStatus)}</strong>"`);
        }
        if (category && category !== "all") {
            activeCriteria.push(`category "<strong>${escapeHTML(category)}</strong>"`);
        }
        if (search) {
            activeCriteria.push(`search query "<strong>${escapeHTML(search)}</strong>"`);
        }

        let explanation = "Try clearing your search query or adjusting the filters.";
        if (activeCriteria.length > 0) {
            explanation = `No complaints found matching ${activeCriteria.join(" and ")}.`;
        }

        const totalAvailable = allComplaintsCache ? allComplaintsCache.length : 0;

        const emptyHtml = `
            <div class="empty-state-wrap">
                <i data-lucide="filter-x" class="empty-state-icon"></i>
                <h3>No Matching Complaints Found</h3>
                <p style="margin-top: 6px; font-size: 0.875rem; color: var(--admin-text-muted);">${explanation}</p>
                ${activeCriteria.length > 0 ? `
                    <div style="margin-top: 18px;">
                        <button type="button" class="btn-clear-filters" onclick="resetAllQueueFilters()">
                            <i data-lucide="rotate-ccw" style="width: 14px; height: 14px;"></i>
                            <span>Reset Filters (Show All ${totalAvailable} Complaints)</span>
                        </button>
                    </div>
                ` : ""}
            </div>
        `;
        tbody.innerHTML = `<tr><td colspan="7">${emptyHtml}</td></tr>`;
        cardsGrid.innerHTML = emptyHtml;
        initIcons();
        return;
    }

    // Sort complaints dynamically using PriorityQueueHelper for Table View
    const sorted = (typeof CampusDSA !== "undefined" && CampusDSA.PriorityQueueHelper)
        ? CampusDSA.PriorityQueueHelper.sortByPriority(complaints, currentSortOrder)
        : (typeof CampusDSA !== "undefined" && CampusDSA.SortAlgorithms)
            ? CampusDSA.SortAlgorithms.sortByDateDesc(complaints)
            : [...complaints].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    // Render Table Rows with Keyed DOM Reconciliation (zero flicker)
    if (typeof CampusDSA !== "undefined" && CampusDSA.KeyedDOMReconciler) {
        CampusDSA.KeyedDOMReconciler.reconcile(tbody, sorted, getComplaintId, createTableRowHtml, "tr");
    } else {
        tbody.innerHTML = sorted.map(complaint => createTableRowHtml(complaint)).join("");
    }

    // Render Cards View: Grouped into structured 2-in-a-row sections (Latest -> Reminders -> Progress -> Resolved Archive)
    renderGroupedCardsView(cardsGrid, complaints, currentSortOrder);

    initIcons();
}

// Grouped Cards View: Strict 2-in-a-row layout with dynamic priority sections
function renderGroupedCardsView(container, complaints, sortOrder = "smart") {
    if (!container) return;

    if (!complaints || complaints.length === 0) {
        container.innerHTML = `
            <div class="empty-state-wrap">
                <i data-lucide="inbox" class="empty-state-icon"></i>
                <h3>No Complaints In This Category</h3>
                <p>There are no complaints matching the selected filter.</p>
            </div>
        `;
        return;
    }

    // Partition complaints into the 4 lifecycle categories:
    const fresh = [];
    const reminder = [];
    const progress = [];
    const resolved = [];

    complaints.forEach(item => {
        const status = item.status || "Pending";
        const ageHours = (typeof CampusDSA !== "undefined" && CampusDSA.PriorityQueueHelper)
            ? CampusDSA.PriorityQueueHelper.getAgeHours(item.createdAt)
            : (Date.now() - new Date(item.createdAt).getTime()) / 3600000;

        if (status === "Pending") {
            if (ageHours < 24) {
                fresh.push(item);
            } else {
                reminder.push(item);
            }
        } else if (status === "In Progress") {
            progress.push(item);
        } else if (status === "Resolved") {
            resolved.push(item);
        } else {
            fresh.push(item);
        }
    });

    // Sub-sorting within each bucket:
    // Fresh: newest first
    fresh.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    // Reminder: oldest first (longest unattended complaint shown first)
    reminder.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    // In Progress: newest update first
    progress.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
    // Resolved: newest resolved first
    resolved.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));

    // Handle chronological modes:
    if (sortOrder === "newest" || sortOrder === "oldest") {
        const chronological = [...complaints].sort((a, b) => {
            const timeA = new Date(a.createdAt || 0).getTime();
            const timeB = new Date(b.createdAt || 0).getTime();
            return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
        });
        const label = sortOrder === "newest" ? "Chronological Inflow (Newest First)" : "Chronological Queue (Oldest / FIFO First)";
        container.innerHTML = `
            <div class="complaints-group-section">
                <div class="group-section-header header-fresh">
                    <div class="group-header-info">
                        <span class="group-icon-bubble bubble-fresh"><i data-lucide="clock"></i></span>
                        <div class="group-header-text">
                            <div class="group-title-row">
                                <h3 class="group-title">${label}</h3>
                                <span class="group-count-badge badge-fresh">${chronological.length} Complaints</span>
                            </div>
                            <p class="group-subtitle">Arranged 2 cards per row &bull; Pure timestamp sequence</p>
                        </div>
                    </div>
                </div>
                <div class="complaints-cards-subgrid">
                    ${chronological.map(item => createComplaintCardHtml(item)).join("")}
                </div>
            </div>
        `;
        return;
    }

    // Default flow: Latest Problems (<24h) -> Attention Reminders (>=24h) -> In Progress -> Resolved Archive
    let sectionDefs = [];
    if (sortOrder === "unattended") {
        sectionDefs = [
            { key: "reminder", title: "Needs Attention (Pending > 24 Hours)", subtitle: "Unresolved complaints waiting for admin action • Prioritized by wait time", icon: "bell-ring", bubbleClass: "bubble-reminder", headerClass: "header-reminder", badgeClass: "badge-reminder", items: reminder },
            { key: "fresh", title: "Fresh Complaints (Last 24 Hours)", subtitle: "Recently submitted student problems requiring initial triage • 2 cards per row", icon: "sparkles", bubbleClass: "bubble-fresh", headerClass: "header-fresh", badgeClass: "badge-fresh", items: fresh },
            { key: "progress", title: "Under Active Investigation (In Progress)", subtitle: "Assigned to departmental maintenance staff & currently in progress", icon: "wrench", bubbleClass: "bubble-progress", headerClass: "header-progress", badgeClass: "badge-progress", items: progress },
            { key: "resolved", title: "Successfully Resolved Archive", subtitle: "Completed complaints dynamically moved out of the active queue", icon: "check-circle-2", bubbleClass: "bubble-resolved", headerClass: "header-resolved", badgeClass: "badge-resolved", items: resolved }
        ];
    } else if (sortOrder === "resolved") {
        sectionDefs = [
            { key: "resolved", title: "Successfully Resolved Archive", subtitle: "Completed complaints dynamically moved out of the active queue", icon: "check-circle-2", bubbleClass: "bubble-resolved", headerClass: "header-resolved", badgeClass: "badge-resolved", items: resolved },
            { key: "fresh", title: "Fresh Complaints (Last 24 Hours)", subtitle: "Recently submitted student problems requiring initial triage • 2 cards per row", icon: "sparkles", bubbleClass: "bubble-fresh", headerClass: "header-fresh", badgeClass: "badge-fresh", items: fresh },
            { key: "reminder", title: "Needs Attention (Pending > 24 Hours)", subtitle: "Unresolved complaints waiting for admin action • Prioritized by wait time", icon: "bell-ring", bubbleClass: "bubble-reminder", headerClass: "header-reminder", badgeClass: "badge-reminder", items: reminder },
            { key: "progress", title: "Under Active Investigation (In Progress)", subtitle: "Assigned to departmental maintenance staff & currently in progress", icon: "wrench", bubbleClass: "bubble-progress", headerClass: "header-progress", badgeClass: "badge-progress", items: progress }
        ];
    } else {
        // "smart" and "latest":
        sectionDefs = [
            { key: "fresh", title: "Fresh Complaints (Last 24 Hours)", subtitle: "Recently submitted student problems requiring initial triage • 2 cards per row", icon: "sparkles", bubbleClass: "bubble-fresh", headerClass: "header-fresh", badgeClass: "badge-fresh", items: fresh },
            { key: "reminder", title: "Needs Attention (Pending > 24 Hours)", subtitle: "Unresolved complaints waiting for admin action • Prioritized by wait time", icon: "bell-ring", bubbleClass: "bubble-reminder", headerClass: "header-reminder", badgeClass: "badge-reminder", items: reminder },
            { key: "progress", title: "Under Active Investigation (In Progress)", subtitle: "Assigned to departmental maintenance staff & currently in progress", icon: "wrench", bubbleClass: "bubble-progress", headerClass: "header-progress", badgeClass: "badge-progress", items: progress },
            { key: "resolved", title: "Successfully Resolved Archive", subtitle: "Completed complaints dynamically moved out of the active queue", icon: "check-circle-2", bubbleClass: "bubble-resolved", headerClass: "header-resolved", badgeClass: "badge-resolved", items: resolved }
        ];
    }

    // Only render sections with items:
    const activeSections = sectionDefs.filter(sec => sec.items.length > 0);

    if (activeSections.length === 0) {
        container.innerHTML = `
            <div class="empty-state-wrap">
                <i data-lucide="inbox" class="empty-state-icon"></i>
                <h3>No Complaints In This Category</h3>
                <p>No complaints match the current filter selection.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = activeSections.map(sec => `
        <div class="complaints-group-section" data-group-type="${sec.key}">
            <div class="group-section-header ${sec.headerClass}">
                <div class="group-header-info">
                    <span class="group-icon-bubble ${sec.bubbleClass}"><i data-lucide="${sec.icon}"></i></span>
                    <div class="group-header-text">
                        <div class="group-title-row">
                            <h3 class="group-title">${sec.title}</h3>
                            <span class="group-count-badge ${sec.badgeClass}">
                                ${sec.items.length} ${sec.items.length === 1 ? 'Complaint' : 'Complaints'}
                            </span>
                        </div>
                        <p class="group-subtitle">${sec.subtitle}</p>
                    </div>
                </div>
            </div>
            <div class="complaints-cards-subgrid">
                ${sec.items.map(item => createComplaintCardHtml(item)).join("")}
            </div>
        </div>
    `).join("");
}

// User-friendly title formatter: Capitalizes first letter cleanly
function formatComplaintTitle(title) {
    if (!title) return "Untitled Complaint";
    const str = String(title).trim();
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// User-friendly category metadata (icon, readable label, color styling)
function getCategoryMeta(cat) {
    const clean = String(cat || "General").trim();
    switch (clean.toLowerCase()) {
        case "electricity":
            return { label: "Electricity", icon: "zap", cssClass: "cat-electricity" };
        case "water":
            return { label: "Water Supply", icon: "droplet", cssClass: "cat-water" };
        case "internet":
            return { label: "WiFi & Network", icon: "wifi", cssClass: "cat-internet" };
        case "food":
            return { label: "Food & Mess", icon: "utensils", cssClass: "cat-food" };
        case "hostel":
            return { label: "Hostel Maintenance", icon: "home", cssClass: "cat-hostel" };
        case "cleaning":
            return { label: "Cleaning & Sanitation", icon: "sparkles", cssClass: "cat-cleaning" };
        case "furniture":
            return { label: "Furniture & Assets", icon: "armchair", cssClass: "cat-furniture" };
        case "washroom":
            return { label: "Washroom Facilities", icon: "bath", cssClass: "cat-washroom" };
        default:
            return { label: clean, icon: "tag", cssClass: "cat-general" };
    }
}

// User-Friendly Table Row HTML Generator
function createTableRowHtml(complaint) {
    const id = getComplaintId(complaint);
    const reporterName = getComplaintReporterName(complaint);
    const reporterEmail = getComplaintReporterEmail(complaint);
    const avatar = (reporterName.charAt(0) || "S").toUpperCase();
    const dateFormatted = complaint.createdAt ? new Date(complaint.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "-";

    const ageHours = (typeof CampusDSA !== "undefined" && CampusDSA.PriorityQueueHelper)
        ? CampusDSA.PriorityQueueHelper.getAgeHours(complaint.createdAt)
        : (Date.now() - new Date(complaint.createdAt).getTime()) / 3600000;

    const relativeTime = (typeof CampusDSA !== "undefined" && CampusDSA.PriorityQueueHelper)
        ? CampusDSA.PriorityQueueHelper.formatRelativeTime(complaint.createdAt)
        : "Recent";

    const isOverdue = complaint.status === "Pending" && ageHours >= 24;
    const isFresh = complaint.status === "Pending" && ageHours < 24;

    let attentionBadgeHtml = "";
    if (isOverdue) {
        attentionBadgeHtml = `<span class="attention-reminder-pill"><i data-lucide="alert-triangle"></i> &gt;24h Overdue</span>`;
    } else if (isFresh) {
        attentionBadgeHtml = `<span class="fresh-pill"><i data-lucide="sparkles"></i> New (&lt;24h)</span>`;
    }

    let statusBadgeClass = "status-pending";
    if (complaint.status === "In Progress") statusBadgeClass = "status-progress";
    if (complaint.status === "Resolved") statusBadgeClass = "status-resolved";

    const hasImage = Boolean(complaint.image);
    const catMeta = getCategoryMeta(complaint.category);
    const formattedTitle = formatComplaintTitle(complaint.title);

    return `
        <tr data-id="${id}" class="${isOverdue ? 'row-overdue' : ''}">
            <td>
                <div class="table-complaint-cell">
                    <span class="table-complaint-title">
                        ${escapeHTML(formattedTitle)}
                        ${hasImage ? `<a href="${complaint.image}" target="_blank" title="View attached photo evidence"><i data-lucide="image" class="table-has-image"></i></a>` : ""}
                    </span>
                    <span class="table-complaint-desc">${escapeHTML(complaint.description || "No description")}</span>
                </div>
            </td>
            <td>
                <div class="table-reporter-cell">
                    <div class="table-avatar-pill">${avatar}</div>
                    <div class="table-reporter-meta">
                        <span class="table-reporter-name">${escapeHTML(reporterName)}</span>
                        ${reporterEmail ? `<span class="table-reporter-email">${escapeHTML(reporterEmail)}</span>` : ""}
                    </div>
                </div>
            </td>
            <td>
                <span class="category-pill ${catMeta.cssClass}">
                    <i data-lucide="${catMeta.icon}"></i>
                    <span>${escapeHTML(catMeta.label)}</span>
                </span>
            </td>
            <td>
                <span class="location-tag">
                    <i data-lucide="map-pin"></i>
                    ${escapeHTML(complaint.location || "Campus")}
                </span>
            </td>
            <td>
                <div class="table-age-cell">
                    <span class="table-age-relative">${relativeTime}</span>
                    <span class="table-age-exact">${dateFormatted}</span>
                </div>
            </td>
            <td>
                <div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-start;">
                    <span class="badge-status ${statusBadgeClass}">
                        <span class="badge-dot"></span>
                        <span>${escapeHTML(complaint.status || "Pending")}</span>
                    </span>
                    ${attentionBadgeHtml}
                </div>
            </td>
            <td style="text-align: right;">
                <div style="display: inline-flex; gap: 6px; align-items: center;">
                    ${isViewingSkippedOnly ? `
                        <button type="button" class="action-restore-btn" data-complaint-id="${id}" onclick="unskipComplaint('${id}', event)" title="Restore">
                            <i data-lucide="rotate-ccw"></i>
                        </button>
                    ` : `
                        <button type="button" class="action-skip-btn" data-complaint-id="${id}" onclick="skipComplaint('${id}', event)" title="Skip">
                            <i data-lucide="skip-forward"></i>
                        </button>
                    `}
                    <button type="button" class="action-triage-btn" data-complaint-id="${id}" onclick="openResolutionModal('${id}')">
                        <i data-lucide="sliders-horizontal"></i>
                        <span>Triage</span>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

// User-Friendly & Readable Card HTML Generator
function createComplaintCardHtml(complaint) {
    const id = getComplaintId(complaint);
    const reporterName = getComplaintReporterName(complaint);
    const reporterEmail = getComplaintReporterEmail(complaint);
    const avatar = (reporterName.charAt(0) || "S").toUpperCase();
    const dateFormatted = complaint.createdAt 
        ? new Date(complaint.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) 
        : "-";

    const ageHours = (typeof CampusDSA !== "undefined" && CampusDSA.PriorityQueueHelper)
        ? CampusDSA.PriorityQueueHelper.getAgeHours(complaint.createdAt)
        : (Date.now() - new Date(complaint.createdAt).getTime()) / 3600000;

    const relativeTime = (typeof CampusDSA !== "undefined" && CampusDSA.PriorityQueueHelper)
        ? CampusDSA.PriorityQueueHelper.formatRelativeTime(complaint.createdAt)
        : "Recent";

    const isOverdue = complaint.status === "Pending" && ageHours >= 24;
    const isFresh = complaint.status === "Pending" && ageHours < 24;

    let cardClass = "admin-complaint-card";
    if (isOverdue) cardClass += " card-overdue";
    else if (isFresh) cardClass += " card-fresh";
    else if (complaint.status === "In Progress") cardClass += " card-progress";
    else if (complaint.status === "Resolved") cardClass += " card-resolved";

    let statusBadgeClass = "status-pending";
    if (complaint.status === "In Progress") statusBadgeClass = "status-progress";
    if (complaint.status === "Resolved") statusBadgeClass = "status-resolved";

    let extraPillHtml = "";
    if (isOverdue) {
        extraPillHtml = `<span class="attention-reminder-pill"><i data-lucide="alert-triangle"></i> &gt;24h Overdue</span>`;
    } else if (isFresh) {
        extraPillHtml = `<span class="fresh-pill"><i data-lucide="sparkles"></i> New (&lt;24h)</span>`;
    } else if (complaint.status === "Resolved") {
        extraPillHtml = `<span class="badge-resolved" style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:12px;font-size:0.6875rem;font-weight:600;"><i data-lucide="check-check" style="width:12px;height:12px;"></i> Resolved</span>`;
    }

    const catMeta = getCategoryMeta(complaint.category);
    const formattedTitle = formatComplaintTitle(complaint.title);

    return `
        <div class="${cardClass}" data-id="${id}">
            <!-- Top Metadata Badges: Status + Category Pill + Age Badge -->
            <div class="card-header-badge-row">
                <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <span class="badge-status ${statusBadgeClass}">
                        <span class="badge-dot"></span>
                        <span>${escapeHTML(complaint.status || "Pending")}</span>
                    </span>
                    <span class="category-pill ${catMeta.cssClass}">
                        <i data-lucide="${catMeta.icon}"></i>
                        <span>${escapeHTML(catMeta.label)}</span>
                    </span>
                </div>
                ${extraPillHtml}
            </div>

            <!-- Overdue Attention Alert Banner -->
            ${isOverdue ? `
                <div class="card-reminder-alert">
                    <i data-lucide="bell-ring"></i>
                    <div>
                        <strong>Needs Attention:</strong> Waiting for review for over ${Math.floor(ageHours)} hours without response
                    </div>
                </div>
            ` : ""}

            <!-- Title & Location -->
            <div style="display: flex; flex-direction: column; gap: 4px;">
                <h3 class="card-title">${escapeHTML(formattedTitle)}</h3>
                <div class="card-location-badge">
                    <i data-lucide="map-pin"></i>
                    <span>${escapeHTML(complaint.location || "Campus")}</span>
                </div>
            </div>

            <!-- Description in readable box -->
            <div class="card-description-box">
                <p class="card-desc">${escapeHTML(complaint.description || "No description provided.")}</p>
            </div>

            <!-- Photo Evidence Preview (if attached) -->
            ${complaint.image ? `
                <div class="card-image-container">
                    <a href="${complaint.image}" target="_blank" class="card-image-link" title="Click to view full photo evidence">
                        <img src="${complaint.image}" alt="Evidence" class="card-image-thumb" loading="lazy">
                        <span class="image-view-overlay"><i data-lucide="maximize-2"></i> View Full Photo</span>
                    </a>
                </div>
            ` : ""}

            <!-- Resolution Summary Box (if resolved) -->
            ${(complaint.status === "Resolved" && (complaint.resolutionMessage || complaint.resolvedBy)) ? `
                <div class="card-resolution-box">
                    <div class="resolution-box-header">
                        <i data-lucide="check-circle-2"></i>
                        <span>Resolution Summary</span>
                    </div>
                    <p class="resolution-box-message">${escapeHTML(complaint.resolutionMessage || "Resolved by administrator")}</p>
                    ${complaint.resolvedBy ? `<span class="resolution-by-tag">Resolved by ${escapeHTML(complaint.resolvedBy)}</span>` : ""}
                </div>
            ` : ""}

            <!-- Student Reporter Info Strip -->
            <div class="card-reporter-strip">
                <div class="reporter-avatar-wrap">
                    <div class="reporter-avatar">${avatar}</div>
                    <div class="reporter-info">
                        <span class="reporter-name">${escapeHTML(reporterName)}</span>
                        <span class="reporter-subtext">${reporterEmail ? escapeHTML(reporterEmail) : 'Student'}</span>
                    </div>
                </div>
                <div class="card-submitted-time" title="Submitted on ${dateFormatted}">
                    <i data-lucide="clock"></i>
                    <span>${relativeTime}</span>
                </div>
            </div>

            <!-- Action Buttons Footer -->
            <div class="card-footer-actions">
                <span style="font-size:0.75rem; color:#94a3b8; font-family:var(--font-mono);">ID: #${id.slice(-6).toUpperCase()}</span>
                <div class="card-btn-cluster">
                    ${isViewingSkippedOnly ? `
                        <button type="button" class="action-restore-btn" data-complaint-id="${id}" onclick="unskipComplaint('${id}', event)" title="Restore this complaint to active queue">
                            <i data-lucide="rotate-ccw"></i>
                            <span>Restore</span>
                        </button>
                    ` : `
                        <button type="button" class="action-skip-btn" data-complaint-id="${id}" onclick="skipComplaint('${id}', event)" title="Skip this card for now">
                            <i data-lucide="skip-forward"></i>
                            <span>Skip</span>
                        </button>
                    `}
                    <button type="button" class="action-triage-btn" data-complaint-id="${id}" onclick="openResolutionModal('${id}')">
                        <i data-lucide="sliders-horizontal"></i>
                        <span>Triage &amp; Resolve</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// =========================================================
// ADVANCED FILTERING (Trie + Inverted Index + Fuzzy Search)
// =========================================================

function applyFiltersAndRender(complaints = allComplaintsCache) {
    const search = (adminSearch?.value || topbarSearchInput?.value || "").trim();
    const category = adminCategory?.value || "all";

    let filtered;
    if (complaintStore && (complaints === allComplaintsCache || !complaints)) {
        // Optimal DSA Multi-Indexed & Fuzzy Levenshtein Search (sub-millisecond)
        filtered = complaintStore.query({
            status: currentFilterStatus,
            category: category,
            query: search,
            fuzzy: true
        });
    } else {
        const queryLower = search.toLowerCase();
        filtered = (complaints || []).filter(complaint => {
            const reporterName = getComplaintReporterName(complaint).toLowerCase();
            const reporterEmail = getComplaintReporterEmail(complaint).toLowerCase();
            const title = (complaint.title || "").toLowerCase();
            const description = (complaint.description || "").toLowerCase();
            const location = (complaint.location || "").toLowerCase();

            const matchesSearch =
                !queryLower ||
                title.includes(queryLower) ||
                description.includes(queryLower) ||
                reporterName.includes(queryLower) ||
                reporterEmail.includes(queryLower) ||
                location.includes(queryLower);

            const matchesStatus = currentFilterStatus === "all" || complaint.status === currentFilterStatus;
            const matchesCategory = category === "all" || complaint.category === category;

            return matchesSearch && matchesStatus && matchesCategory;
        });
    }

    // Filter skipped cards based on isViewingSkippedOnly mode
    if (isViewingSkippedOnly) {
        filtered = filtered.filter(c => skippedComplaintIds.has(String(getComplaintId(c)).trim()));
    } else {
        filtered = filtered.filter(c => !skippedComplaintIds.has(String(getComplaintId(c)).trim()));
    }

    if (typeof syncCategoryChips === "function") {
        syncCategoryChips(category);
    }
    updateSkippedNoticeBar();
    renderActiveFilterBar();
    renderComplaintsQueue(filtered);
}

function updateSkippedNoticeBar() {
    const bar = document.getElementById("skippedComplaintsBar");
    const countLabel = document.getElementById("skippedCountLabel");
    const toggleBtn = document.getElementById("toggleViewSkippedBtn");

    if (!bar) return;

    if (skippedComplaintIds.size > 0) {
        bar.style.display = "flex";
        if (countLabel) countLabel.textContent = skippedComplaintIds.size;
        if (toggleBtn) {
            toggleBtn.innerHTML = `
                <i data-lucide="${isViewingSkippedOnly ? 'arrow-left' : 'eye'}"></i>
                <span id="toggleSkippedText">${isViewingSkippedOnly ? 'Back to Active Queue' : 'View Skipped'}</span>
            `;
            initIcons();
        }
    } else {
        bar.style.display = "none";
        isViewingSkippedOnly = false;
    }
}

window.skipComplaint = function (id, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    if (!id) return;
    const targetId = String(id).trim();
    skippedComplaintIds.add(targetId);
    sessionStorage.setItem("adminSkippedComplaints", JSON.stringify([...skippedComplaintIds]));

    const card = document.querySelector(`.admin-complaint-card[data-id="${targetId}"]`);
    if (card) {
        card.style.transition = "all 0.22s ease-out";
        card.style.opacity = "0";
        card.style.transform = "scale(0.95)";
    }

    setTimeout(() => {
        applyFiltersAndRender();
        showToast("Complaint card skipped from view", "info");
    }, 200);
};

window.unskipComplaint = function (id, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    if (!id) return;
    const targetId = String(id).trim();
    skippedComplaintIds.delete(targetId);
    sessionStorage.setItem("adminSkippedComplaints", JSON.stringify([...skippedComplaintIds]));
    applyFiltersAndRender();
    showToast("Complaint restored to active queue", "success");
};

function restoreAllSkippedComplaints() {
    if (skippedComplaintIds.size === 0) {
        showToast("No complaints are currently skipped", "info");
        return;
    }
    const count = skippedComplaintIds.size;
    skippedComplaintIds.clear();
    sessionStorage.removeItem("adminSkippedComplaints");
    isViewingSkippedOnly = false;
    applyFiltersAndRender();
    showToast(`All ${count} skipped complaint${count > 1 ? 's' : ''} restored to active queue`, "success");
    initIcons();
}

function toggleViewSkippedComplaints() {
    isViewingSkippedOnly = !isViewingSkippedOnly;

    if (isViewingSkippedOnly) {
        // If current category filter has no skipped complaints, reset category so user sees all skipped items
        const currentCat = adminCategory?.value || "all";
        if (currentCat !== "all") {
            const hasSkippedInCurrentCat = (allComplaintsCache || []).some(
                c => skippedComplaintIds.has(String(getComplaintId(c)).trim()) && c.category === currentCat
            );
            if (!hasSkippedInCurrentCat) {
                if (adminCategory) adminCategory.value = "all";
                syncCategoryChips("all");
            }
        }
        showToast("Viewing skipped complaints", "info");
    } else {
        showToast("Returned to active queue", "info");
    }

    applyFiltersAndRender();
    initIcons();
}

window.restoreAllSkippedComplaints = restoreAllSkippedComplaints;
window.toggleViewSkippedComplaints = toggleViewSkippedComplaints;

function renderActiveFilterBar() {
    const bar = document.getElementById("activeFilterBar");
    if (!bar) return;

    const search = (adminSearch?.value || topbarSearchInput?.value || "").trim();
    const category = adminCategory?.value || "all";
    const status = currentFilterStatus || "all";

    const pills = [];

    if (status !== "all") {
        pills.push(`
            <span class="filter-pill">
                Status: <b>${escapeHTML(status)}</b>
                <button type="button" class="clear-pill-btn" data-clear="status" onclick="setActiveStatusTab('all')" title="Clear status filter">&times;</button>
            </span>
        `);
    }

    if (category !== "all") {
        pills.push(`
            <span class="filter-pill">
                Category: <b>${escapeHTML(category)}</b>
                <button type="button" class="clear-pill-btn" data-clear="category" onclick="clearCategoryFilter()" title="Clear category filter">&times;</button>
            </span>
        `);
    }

    if (search) {
        pills.push(`
            <span class="filter-pill">
                Search: "<b>${escapeHTML(search)}</b>"
                <button type="button" class="clear-pill-btn" data-clear="search" onclick="clearSearchFilter()" title="Clear search query">&times;</button>
            </span>
        `);
    }

    if (pills.length > 0) {
        bar.style.display = "flex";
        bar.innerHTML = `
            <span class="active-filter-label">Active Filters:</span>
            ${pills.join("")}
            <button type="button" class="clear-all-link" id="clearAllFiltersBtn" data-clear="all" onclick="resetAllQueueFilters()">Clear all</button>
        `;
    } else {
        bar.style.display = "none";
        bar.innerHTML = "";
    }
}

function syncCategoryChips(category) {
    const targetCat = (category || "all").toLowerCase();
    document.querySelectorAll(".category-chip").forEach(chip => {
        const chipCat = (chip.getAttribute("data-category") || "").toLowerCase();
        if (chipCat === targetCat) {
            chip.classList.add("active");
        } else {
            chip.classList.remove("active");
        }
    });
}

function clearCategoryFilter() {
    if (adminCategory) adminCategory.value = "all";
    syncCategoryChips("all");
    applyFiltersAndRender();
}

function clearSearchFilter() {
    if (adminSearch) adminSearch.value = "";
    if (topbarSearchInput) topbarSearchInput.value = "";
    applyFiltersAndRender();
}

function resetAllQueueFilters() {
    if (adminSearch) adminSearch.value = "";
    if (topbarSearchInput) topbarSearchInput.value = "";
    if (adminCategory) adminCategory.value = "all";
    if (adminSortOrder) adminSortOrder.value = "smart";
    currentSortOrder = "smart";
    currentFilterStatus = "all";
    syncCategoryChips("all");
    
    document.querySelectorAll(".status-tab").forEach(t => {
        if (t.getAttribute("data-status") === "all") {
            t.classList.add("active");
        } else {
            t.classList.remove("active");
        }
    });

    applyFiltersAndRender();
    showToast("All filters cleared", "info");
}

window.clearCategoryFilter = clearCategoryFilter;
window.clearSearchFilter = clearSearchFilter;
window.resetAllQueueFilters = resetAllQueueFilters;
window.syncCategoryChips = syncCategoryChips;

// Direct Event Listeners for Filter Bar Delegation
document.getElementById("activeFilterBar")?.addEventListener("click", (e) => {
    const clearBtn = e.target.closest("[data-clear]");
    if (!clearBtn) return;
    e.preventDefault();
    e.stopPropagation();

    const action = clearBtn.getAttribute("data-clear");
    if (action === "all") {
        resetAllQueueFilters();
    } else if (action === "category") {
        clearCategoryFilter();
    } else if (action === "search") {
        clearSearchFilter();
    } else if (action === "status") {
        setActiveStatusTab("all");
    }
});

// Direct Event Listeners for Skipped Bar
document.getElementById("toggleViewSkippedBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    toggleViewSkippedComplaints();
});

document.getElementById("restoreAllSkippedBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    restoreAllSkippedComplaints();
});

// Quick Category Filter Chips Handlers
document.querySelectorAll(".category-chip").forEach(chip => {
    chip.addEventListener("click", () => {
        const cat = chip.getAttribute("data-category") || "all";
        if (adminCategory) {
            adminCategory.value = cat;
        }
        syncCategoryChips(cat);
        applyFiltersAndRender();
    });
});

// Status Tabs Click Handlers
document.querySelectorAll(".status-tab").forEach(tab => {
    tab.addEventListener("click", () => {
        const status = tab.getAttribute("data-status");
        setActiveStatusTab(status);
    });
});

function setActiveStatusTab(status) {
    currentFilterStatus = status;
    document.querySelectorAll(".status-tab").forEach(t => {
        if (t.getAttribute("data-status") === status) {
            t.classList.add("active");
        } else {
            t.classList.remove("active");
        }
    });
    applyFiltersAndRender();
}

// Search & Select Listeners with Algorithmic Debounce (prevents redundant render frames)
const debouncedApplyFilters = (typeof CampusDSA !== "undefined" && CampusDSA.debounce)
    ? CampusDSA.debounce(() => applyFiltersAndRender(), 80)
    : () => applyFiltersAndRender();

adminSearch?.addEventListener("input", () => {
    if (topbarSearchInput && topbarSearchInput.value !== adminSearch.value) {
        topbarSearchInput.value = adminSearch.value;
    }
    debouncedApplyFilters();
});

topbarSearchInput?.addEventListener("input", () => {
    if (adminSearch && adminSearch.value !== topbarSearchInput.value) {
        adminSearch.value = topbarSearchInput.value;
    }
    if (window.location.hash !== "#allComplaints") {
        window.location.hash = "allComplaints";
    }
    debouncedApplyFilters();
});

adminCategory?.addEventListener("change", () => applyFiltersAndRender());
adminSortOrder?.addEventListener("change", () => {
    currentSortOrder = adminSortOrder.value;
    applyFiltersAndRender();
});

// Global Keyboard Shortcuts (Ctrl+K for Search, Ctrl+B for Sidebar Toggle)
window.addEventListener("keydown", (e) => {
    // Ctrl+K / Cmd+K: Search shortcut
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (topbarSearchInput) {
            topbarSearchInput.focus();
            topbarSearchInput.select();
        }
    }
    // Ctrl+B / Cmd+B: Sidebar toggle shortcut
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        if (sidebarCollapseBtn) {
            sidebarCollapseBtn.click();
        }
    }
    // Ctrl+1 / Cmd+1: Jump to Dashboard Overview
    if ((e.ctrlKey || e.metaKey) && e.key === "1") {
        e.preventDefault();
        window.location.hash = "adminOverview";
    }
    // Ctrl+2 / Cmd+2: Jump to Complaints Queue
    if ((e.ctrlKey || e.metaKey) && e.key === "2") {
        e.preventDefault();
        window.location.hash = "allComplaints";
    }
});

// =========================================================
// RESOLUTION & TRIAGE MODAL
// =========================================================

window.openResolutionModal = async function (complaintId) {
    if (!complaintId) {
        console.error("openResolutionModal called with empty ID");
        return;
    }

    const targetId = String(complaintId).trim();
    let complaint = complaintStore ? complaintStore.getById(targetId) : allComplaintsCache.find(c => String(getComplaintId(c)).trim() === targetId);

    // Fallback: If not present in memory cache (e.g. filtered view), fetch from backend
    if (!complaint) {
        try {
            const res = await fetch(`${API_URL}/complaints/${targetId}`, {
                headers: getAuthHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                complaint = data.complaint;
            }
        } catch (fetchErr) {
            console.error("Failed to fetch complaint detail:", fetchErr);
        }
    }

    if (!complaint) {
        showToast("Complaint not found or could not be loaded", "error");
        return;
    }

    if (modalComplaintId) modalComplaintId.value = targetId;
    if (modalComplaintTitle) modalComplaintTitle.textContent = complaint.title || "Complaint";
    if (modalReporter) modalReporter.textContent = getComplaintReporterName(complaint);
    if (modalCategory) modalCategory.textContent = complaint.category || "General";
    if (modalLocation) modalLocation.textContent = complaint.location || "Campus";
    if (modalDate) modalDate.textContent = complaint.createdAt ? new Date(complaint.createdAt).toLocaleString() : "-";
    if (modalDescription) modalDescription.textContent = complaint.description || "No description provided.";

    // Evidence Photo
    if (modalImageWrap) {
        if (complaint.image) {
            modalImageWrap.style.display = "block";
            if (modalImagePreview) modalImagePreview.src = complaint.image;
            if (modalImageLink) modalImageLink.href = complaint.image;
        } else {
            modalImageWrap.style.display = "none";
        }
    }

    // Status & Remarks
    if (modalStatusSelect) modalStatusSelect.value = complaint.status || "Pending";
    if (modalResolutionNotes) modalResolutionNotes.value = complaint.resolutionMessage || "";

    if (resolutionModal) {
        resolutionModal.classList.remove("hidden");
        resolutionModal.style.display = "flex";
        resolutionModal.style.opacity = "1";
        resolutionModal.style.pointerEvents = "auto";
    }
    initIcons();
};

function hideResolutionModal() {
    if (resolutionModal) {
        resolutionModal.classList.add("hidden");
        resolutionModal.style.display = "none";
    }
}

closeResolutionModal?.addEventListener("click", hideResolutionModal);
cancelResolutionBtn?.addEventListener("click", hideResolutionModal);

const modalSkipBtn = document.getElementById("modalSkipBtn");
modalSkipBtn?.addEventListener("click", () => {
    const currentId = modalComplaintId?.value;
    if (!currentId) {
        hideResolutionModal();
        return;
    }

    const targetId = String(currentId).trim();
    skippedComplaintIds.add(targetId);
    sessionStorage.setItem("adminSkippedComplaints", JSON.stringify([...skippedComplaintIds]));

    // Find next available unskipped complaint
    const remainingComplaints = (allComplaintsCache || []).filter(c => {
        const id = String(getComplaintId(c)).trim();
        return !skippedComplaintIds.has(id) && (currentFilterStatus === "all" || c.status === currentFilterStatus);
    });

    applyFiltersAndRender();

    if (remainingComplaints.length > 0) {
        const nextComplaint = remainingComplaints[0];
        window.openResolutionModal(getComplaintId(nextComplaint));
        showToast("Skipped to next complaint", "info");
    } else {
        hideResolutionModal();
        showToast("Queue complete! All active complaints triaged.", "success");
    }
});

resolutionModal?.addEventListener("click", (e) => {
    if (e.target === resolutionModal) hideResolutionModal();
});

// ESC key to close modal
window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && resolutionModal && !resolutionModal.classList.contains("hidden")) {
        hideResolutionModal();
    }
});

// Delegated click handler for any triage button
document.addEventListener("click", function (e) {
    const btn = e.target.closest(".action-triage-btn");
    if (btn) {
        const id = btn.getAttribute("data-complaint-id") || btn.dataset?.complaintId;
        if (id) {
            e.preventDefault();
            e.stopPropagation();
            window.openResolutionModal(id);
        }
    }
});

resolutionForm?.addEventListener("submit", async function (e) {
    e.preventDefault();

    const id = modalComplaintId.value;
    const newStatus = modalStatusSelect.value;
    const notes = modalResolutionNotes.value.trim() || `Status updated to ${newStatus} by admin`;

    const saveBtn = document.getElementById("saveResolutionBtn");
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> <span>Saving...</span>';
        initIcons();
    }

    try {
        const response = await fetch(`${API_URL}/complaints/${id}`, {
            method: "PUT",
            headers: getAuthHeaders(),
            body: JSON.stringify({
                status: newStatus,
                resolutionMessage: notes
            })
        });

        const data = await response.json();

        if (!response.ok) {
            showToast(data.message || "Failed to update complaint status", "error");
            return;
        }

        // Fast in-memory update in complaintStore
        if (complaintStore) {
            complaintStore.updateStatus(id, newStatus, {
                resolutionMessage: notes,
                resolvedBy: sessionStorage.getItem("adminName") || "Admin"
            });
            allComplaintsCache = complaintStore.getAll();
        }

        showToast("Complaint lifecycle updated successfully!", "success");
        hideResolutionModal();
        await loadAdminData();

    } catch (error) {
        console.error("Resolution update error:", error);
        showToast("Server error occurred while saving complaint update.", "error");
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i data-lucide="check"></i> <span>Save &amp; Notify Student</span>';
            initIcons();
        }
    }
});

// =========================================================
// ROUTER (HASH-BASED NAVIGATION)
// =========================================================

function handleRoute() {
    if (!adminToken) return;

    let hash = window.location.hash.substring(1);
    if (!hash) {
        hash = "adminOverview";
        window.location.hash = hash;
        return;
    }

    // Active Sidebar Nav
    document.querySelectorAll(".admin-nav .nav-item").forEach(item => {
        if (item.getAttribute("data-section") === hash) {
            item.classList.add("active");
        } else {
            item.classList.remove("active");
        }
    });

    // Toggle Page Sections
    document.querySelectorAll(".admin-page-section").forEach(sec => {
        sec.style.display = "none";
    });

    const activeSection = document.getElementById(hash);
    if (activeSection) activeSection.style.display = "flex";

    // Update Topbar Breadcrumb
    const breadcrumbTitles = {
        adminOverview: "Dashboard Overview",
        allComplaints: "Complaint Management Queue",
        manageAdmins: "Staff Access Control"
    };

    if (topbarCurrentView) {
        topbarCurrentView.textContent = breadcrumbTitles[hash] || "Dashboard";
    }

    // Dynamic data flow per view
    if (hash === "adminOverview") {
        loadAdminData();
    } else if (hash === "allComplaints") {
        loadAdminData();
    } else if (hash === "manageAdmins") {
        loadAdminsList();
    }

    initIcons();
}

window.addEventListener("hashchange", handleRoute);

// Direct click handling for sidebar nav items (ensures clicking active section refreshes and clears queue filters)
document.querySelectorAll(".admin-nav .nav-item").forEach(item => {
    item.addEventListener("click", () => {
        const targetSection = item.getAttribute("data-section");
        if (targetSection === "allComplaints") {
            resetAllQueueFilters();
        }
        if (window.location.hash === `#${targetSection}`) {
            handleRoute();
        }
    });
});

// =========================================================
// SUPER ADMIN MANAGEMENT (STAFF DIRECTORY & ACCESS CONTROL)
// =========================================================

let allAdminsCache = [];

async function loadAdminsList() {
    const tableBody = document.getElementById("adminsListTableBody");
    if (!tableBody) return;

    tableBody.innerHTML = `
        <tr>
            <td colspan="6" style="padding: 40px 20px; text-align: center; color: var(--admin-text-muted);">
                <i data-lucide="loader" style="width: 22px; height: 22px; animation: spin 0.8s linear infinite; display: inline-block; vertical-align: middle; margin-right: 8px;"></i>
                <span>Synchronizing administrative staff directory...</span>
            </td>
        </tr>
    `;
    initIcons();

    try {
        const response = await fetch(`${API_URL}/users/admin`, {
            headers: getAuthHeaders()
        });

        const admins = await response.json();

        if (!response.ok) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="padding: 24px; text-align: center; color: #dc2626;">
                        Failed to synchronize staff directory. ${escapeHTML(admins.message || "")}
                    </td>
                </tr>
            `;
            return;
        }

        allAdminsCache = Array.isArray(admins) ? admins : [];
        updateAdminKpis(allAdminsCache);
        filterAndRenderAdmins();

    } catch (error) {
        console.error("Admins list fetch error:", error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="padding: 24px; text-align: center; color: #dc2626;">
                    Network connection error while synchronizing administrators directory.
                </td>
            </tr>
        `;
    }
}

function updateAdminKpis(admins) {
    const total = admins.length;
    const supers = admins.filter(a => a.role === "super_admin").length;
    const campus = admins.filter(a => a.role !== "super_admin").length;

    const totalEl = document.getElementById("kpiTotalAdmins");
    const superEl = document.getElementById("kpiSuperAdmins");
    const campusEl = document.getElementById("kpiCampusAdmins");

    if (totalEl) totalEl.textContent = total;
    if (superEl) superEl.textContent = supers;
    if (campusEl) campusEl.textContent = campus;
}

function filterAndRenderAdmins() {
    const searchVal = (document.getElementById("adminStaffSearch")?.value || "").toLowerCase().trim();
    const roleVal = document.getElementById("adminRoleFilter")?.value || "all";

    const filtered = allAdminsCache.filter(user => {
        const matchesRole = roleVal === "all" || user.role === roleVal;
        if (!matchesRole) return false;

        if (!searchVal) return true;
        const name = (user.name || "").toLowerCase();
        const email = (user.email || "").toLowerCase();
        const dept = (user.department || "").toLowerCase();
        return name.includes(searchVal) || email.includes(searchVal) || dept.includes(searchVal);
    });

    renderAdminsDirectory(filtered);
}

function renderAdminsDirectory(admins) {
    const tableBody = document.getElementById("adminsListTableBody");
    if (!tableBody) return;

    if (!Array.isArray(admins) || admins.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="padding: 44px 20px; text-align: center;">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                        <i data-lucide="shield-alert" style="width: 32px; height: 32px; color: var(--admin-text-light);"></i>
                        <h4 style="font-size: 0.9375rem; color: var(--admin-text-main); font-weight: 600;">No Staff Members Found</h4>
                        <p style="font-size: 0.8125rem; color: var(--admin-text-muted); max-width: 380px;">No administrators match the selected filter criteria. Try adjusting your query or provision a new administrator.</p>
                    </div>
                </td>
            </tr>
        `;
        initIcons();
        return;
    }

    const currentEmail = (sessionStorage.getItem("adminEmail") || "").toLowerCase();

    tableBody.innerHTML = admins.map(user => {
        const userId = user._id || user.id;
        const userName = escapeHTML(user.name || "Administrator");
        const userEmail = escapeHTML(user.email || "");
        const userDept = escapeHTML(user.department || "General Admin");
        const userRole = user.role || "admin";
        const isSelf = currentEmail && userEmail.toLowerCase() === currentEmail;

        const initials = userName
            .split(" ")
            .map(n => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase() || "A";

        const dateCreated = user.createdAt
            ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            : "Active";

        const roleBadge = userRole === "super_admin"
            ? `<span class="role-badge-super"><i data-lucide="shield-check" style="width:12px;height:12px;"></i> Super Admin</span>`
            : `<span class="role-badge-admin"><i data-lucide="shield" style="width:12px;height:12px;"></i> Campus Admin</span>`;

        const actionHtml = isSelf
            ? `<span style="font-size: 0.75rem; color: var(--admin-text-light); font-weight: 500; font-style: italic; display: inline-flex; align-items: center; gap: 4px;"><i data-lucide="user-check" style="width:13px;height:13px;"></i> Current Session</span>`
            : `<button type="button" class="btn-revoke-danger" onclick="openRevokeAdminModal('${userId}')">
                 <i data-lucide="user-x" style="width: 13px; height: 13px;"></i>
                 <span>Revoke</span>
               </button>`;

        return `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div class="table-avatar-pill" style="display: flex; align-items: center; justify-content: center; background: #e0e7ff; color: #3730a3; font-weight: 700; font-size: 0.75rem;">
                            ${initials}
                        </div>
                        <div style="display: flex; flex-direction: column;">
                            <strong style="color: var(--admin-text-main); font-weight: 600;">${userName}</strong>
                            <span style="font-size: 0.75rem; color: var(--admin-text-muted); font-family: var(--font-mono);">${userEmail}</span>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="dept-tag">
                        <i data-lucide="building" style="width: 12px; height: 12px; color: var(--admin-text-light);"></i>
                        <span>${userDept}</span>
                    </span>
                </td>
                <td>${roleBadge}</td>
                <td style="color: var(--admin-text-muted); font-size: 0.8125rem;">${dateCreated}</td>
                <td>
                    <span class="status-pill-active">
                        <span class="status-dot-active"></span>
                        <span>Active</span>
                    </span>
                </td>
                <td style="text-align: right;">${actionHtml}</td>
            </tr>
        `;
    }).join("");

    initIcons();
}

// -------------------------------------------------------------
// Provision Administrator Modal & Form Handlers
// -------------------------------------------------------------
const addAdminModal = document.getElementById("addAdminModal");
const openAddAdminModalBtn = document.getElementById("openAddAdminModalBtn");
const closeAddAdminModal = document.getElementById("closeAddAdminModal");
const cancelAddAdminBtn = document.getElementById("cancelAddAdminBtn");
const createAdminForm = document.getElementById("createAdminForm");
const toggleAdminPasswordBtn = document.getElementById("toggleAdminPasswordBtn");
const generateAdminPasswordBtn = document.getElementById("generateAdminPasswordBtn");

function openAddAdmin() {
    if (addAdminModal) {
        addAdminModal.classList.remove("hidden");
        document.getElementById("newAdminName")?.focus();
        initIcons();
    }
}

function closeAddAdmin() {
    if (addAdminModal) {
        addAdminModal.classList.add("hidden");
    }
}

if (openAddAdminModalBtn) openAddAdminModalBtn.addEventListener("click", openAddAdmin);
if (closeAddAdminModal) closeAddAdminModal.addEventListener("click", closeAddAdmin);
if (cancelAddAdminBtn) cancelAddAdminBtn.addEventListener("click", closeAddAdmin);
if (addAdminModal) {
    addAdminModal.addEventListener("click", (e) => {
        if (e.target === addAdminModal) closeAddAdmin();
    });
}

// Password Generator
if (generateAdminPasswordBtn) {
    generateAdminPasswordBtn.addEventListener("click", () => {
        const chars = "abcdefghijkmnpqrstuvwxyz23456789ABCDEFGHJKLMNPQRSTUVWXYZ@#$!";
        let pass = "";
        for (let i = 0; i < 12; i++) {
            pass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const passInput = document.getElementById("newAdminPassword");
        if (passInput) {
            passInput.value = pass;
            passInput.type = "text";
        }
        showToast("Generated strong temporary password", "info");
    });
}

// Password Visibility Toggle
if (toggleAdminPasswordBtn) {
    toggleAdminPasswordBtn.addEventListener("click", () => {
        const passInput = document.getElementById("newAdminPassword");
        if (!passInput) return;
        const isPassword = passInput.type === "password";
        passInput.type = isPassword ? "text" : "password";
        toggleAdminPasswordBtn.innerHTML = isPassword 
            ? `<i data-lucide="eye-off" style="width: 16px; height: 16px;"></i>` 
            : `<i data-lucide="eye" style="width: 16px; height: 16px;"></i>`;
        initIcons();
    });
}

// Provision Form Submit
if (createAdminForm) {
    createAdminForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const name = document.getElementById("newAdminName")?.value.trim();
        const email = document.getElementById("newAdminEmail")?.value.trim();
        const role = document.getElementById("newAdminRole")?.value || "admin";
        const department = document.getElementById("newAdminDept")?.value || "General Admin";
        const password = document.getElementById("newAdminPassword")?.value;
        const submitBtn = document.getElementById("submitAddAdminBtn");

        if (!name || !email || !password) {
            showToast("Please fill in all required fields", "warning");
            return;
        }

        if (password.length < 8) {
            showToast("Password must be at least 8 characters", "warning");
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span>Authorizing...</span>`;
        }

        try {
            const response = await fetch(`${API_URL}/users/admin`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({ name, email, password, role, department })
            });

            const data = await response.json();

            if (response.ok) {
                showToast(`Administrator ${name} provisioned successfully!`, "success");
                createAdminForm.reset();
                closeAddAdmin();
                loadAdminsList();
            } else {
                showToast(data.message || "Failed to create administrator", "error");
            }
        } catch (err) {
            console.error("Create admin error:", err);
            showToast("Network error while provisioning administrator.", "error");
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `
                    <i data-lucide="user-plus"></i>
                    <span>Authorize &amp; Provision</span>
                `;
                initIcons();
            }
        }
    });
}

// -------------------------------------------------------------
// Revoke Administrator Modal & Confirmation Handlers
// -------------------------------------------------------------
const revokeAdminModal = document.getElementById("revokeAdminModal");
const closeRevokeModalBtn = document.getElementById("closeRevokeModalBtn");
const cancelRevokeBtn = document.getElementById("cancelRevokeBtn");
const confirmRevokeBtn = document.getElementById("confirmRevokeBtn");

function closeRevokeModal() {
    if (revokeAdminModal) revokeAdminModal.classList.add("hidden");
}

if (closeRevokeModalBtn) closeRevokeModalBtn.addEventListener("click", closeRevokeModal);
if (cancelRevokeBtn) cancelRevokeBtn.addEventListener("click", closeRevokeModal);
if (revokeAdminModal) {
    revokeAdminModal.addEventListener("click", (e) => {
        if (e.target === revokeAdminModal) closeRevokeModal();
    });
}

window.openRevokeAdminModal = function(id) {
    const target = allAdminsCache.find(u => String(u._id || u.id) === String(id));
    if (!target) return;

    const idInput = document.getElementById("revokeAdminId");
    const nameEl = document.getElementById("revokeAdminTargetName");
    const emailEl = document.getElementById("revokeAdminTargetEmail");

    if (idInput) idInput.value = id;
    if (nameEl) nameEl.textContent = target.name || "Administrator";
    if (emailEl) emailEl.textContent = target.email || "";

    if (revokeAdminModal) {
        revokeAdminModal.classList.remove("hidden");
        initIcons();
    }
};

window.revokeAdminAccess = window.openRevokeAdminModal;

if (confirmRevokeBtn) {
    confirmRevokeBtn.addEventListener("click", async function() {
        const id = document.getElementById("revokeAdminId")?.value;
        if (!id) return;

        confirmRevokeBtn.disabled = true;
        const originalContent = confirmRevokeBtn.innerHTML;
        confirmRevokeBtn.innerHTML = `<span>Revoking...</span>`;

        try {
            const response = await fetch(`${API_URL}/users/admin/${id}`, {
                method: "DELETE",
                headers: getAuthHeaders()
            });

            const data = await response.json();

            if (response.ok) {
                showToast("Administrator access revoked successfully", "info");
                closeRevokeModal();
                loadAdminsList();
            } else {
                showToast(data.message || "Failed to revoke admin credentials", "error");
            }
        } catch (err) {
            console.error("Revoke admin error:", err);
            showToast("Network error revoking admin access.", "error");
        } finally {
            confirmRevokeBtn.disabled = false;
            confirmRevokeBtn.innerHTML = originalContent;
            initIcons();
        }
    });
}

// -------------------------------------------------------------
// Directory Filters & Synchronize Handlers
// -------------------------------------------------------------
const adminStaffSearch = document.getElementById("adminStaffSearch");
if (adminStaffSearch) {
    adminStaffSearch.addEventListener("input", () => {
        filterAndRenderAdmins();
    });
}

const adminRoleFilter = document.getElementById("adminRoleFilter");
if (adminRoleFilter) {
    adminRoleFilter.addEventListener("change", () => {
        filterAndRenderAdmins();
    });
}

const refreshAdminsBtn = document.getElementById("refreshAdminsBtn");
if (refreshAdminsBtn) {
    refreshAdminsBtn.addEventListener("click", () => {
        const icon = refreshAdminsBtn.querySelector("i");
        if (icon) icon.style.animation = "spin 0.6s linear infinite";
        loadAdminsList().finally(() => {
            setTimeout(() => {
                if (icon) icon.style.animation = "";
            }, 600);
        });
        showToast("Synchronizing administrator directory...", "info");
    });
}

// Clickable Staff KPI Cards: In-place Filter of Staff Directory (No page redirection)
document.querySelectorAll("#manageAdmins .staff-kpi-card").forEach(card => {
    card.addEventListener("click", () => {
        const targetRole = card.getAttribute("data-admin-role");
        const roleFilterSelect = document.getElementById("adminRoleFilter");
        if (targetRole && targetRole !== "health" && roleFilterSelect) {
            roleFilterSelect.value = targetRole;
            filterAndRenderAdmins();

            const roleLabels = {
                all: "All Staff Members",
                super_admin: "Super Administrators",
                admin: "Campus Administrators"
            };
            showToast(`Filtered directory to: ${roleLabels[targetRole] || targetRole}`, "info");
        } else if (targetRole === "health") {
            showToast("Security Health: Role-Based Access Control (RBAC) is active and enforced.", "info");
        }
    });
});

// =========================================================
// RUN INITIAL CHECK
// =========================================================

if (adminToken) {
    showAdminDashboard();
} else {
    if (adminDashboard) adminDashboard.style.display = "none";
    if (adminLogin) adminLogin.style.display = "flex";
}