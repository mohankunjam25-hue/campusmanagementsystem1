// ================================
// CAMPUS CARE - ADMIN JS
// ================================

const API_URL = "http://localhost:5000/api";
let adminToken = sessionStorage.getItem("adminToken");

// ================================
// ELEMENTS
// ================================

const adminLogin = document.getElementById("adminLogin");
const adminDashboard = document.getElementById("adminDashboard");

const adminLoginForm = document.getElementById("adminLoginForm");
const adminEmail = document.getElementById("adminEmail");
const adminPassword = document.getElementById("adminPassword");

const adminLogout = document.getElementById("adminLogout");

// Helper
function getAuthHeaders() {
    return {
        "Authorization": `Bearer ${adminToken}`,
        "Content-Type": "application/json"
    };
}

// ================================
// LOGIN
// ================================

adminLoginForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = adminEmail.value.trim();
    const password = adminPassword.value.trim();

    try {
        const response = await fetch(`${API_URL}/users/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || "Invalid admin email or password!");
            return;
        }

        if (data.user.role !== "admin" && data.user.role !== "super_admin") {
            alert("Access Denied: You are not an admin.");
            return;
        }

        adminToken = data.token;
        sessionStorage.setItem("adminToken", data.token);
        sessionStorage.setItem("adminRole", data.user.role);
        sessionStorage.setItem("adminName", data.user.name);
        sessionStorage.setItem("adminEmail", data.user.email);
        
        showAdminDashboard();
    } catch (error) {
        console.error("Admin Login Error:", error);
        alert("Server connection failed.");
    }
});

// ================================
// SHOW DASHBOARD
// ================================

function showAdminDashboard() {
    adminLogin.style.display = "none";
    adminDashboard.style.display = "flex";
    
    const role = sessionStorage.getItem("adminRole");
    const name = sessionStorage.getItem("adminName");
    const email = sessionStorage.getItem("adminEmail");
    
    // Update profile UI
    if (name) {
        const nameEl = document.getElementById("adminProfileName");
        const avatarEl = document.getElementById("adminAvatarText");
        const roleEl = document.getElementById("adminProfileRole");
        if (nameEl) nameEl.textContent = name;
        if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();
        if (roleEl) {
            roleEl.textContent = role === "super_admin" ? "Super Admin" : "Campus Admin";
        }
    }

    const nav = document.getElementById("manageAdminsNav");
    const section = document.getElementById("manageAdmins");

    if (role === "super_admin") {
        if (nav) nav.style.display = "block";
    } else {
        if (nav) nav.style.display = "none";
        if (section) section.style.display = "none";
    }
    
    // Trigger router
    if (!window.location.hash || window.location.hash === "#") {
        window.location.hash = "adminOverview";
    } else {
        handleRoute();
    }
}

// ================================
// LOGOUT
// ================================

adminLogout.addEventListener("click", function () {
    sessionStorage.removeItem("adminToken");
    sessionStorage.removeItem("adminRole");
    sessionStorage.removeItem("adminName");
    sessionStorage.removeItem("adminEmail");
    adminToken = null;
    
    adminDashboard.style.display = "none";
    adminLogin.style.display = "flex";

    adminLoginForm.reset();
});

// ================================
// GET COMPLAINTS
// ================================

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

        return data.complaints || [];

    } catch (error) {
        console.error("Admin complaints fetch error:", error);
        return [];
    }
}

// ================================
// LOAD ADMIN DATA
// ================================

function getSkeletonCard() {
    return `
        <div class="admin-complaint-card" style="background: #f1f5f9; height: 100px; border-radius: 8px; margin-bottom: 15px;"></div>
    `;
}

async function loadAdminData() {
    // Skeletons
    const list = document.getElementById("adminComplaintList");
    const recent = document.getElementById("adminRecentComplaints");
    if(list) list.innerHTML = getSkeletonCard() + getSkeletonCard();
    if(recent) recent.innerHTML = getSkeletonCard() + getSkeletonCard();

    const complaints = await getComplaints();

    updateStats(complaints);
    showRecentComplaints(complaints);
    showAllComplaints(complaints);
}

// ================================
// UPDATE STATS
// ================================

function updateStats(complaints) {
    const total = complaints.length;
    const pending = complaints.filter(complaint => complaint.status === "Pending").length;
    const progress = complaints.filter(complaint => complaint.status === "In Progress").length;
    const resolved = complaints.filter(complaint => complaint.status === "Resolved").length;

    if(document.getElementById("adminTotal")) document.getElementById("adminTotal").textContent = total;
    if(document.getElementById("adminPending")) document.getElementById("adminPending").textContent = pending;
    if(document.getElementById("adminProgress")) document.getElementById("adminProgress").textContent = progress;
    if(document.getElementById("adminResolved")) document.getElementById("adminResolved").textContent = resolved;
}

// ================================
// RECENT COMPLAINTS
// ================================

function showRecentComplaints(complaints) {
    const container = document.getElementById("adminRecentComplaints");
    if(!container) return;

    container.innerHTML = "";

    if (complaints.length === 0) {
        container.innerHTML = `
            <div class="admin-complaint-card">
                <h3>No Complaints Yet</h3>
                <p>Students have not submitted any complaints.</p>
            </div>
        `;
        return;
    }

    const recent = [...complaints].reverse().slice(0, 5);

    recent.forEach(complaint => {
        container.innerHTML += createComplaintCard(complaint, false);
    });
}

// ================================
// ALL COMPLAINTS
// ================================

function showAllComplaints(complaints = []) {
    const container = document.getElementById("adminComplaintList");
    if(!container) return;
    
    container.innerHTML = "";

    if (complaints.length === 0) {
        container.innerHTML = `
            <div class="admin-complaint-card empty-state" style="text-align:center;">
                <i data-lucide="inbox" style="width:48px;height:48px;color:#cbd5e1;margin-bottom:10px;"></i>
                <h3>No Complaints Found</h3>
                <p>There are no complaints to display.</p>
            </div>
        `;
        initIcons();
        return;
    }

    [...complaints].reverse().forEach(complaint => {
        container.innerHTML += createComplaintCard(complaint, true);
    });
    
    initIcons();
}

// ================================
// COMPLAINT CARD
// ================================

function getComplaintId(complaint) {
    return complaint._id || complaint.id || "";
}

function getComplaintReporterName(complaint) {
    const reportedBy = complaint.reportedBy;
    if (!reportedBy) return "Unknown";
    if (typeof reportedBy === "object") return reportedBy.name || reportedBy.email || "Unknown";
    return reportedBy;
}

function escapeHTML(value) {
    if (!value) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function createComplaintCard(complaint, showUpdate) {
    let statusClass = "pending";
    if (complaint.status === "In Progress") statusClass = "progress";
    if (complaint.status === "Resolved") statusClass = "resolved";

    const complaintId = getComplaintId(complaint);
    
    let imageHtml = "";
    if (complaint.image) {
        imageHtml = `
            <div style="margin-top: 10px;">
                <a href="${complaint.image}" target="_blank">
                    <img src="${complaint.image}" alt="Complaint Image" style="max-width: 100px; border-radius: 4px; cursor: pointer;">
                </a>
            </div>
        `;
    }

    return `
        <div class="admin-complaint-card">
            <div class="admin-complaint-top">
                <div>
                    <h3>${escapeHTML(complaint.title)}</h3>
                    <p>${escapeHTML(complaint.description)}</p>
                </div>
                <span class="status ${statusClass}">${complaint.status}</span>
            </div>

            <div class="complaint-info" style="display:flex; gap:15px; align-items:center; flex-wrap:wrap; margin-top:10px; color:#64748b;">
                <span style="display:flex;align-items:center;gap:4px;"><i data-lucide="user" style="width:14px;height:14px;"></i> ${escapeHTML(getComplaintReporterName(complaint))}</span>
                <span style="display:flex;align-items:center;gap:4px;"><i data-lucide="folder" style="width:14px;height:14px;"></i> ${escapeHTML(complaint.category)}</span>
                <span style="display:flex;align-items:center;gap:4px;"><i data-lucide="map-pin" style="width:14px;height:14px;"></i> ${escapeHTML(complaint.location)}</span>
                <span style="display:flex;align-items:center;gap:4px;"><i data-lucide="calendar" style="width:14px;height:14px;"></i> ${escapeHTML(complaint.createdAt ? new Date(complaint.createdAt).toLocaleDateString() : "")}</span>
                ${complaint.resolvedBy ? `<span style="display:flex;align-items:center;gap:4px;color:#10b981;"><i data-lucide="check-circle" style="width:14px;height:14px;"></i> Resolved By: ${escapeHTML(complaint.resolvedBy)}</span>` : ""}
            </div>
            
            ${imageHtml}

            ${showUpdate ? `
                <div class="admin-update">
                    <select class="status-select" data-id="${complaintId}">
                        <option value="Pending" ${complaint.status === "Pending" ? "selected" : ""}>Pending</option>
                        <option value="In Progress" ${complaint.status === "In Progress" ? "selected" : ""}>In Progress</option>
                        <option value="Resolved" ${complaint.status === "Resolved" ? "selected" : ""}>Resolved</option>
                    </select>
                    <button onclick="updateComplaint('${complaintId}')">Update Status</button>
                </div>
            ` : ""}
        </div>
    `;
}

// ================================
// UPDATE STATUS
// ================================

async function updateComplaint(id) {
    const select = document.querySelector(`.status-select[data-id="${id}"]`);
    if (!select) return;

    const newStatus = select.value;

    try {
        const response = await fetch(`${API_URL}/complaints/${id}`, {
            method: "PUT",
            headers: getAuthHeaders(),
            body: JSON.stringify({
                status: newStatus,
                resolutionMessage: "Updated by admin"
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || "Complaint update failed");
            return;
        }

        alert("Complaint status updated!");
        await loadAdminData();

    } catch (error) {
        console.error("Admin update complaint error:", error);
        alert("Server connection failed. Make sure backend is running.");
    }
}

// ================================
// NAVIGATION (HASH ROUTER)
// ================================

function handleRoute() {
    if (!adminToken) return;
    
    let hash = window.location.hash.substring(1);
    if (!hash) {
        hash = "adminOverview";
        window.location.hash = hash;
        return; // handleRoute will run again
    }

    const navLinks = document.querySelectorAll(".admin-nav a");
    navLinks.forEach(item => item.classList.remove("active"));
    
    const activeLink = document.querySelector(`.admin-nav a[data-section="${hash}"]`);
    if (activeLink) activeLink.classList.add("active");

    document.querySelectorAll(".admin-main section").forEach(section => {
        section.style.display = "none";
    });

    const section = document.getElementById(hash);
    if (section) section.style.display = "block";

    // Dynamic data flow on route change
    if (hash === "allComplaints") {
        getComplaints().then(complaints => showAllComplaints(complaints));
    } else if (hash === "manageAdmins") {
        loadAdminsList();
    } else if (hash === "adminOverview") {
        loadAdminData();
    }
}

window.addEventListener("hashchange", handleRoute);

// ================================
// SEARCH
// ================================

const adminSearch = document.getElementById("adminSearch");
const adminStatus = document.getElementById("adminStatus");
const adminCategory = document.getElementById("adminCategory");

async function filterComplaints() {
    const complaints = await getComplaints();

    const search = adminSearch?.value.toLowerCase().trim() || "";
    const status = adminStatus?.value || "all";
    const category = adminCategory?.value || "all";

    const filtered = complaints.filter(complaint => {
        const reporterName = getComplaintReporterName(complaint).toLowerCase();

        const matchesSearch = 
            complaint.title.toLowerCase().includes(search) ||
            complaint.description.toLowerCase().includes(search) ||
            reporterName.includes(search);

        const matchesStatus = status === "all" || complaint.status === status;
        const matchesCategory = category === "all" || complaint.category === category;

        return matchesSearch && matchesStatus && matchesCategory;
    });

    showAllComplaints(filtered);
}

if(adminSearch) adminSearch.addEventListener("input", filterComplaints);
if(adminStatus) adminStatus.addEventListener("change", filterComplaints);
if(adminCategory) adminCategory.addEventListener("change", filterComplaints);

// ================================
// ADMIN LOGIN CHECK
// ================================

if (adminToken) {
    showAdminDashboard();
} else {
    if(adminDashboard) adminDashboard.style.display = "none";
    if(adminLogin) adminLogin.style.display = "flex";
}

// ================================
// SUPER ADMIN MANAGEMENT
// ================================

async function loadAdminsList() {
    try {
        const response = await fetch(`${API_URL}/users/admin`, {
            headers: getAuthHeaders()
        });
        const admins = await response.json();
        
        const list = document.getElementById("adminsList");
        if (!list) return;

        if (!response.ok) {
            list.innerHTML = `<p style="color:red">Failed to load admins</p>`;
            return;
        }

        if (admins.length === 0) {
            list.innerHTML = `<p>No sub-admins found.</p>`;
            return;
        }

        list.innerHTML = admins.map(admin => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding: 12px 15px; border: 1px solid #e2e8f0; border-radius: 8px; transition: all 0.2s;" onmouseover="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.05)'; this.style.borderColor='#cbd5e1';" onmouseout="this.style.boxShadow='none'; this.style.borderColor='#e2e8f0';">
                <div>
                    <strong>${escapeHTML(admin.name)}</strong><br>
                    <small style="color:#64748b">${escapeHTML(admin.email)}</small>
                </div>
                <button onclick="revokeAdminAccess('${admin._id || admin.id}')" style="background:#ef4444; color:white; border:none; padding: 8px 14px; border-radius: 6px; cursor:pointer; font-weight:500; font-size:13px; transition: all 0.2s;" onmouseover="this.style.background='#dc2626'; this.style.transform='scale(0.98)';" onmouseout="this.style.background='#ef4444'; this.style.transform='scale(1)';">
                    Revoke Access
                </button>
            </div>
        `).join("");

    } catch (err) {
        console.error(err);
    }
}

const createAdminForm = document.getElementById("createAdminForm");
if (createAdminForm) {
    createAdminForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const name = document.getElementById("newAdminName").value;
        const email = document.getElementById("newAdminEmail").value;
        const password = document.getElementById("newAdminPassword").value;
        
        try {
            const response = await fetch(`${API_URL}/users/admin`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({ name, email, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                alert("Sub-admin created successfully!");
                createAdminForm.reset();
                loadAdminsList();
            } else {
                alert(data.message || "Failed to create admin");
            }
        } catch (err) {
            console.error(err);
            alert("Connection error");
        }
    });
}

async function revokeAdminAccess(id) {
    if (!confirm("Are you sure you want to revoke this admin's access?")) return;
    
    try {
        const response = await fetch(`${API_URL}/users/admin/${id}`, {
            method: "DELETE",
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            alert("Admin access revoked");
            loadAdminsList();
        } else {
            const data = await response.json();
            alert(data.message || "Failed to revoke access");
        }
    } catch (err) {
        console.error(err);
        alert("Connection error");
    }
}