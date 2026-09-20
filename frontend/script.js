let currentUser = JSON.parse(localStorage.getItem("campusUser"));
let userToken = localStorage.getItem("campusToken");

const API_URL = "http://localhost:5000/api";

// Helper to get auth headers
function getAuthHeaders() {
    return {
        "Authorization": `Bearer ${userToken}`
    };
}

// ================= LOGIN =================

const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();

        if (!email || !password) {
            alert("Please enter email and password");
            return;
        }

        try {
            const response = await fetch(`${API_URL}/users/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.message || "Login failed");
                return;
            }

            currentUser = data.user;
            userToken = data.token;

            localStorage.setItem("campusUser", JSON.stringify(data.user));
            localStorage.setItem("campusToken", data.token);

            alert("Login successful!");
            showDashboard(currentUser);

        } catch (error) {
            console.error("Login Error:", error);
            alert("Server connection failed. Make sure backend is running on port 5000.");
        }
    });
}

// ================= REGISTER =================

const registerForm = document.getElementById("registerForm");

if (registerForm) {
    registerForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const name = document.getElementById("registerName").value.trim();
        const email = document.getElementById("registerEmail").value.trim();
        const password = document.getElementById("registerPassword").value.trim();

        if (!name || !email || !password) {
            alert("Please fill all fields");
            return;
        }

        try {
            const response = await fetch(`${API_URL}/users/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.message || "Registration failed");
                return;
            }

            alert("Registration successful! Please login.");
            registerForm.reset();
            showLogin();

        } catch (error) {
            console.error("Register Error:", error);
            alert("Server connection failed. Make sure backend is running.");
        }
    });
}

// ================= SHOW DASHBOARD =================

function showDashboard(user) {
    if (!user) return;

    document.getElementById("loginPage").classList.add("hidden");
    document.getElementById("registerPage").classList.add("hidden");
    document.getElementById("dashboardPage").classList.remove("hidden");

    document.getElementById("welcomeName").textContent = user.name;
    document.getElementById("sidebarName").textContent = user.name;
    document.getElementById("sidebarEmail").textContent = user.email;

    const avatar = user.name.charAt(0).toUpperCase();
    document.getElementById("sidebarAvatar").textContent = avatar;
    document.getElementById("topAvatar").textContent = avatar;
    
    if (document.getElementById("complaintName")) {
        document.getElementById("complaintName").value = user.name;
    }

    if (!window.location.hash || window.location.hash === "#") {
        window.location.hash = "overview";
    } else {
        handleRoute();
    }
}

// ================= SHOW LOGIN =================

function showLogin() {
    document.getElementById("registerPage").classList.add("hidden");
    document.getElementById("dashboardPage").classList.add("hidden");
    document.getElementById("loginPage").classList.remove("hidden");
}

// ================= REGISTER PAGE =================

const registerBtn = document.getElementById("registerBtn");

if (registerBtn) {
    registerBtn.addEventListener("click", function (e) {
        e.preventDefault();
        document.getElementById("loginPage").classList.add("hidden");
        document.getElementById("registerPage").classList.remove("hidden");
    });
}

const backToLoginBtn = document.getElementById("backToLoginBtn");
if (backToLoginBtn) {
    backToLoginBtn.addEventListener("click", function (e) {
        e.preventDefault();
        showLogin();
    });
}

// ================= ADMIN LOGIN =================

const adminLoginBtn = document.getElementById("adminLoginBtn");

if (adminLoginBtn) {
    adminLoginBtn.addEventListener("click", function () {
        window.location.href = "admin.html";
    });
}

// ================= LOGOUT =================

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
        localStorage.removeItem("campusUser");
        localStorage.removeItem("campusToken");
        currentUser = null;
        userToken = null;

        document.getElementById("dashboardPage").classList.add("hidden");
        document.getElementById("loginPage").classList.remove("hidden");
    });
}

// ================= NAVIGATION =================

// ================================
// NAVIGATION (HASH ROUTER)
// ================================

