// =========================================================
// CAMPUSCARE - ADMIN DASHBOARD & SIDEBAR CONTROLLER (2026)
// =========================================================

const API_URL = "/api";
let adminToken = sessionStorage.getItem("adminToken");
let allComplaintsCache = [];
let currentFilterStatus = "all";
let currentViewMode = localStorage.getItem("adminViewMode") || "table";

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
    return {
        "Authorization": `Bearer ${adminToken}`,
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
    return complaint._id || complaint.id || "";
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
        const response = await fetch(`${API_URL}/complaints`, {
            headers: getAuthHeaders()
        });

        const data = await response.json();

        if (!response.ok) {
            console.error(data.message || "Failed to load complaints");
            return [];
        }

        allComplaintsCache = data.complaints || [];
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
// STATS & BADGE COUNTERS
// =========================================================

function updateStatsAndBadges(complaints) {
    const total = complaints.length;
    const pending = complaints.filter(c => c.status === "Pending").length;
    const progress = complaints.filter(c => c.status === "In Progress").length;
    const resolved = complaints.filter(c => c.status === "Resolved").length;

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
            sidebarPendingBadge.style.display = "inline-block";
        } else {
            sidebarPendingBadge.style.display = "none";
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

// Clickable KPI Cards: Click to Filter Queue
document.querySelectorAll(".kpi-card").forEach(card => {
    card.addEventListener("click", () => {
        const filterStatus = card.getAttribute("data-filter");
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

    const recent = [...complaints].reverse().slice(0, 4);
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
        if (adminComplaintList) adminComplaintList.style.display = "grid";
    }
}

viewTableBtn?.addEventListener("click", () => setViewMode("table"));
viewCardsBtn?.addEventListener("click", () => setViewMode("grid"));

function renderComplaintsQueue(complaints) {
    const tbody = document.getElementById("adminComplaintTableBody");
    const cardsGrid = document.getElementById("adminComplaintList");

    if (!tbody || !cardsGrid) return;

    if (complaints.length === 0) {
        const emptyHtml = `
            <div class="empty-state-wrap">
                <i data-lucide="filter-x" class="empty-state-icon"></i>
                <h3>No Matching Complaints</h3>
                <p>Try clearing your search query or changing the status filter.</p>
            </div>
        `;
        tbody.innerHTML = `<tr><td colspan="7">${emptyHtml}</td></tr>`;
        cardsGrid.innerHTML = emptyHtml;
        initIcons();
        return;
    }

    // Sort newest first
    const sorted = [...complaints].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    // Render Table Rows
    tbody.innerHTML = sorted.map(complaint => createTableRowHtml(complaint)).join("");

    // Render Grid Cards
    cardsGrid.innerHTML = sorted.map(complaint => createComplaintCardHtml(complaint)).join("");

    initIcons();
}

// Table Row HTML Generator
function createTableRowHtml(complaint) {
    const id = getComplaintId(complaint);
    const reporterName = getComplaintReporterName(complaint);
    const reporterEmail = getComplaintReporterEmail(complaint);
    const avatar = reporterName.charAt(0).toUpperCase();
    const dateFormatted = complaint.createdAt ? new Date(complaint.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "-";

    let statusBadgeClass = "status-pending";
    if (complaint.status === "In Progress") statusBadgeClass = "status-progress";
    if (complaint.status === "Resolved") statusBadgeClass = "status-resolved";

    const hasImage = Boolean(complaint.image);

    return `
        <tr data-id="${id}">
            <td>
                <div class="table-complaint-cell">
                    <span class="table-complaint-title">
                        ${escapeHTML(complaint.title)}
                        ${hasImage ? `<i data-lucide="image" class="table-has-image" title="Has photo attachment"></i>` : ""}
                    </span>
                    <span class="table-complaint-desc">${escapeHTML(complaint.description)}</span>
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
                <span class="category-tag">
                    <i data-lucide="tag" style="width:12px;height:12px;"></i>
                    ${escapeHTML(complaint.category || "General")}
                </span>
            </td>
            <td>
                <span class="location-tag">
                    <i data-lucide="map-pin"></i>
                    ${escapeHTML(complaint.location || "Campus")}
                </span>
            </td>
            <td style="color:#64748b; font-size:0.8125rem;">
                ${dateFormatted}
            </td>
            <td>
                <span class="badge-status ${statusBadgeClass}">
                    <span class="badge-dot"></span>
                    <span>${escapeHTML(complaint.status || "Pending")}</span>
                </span>
            </td>
            <td style="text-align: right;">
                <button class="action-triage-btn" onclick="openResolutionModal('${id}')">
                    <i data-lucide="sliders-horizontal"></i>
                    <span>Triage</span>
                </button>
            </td>
        </tr>
    `;
}

// Card HTML Generator
function createComplaintCardHtml(complaint) {
    const id = getComplaintId(complaint);
    const reporterName = getComplaintReporterName(complaint);
    const dateFormatted = complaint.createdAt ? new Date(complaint.createdAt).toLocaleDateString() : "";

    let statusBadgeClass = "status-pending";
    if (complaint.status === "In Progress") statusBadgeClass = "status-progress";
    if (complaint.status === "Resolved") statusBadgeClass = "status-resolved";

    return `
        <div class="admin-complaint-card" data-id="${id}">
            <div class="card-top-row">
                <h3 class="card-title">${escapeHTML(complaint.title)}</h3>
                <span class="badge-status ${statusBadgeClass}">
                    <span class="badge-dot"></span>
                    <span>${escapeHTML(complaint.status)}</span>
                </span>
            </div>

            <p class="card-desc">${escapeHTML(complaint.description)}</p>

            ${complaint.image ? `
                <a href="${complaint.image}" target="_blank" title="Click to view full image">
                    <img src="${complaint.image}" alt="Evidence" class="card-image-thumb">
                </a>
            ` : ""}

            <div class="card-tags">
                <span class="category-tag"><i data-lucide="tag" style="width:12px;height:12px;"></i> ${escapeHTML(complaint.category)}</span>
                <span class="location-tag"><i data-lucide="map-pin"></i> ${escapeHTML(complaint.location)}</span>
            </div>

            <div class="card-meta-list">
                <div class="card-meta-item">
                    <i data-lucide="user"></i>
                    <span>${escapeHTML(reporterName)}</span>
                </div>
                <div class="card-meta-item">
                    <i data-lucide="calendar"></i>
                    <span>${dateFormatted}</span>
                </div>
                ${complaint.resolvedBy ? `
                    <div class="card-meta-item text-success">
                        <i data-lucide="check-circle"></i>
                        <span>Resolved by: ${escapeHTML(complaint.resolvedBy)}</span>
                    </div>
                ` : ""}
            </div>

            <div class="card-footer-actions">
                <span style="font-size:0.75rem; color:#94a3b8;">ID: #${id.slice(-6)}</span>
                <button class="action-triage-btn" onclick="openResolutionModal('${id}')">
                    <i data-lucide="sliders-horizontal"></i>
                    <span>Triage &amp; Resolve</span>
                </button>
            </div>
        </div>
    `;
}

// =========================================================
// ADVANCED FILTERING (STATUS TABS, SEARCH & CATEGORY)
// =========================================================

function applyFiltersAndRender(complaints = allComplaintsCache) {
    const search = (adminSearch?.value || topbarSearchInput?.value || "").toLowerCase().trim();
    const category = adminCategory?.value || "all";

    const filtered = complaints.filter(complaint => {
        const reporterName = getComplaintReporterName(complaint).toLowerCase();
        const reporterEmail = getComplaintReporterEmail(complaint).toLowerCase();
        const title = (complaint.title || "").toLowerCase();
        const description = (complaint.description || "").toLowerCase();
        const location = (complaint.location || "").toLowerCase();

        const matchesSearch =
            !search ||
            title.includes(search) ||
            description.includes(search) ||
            reporterName.includes(search) ||
            reporterEmail.includes(search) ||
            location.includes(search);

        const matchesStatus = currentFilterStatus === "all" || complaint.status === currentFilterStatus;
        const matchesCategory = category === "all" || complaint.category === category;

        return matchesSearch && matchesStatus && matchesCategory;
    });

    renderComplaintsQueue(filtered);
}

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

// Search & Select Listeners
adminSearch?.addEventListener("input", () => {
    if (topbarSearchInput && topbarSearchInput.value !== adminSearch.value) {
        topbarSearchInput.value = adminSearch.value;
    }
    applyFiltersAndRender();
});

topbarSearchInput?.addEventListener("input", () => {
    if (adminSearch && adminSearch.value !== topbarSearchInput.value) {
        adminSearch.value = topbarSearchInput.value;
    }
    if (window.location.hash !== "#allComplaints") {
        window.location.hash = "allComplaints";
    }
    applyFiltersAndRender();
});

adminCategory?.addEventListener("change", () => applyFiltersAndRender());

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
});

// =========================================================
// RESOLUTION & TRIAGE MODAL
// =========================================================

window.openResolutionModal = function (complaintId) {
    const complaint = allComplaintsCache.find(c => getComplaintId(c) === complaintId);
    if (!complaint) return;

    modalComplaintId.value = complaintId;
    modalComplaintTitle.textContent = complaint.title || "Complaint";
    modalReporter.textContent = getComplaintReporterName(complaint);
    modalCategory.textContent = complaint.category || "General";
    modalLocation.textContent = complaint.location || "Campus";
    modalDate.textContent = complaint.createdAt ? new Date(complaint.createdAt).toLocaleString() : "-";
    modalDescription.textContent = complaint.description || "No description provided.";

    // Evidence Photo
    if (complaint.image) {
        modalImageWrap.style.display = "block";
        modalImagePreview.src = complaint.image;
        modalImageLink.href = complaint.image;
    } else {
        modalImageWrap.style.display = "none";
    }

    // Status & Remarks
    modalStatusSelect.value = complaint.status || "Pending";
    modalResolutionNotes.value = complaint.resolutionMessage || "";

    resolutionModal.classList.remove("hidden");
    initIcons();
};

function hideResolutionModal() {
    resolutionModal.classList.add("hidden");
}

closeResolutionModal?.addEventListener("click", hideResolutionModal);
cancelResolutionBtn?.addEventListener("click", hideResolutionModal);

resolutionModal?.addEventListener("click", (e) => {
    if (e.target === resolutionModal) hideResolutionModal();
});

resolutionForm?.addEventListener("submit", async function (e) {
    e.preventDefault();

    const id = modalComplaintId.value;
    const newStatus = modalStatusSelect.value;
    const notes = modalResolutionNotes.value.trim() || `Status updated to ${newStatus} by admin`;

    const saveBtn = document.getElementById("saveResolutionBtn");
    if (saveBtn) saveBtn.disabled = true;

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
            alert(data.message || "Failed to update complaint status");
            return;
        }

        showToast("Complaint lifecycle updated successfully!", "success");
        hideResolutionModal();
        await loadAdminData();

    } catch (error) {
        console.error("Resolution update error:", error);
        alert("Server error occurred while saving complaint update.");
    } finally {
        if (saveBtn) saveBtn.disabled = false;
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

// =========================================================
// SUPER ADMIN MANAGEMENT (SUB-ADMINS DIRECTORY)
// =========================================================

async function loadAdminsList() {
    const listContainer = document.getElementById("adminsList");
    if (!listContainer) return;

    listContainer.innerHTML = `<div style="padding: 20px; text-align: center; color: #94a3b8;">Loading administrator directory...</div>`;

    try {
        const response = await fetch(`${API_URL}/users/admin`, {
            headers: getAuthHeaders()
        });

        const admins = await response.json();

        if (!response.ok) {
            listContainer.innerHTML = `<div style="color: #ef4444; padding: 10px;">Failed to load admins list.</div>`;
            return;
        }

        if (!Array.isArray(admins) || admins.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state-wrap" style="padding: 30px 10px;">
                    <i data-lucide="shield-alert" class="empty-state-icon"></i>
                    <h3>No Sub-Admins Provisioned</h3>
                    <p>Only the primary Super Admin is currently active.</p>
                </div>
            `;
            initIcons();
            return;
        }

        listContainer.innerHTML = admins.map(user => {
            const userId = user._id || user.id;
            const userInitial = (user.name || "A").charAt(0).toUpperCase();
            const dateCreated = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Active";

            return `
                <div class="admin-user-row">
                    <div class="admin-user-meta">
                        <div class="user-avatar-badge">${userInitial}</div>
                        <div>
                            <strong style="display:block; font-size: 0.875rem; color:#0f172a;">${escapeHTML(user.name)}</strong>
                            <span style="font-size: 0.75rem; color: #64748b;">${escapeHTML(user.email)}</span>
                            <span style="display:inline-block; font-size: 0.6875rem; background: #e2e8f0; padding: 1px 6px; border-radius: 4px; margin-left: 6px;">Joined: ${dateCreated}</span>
                        </div>
                    </div>
                    <button class="revoke-btn" onclick="revokeAdminAccess('${userId}')">
                        <i data-lucide="trash-2"></i>
                        <span>Revoke</span>
                    </button>
                </div>
            `;
        }).join("");

        initIcons();

    } catch (error) {
        console.error("Admins list fetch error:", error);
        listContainer.innerHTML = `<div style="color: #ef4444; padding: 10px;">Connection error loading directory.</div>`;
    }
}

const createAdminForm = document.getElementById("createAdminForm");
if (createAdminForm) {
    createAdminForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const name = document.getElementById("newAdminName").value.trim();
        const email = document.getElementById("newAdminEmail").value.trim();
        const password = document.getElementById("newAdminPassword").value;

        try {
            const response = await fetch(`${API_URL}/users/admin`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();

            if (response.ok) {
                showToast("Campus staff admin provisioned successfully!", "success");
                createAdminForm.reset();
                loadAdminsList();
            } else {
                alert(data.message || "Failed to create administrator");
            }
        } catch (err) {
            console.error("Create admin error:", err);
            alert("Network error while provisioning admin.");
        }
    });
}

window.revokeAdminAccess = async function (id) {
    if (!confirm("Are you sure you want to revoke this administrator's access credentials?")) return;

    try {
        const response = await fetch(`${API_URL}/users/admin/${id}`, {
            method: "DELETE",
            headers: getAuthHeaders()
        });

        const data = await response.json();

        if (response.ok) {
            showToast("Admin access successfully revoked", "info");
            loadAdminsList();
        } else {
            alert(data.message || "Failed to revoke admin credentials");
        }
    } catch (err) {
        console.error("Revoke admin error:", err);
        alert("Network error revoking admin access.");
    }
};

// =========================================================
// RUN INITIAL CHECK
// =========================================================

if (adminToken) {
    showAdminDashboard();
} else {
    if (adminDashboard) adminDashboard.style.display = "none";
    if (adminLogin) adminLogin.style.display = "flex";
}