function handleRoute() {
    if (!userToken) return;

    let hash = window.location.hash.substring(1);
    if (!hash) {
        hash = "overview";
        window.location.hash = hash;
        return;
    }

    const overviewSection = document.getElementById("overviewSection");
    if (overviewSection) overviewSection.classList.add("hidden");

    const newComplaintSection = document.getElementById("newComplaintSection");
    if (newComplaintSection) newComplaintSection.classList.add("hidden");

    const selectedSection = document.getElementById(hash + "Section");
    if (selectedSection) selectedSection.classList.remove("hidden");

    const titles = {
        overview: "Overview",
        newComplaint: "New Complaint"
    };

    const pageTitle = document.getElementById("pageTitle");
    if (pageTitle) pageTitle.textContent = titles[hash] || "Dashboard";

    document.querySelectorAll(".nav-link").forEach(function (link) {
        link.classList.remove("active");
    });

    const activeLink = document.querySelector(`[data-section="${hash}"]`);
    if (activeLink) activeLink.classList.add("active");

    // Dynamic data fetch on view
    if (hash === "overview") {
        loadComplaints();
    }
}

window.addEventListener("hashchange", handleRoute);

// ================= SUBMIT COMPLAINT =================

const complaintForm = document.getElementById("complaintForm");

if (complaintForm) {
    complaintForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        if (!currentUser || !userToken) {
            alert("Please login first.");
            return;
        }

        const title = document.getElementById("complaintTitle").value.trim();
        const description = document.getElementById("complaintDescription").value.trim();
        const category = document.getElementById("complaintCategory").value;
        const location = document.getElementById("complaintLocation").value.trim();
        const imageFile = document.getElementById("complaintImage")?.files[0];

        if (!title || !description || !category || !location) {
            alert("Please fill all complaint fields");
            return;
        }

        const formData = new FormData();
        formData.append("title", title);
        formData.append("description", description);
        formData.append("category", category);
        formData.append("location", location);
        if (imageFile) {
            formData.append("image", imageFile);
        }

        try {
            const response = await fetch(`${API_URL}/complaints`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.message || "Complaint submission failed");
                return;
            }

            alert("Complaint submitted successfully!");
            complaintForm.reset();
            document.getElementById("charCount").textContent = "0";
            if (document.getElementById("complaintName")) {
                document.getElementById("complaintName").value = currentUser.name;
            }

            await loadComplaints();
            window.location.hash = "overview";

        } catch (error) {
            console.error("Complaint Error:", error);
            alert("Server connection failed. Make sure backend is running.");
        }
    });
}

// ================= LOAD COMPLAINTS =================

async function loadComplaints() {
    if (!currentUser || !userToken) return;

    const recentComplaints = document.getElementById("recentComplaints");
    const complaintsList = document.getElementById("complaintsList");
    
    // Show skeletons
    if (recentComplaints) recentComplaints.innerHTML = getSkeletonCard() + getSkeletonCard();
    if (complaintsList) complaintsList.innerHTML = getSkeletonCard() + getSkeletonCard();

    try {
        const response = await fetch(`${API_URL}/complaints`, {
            headers: getAuthHeaders()
        });

        const data = await response.json();

        if (!response.ok) {
            console.log(data);
            return;
        }

        const allComplaints = data.complaints || [];

        // For student, filter their own complaints
        const userComplaints = allComplaints.filter(function (complaint) {
            const reportedBy = complaint.reportedBy;
            if (!reportedBy) return false;

            const reportedById = typeof reportedBy === "object"
                ? (reportedBy._id || reportedBy.id)
                : reportedBy;

            return String(reportedById) === String(currentUser.id);
        });

        // Statistics
        if (document.getElementById("totalComplaints")) {
            document.getElementById("totalComplaints").textContent = userComplaints.length;
            document.getElementById("pendingComplaints").textContent = userComplaints.filter(c => c.status === "Pending").length;
            document.getElementById("progressComplaints").textContent = userComplaints.filter(c => c.status === "In Progress").length;
            document.getElementById("resolvedComplaints").textContent = userComplaints.filter(c => c.status === "Resolved").length;
        }

        // Recent complaints
        if (recentComplaints) {
            if (userComplaints.length === 0) {
                recentComplaints.innerHTML = `
                    <div class="empty-state">
                        <i data-lucide="inbox" style="width:48px;height:48px;color:#cbd5e1;margin-bottom:10px;"></i>
                        <h3>No complaints yet</h3>
                        <p>Create your first complaint.</p>
                    </div>
                `;
            } else {
                recentComplaints.innerHTML = userComplaints.slice(0, 5).map(complaintCard).join("");
            }
        }

        filterComplaints(userComplaints);
        
        // Init icons after rendering
        initIcons();

    } catch (error) {
        console.error("Load Complaints Error:", error);
    }
}

// ================= FILTER =================

function filterComplaints(data) {
    const searchInput = document.getElementById("searchComplaint");
    const statusInput = document.getElementById("statusFilter");
    const categoryInput = document.getElementById("categoryFilter");

    if (!searchInput || !statusInput || !categoryInput) return;

    const search = searchInput.value.toLowerCase();
    const status = statusInput.value;
    const category = categoryInput.value;

    const result = data.filter(function (c) {
        return (
            c.title.toLowerCase().includes(search) &&
            (status === "all" || c.status === status) &&
            (category === "all" || c.category === category)
        );
    });

    const complaintsList = document.getElementById("complaintsList");
    if (complaintsList) {
        if (result.length === 0) {
            complaintsList.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="search-X" style="width:48px;height:48px;color:#cbd5e1;margin-bottom:10px;"></i>
                    <h3>No complaints found</h3>
                    <p>Your complaints will appear here.</p>
                </div>
            `;
        } else {
            complaintsList.innerHTML = result.map(complaintCard).join("");
        }
    }
    
    // Re-init icons
    initIcons();
}

// ================= COMPLAINT CARD =================

function complaintCard(c) {
    const id = c._id || c.id;
    return `
        <div class="complaint-card" onclick="showDetails('${id}')">
            <small>${c.category}</small>
            <h3>${c.title}</h3>
            <p style="display:flex;align-items:center;gap:5px;"><i data-lucide="map-pin" style="width:16px;height:16px;"></i> ${c.location}</p>
            <p>${c.description}</p>
            <b>${c.status}</b>
        </div>
    `;
}

// ================= SEARCH =================

const searchComplaint = document.getElementById("searchComplaint");
if (searchComplaint) searchComplaint.oninput = function () { loadComplaints(); };

const statusFilter = document.getElementById("statusFilter");
if (statusFilter) statusFilter.onchange = function () { loadComplaints(); };

const categoryFilter = document.getElementById("categoryFilter");
if (categoryFilter) categoryFilter.onchange = function () { loadComplaints(); };

// ================= CHARACTER COUNT =================

const complaintDescription = document.getElementById("complaintDescription");
if (complaintDescription) {
    complaintDescription.oninput = function () {
        document.getElementById("charCount").textContent = this.value.length;
    };
}

// ================= DETAILS =================

async function showDetails(id) {
    try {
        const response = await fetch(`${API_URL}/complaints/${id}`, {
            headers: getAuthHeaders()
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || "Complaint not found");
            return;
        }

        const complaint = data.complaint;
        
        let imageHtml = "";
        if (complaint.image) {
            imageHtml = `<p><b>Image:</b><br><img src="${complaint.image}" style="max-width: 100%; border-radius: 8px; margin-top: 10px;" alt="Complaint Image"></p>`;
        }

        document.getElementById("modalContent").innerHTML = `
            <h2>${complaint.title}</h2>
            <p style="display:flex;align-items:center;gap:5px;"><i data-lucide="folder" style="width:16px;height:16px;"></i> <b>Category:</b> ${complaint.category}</p>
            <p style="display:flex;align-items:center;gap:5px;"><i data-lucide="map-pin" style="width:16px;height:16px;"></i> <b>Location:</b> ${complaint.location}</p>
            <p style="display:flex;align-items:center;gap:5px;"><i data-lucide="activity" style="width:16px;height:16px;"></i> <b>Status:</b> ${complaint.status}</p>
            <p><b>Description:</b> ${complaint.description}</p>
            <p><b>Resolution:</b> ${complaint.resolutionMessage || "Not available"}</p>
            ${imageHtml}
        `;

        document.getElementById("detailsModal").classList.remove("hidden");
        initIcons();

    } catch (error) {
        console.error("Details Error:", error);
    }
}

// ================= CLOSE MODAL =================

const closeModal = document.getElementById("closeModal");
if (closeModal) {
    closeModal.onclick = function () {
        document.getElementById("detailsModal").classList.add("hidden");
    };
}

const detailsModal = document.getElementById("detailsModal");
if (detailsModal) {
    detailsModal.onclick = function (e) {
        if (e.target === this) {
            this.classList.add("hidden");
        }
    };
}

// ================= MOBILE MENU =================

const mobileMenu = document.getElementById("mobileMenu");
if (mobileMenu) {
    mobileMenu.onclick = function () {
        document.querySelector(".sidebar").classList.toggle("open");
    };
}

// ================= AUTO LOGIN =================

if (currentUser && userToken) {
    showDashboard(currentUser);
} else {
    // Ensure hidden if not logged in
    document.getElementById("dashboardPage")?.classList.add("hidden");
    document.getElementById("loginPage")?.classList.remove("hidden");
}