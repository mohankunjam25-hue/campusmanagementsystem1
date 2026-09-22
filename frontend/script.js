// Parse Google OAuth Redirect parameters if returning from Google
const authParams = new URLSearchParams(window.location.search);
if (authParams.has("auth_token") && authParams.has("user")) {
    try {
        const urlToken = authParams.get("auth_token");
        const urlUser = JSON.parse(decodeURIComponent(authParams.get("user")));
        localStorage.setItem("campusUser", JSON.stringify(urlUser));
        localStorage.setItem("campusToken", urlToken);
        window.history.replaceState({}, document.title, window.location.pathname + "#overview");
    } catch (e) {
        console.error("Auth redirect parse error:", e);
    }
}

let currentUser = JSON.parse(localStorage.getItem("campusUser"));
let userToken = localStorage.getItem("campusToken");
let googleClientId = "";
let isEmailDeliveryConfigured = false;
let studentComplaintsCache = [];
const studentComplaintStore = (typeof CampusDSA !== "undefined" && CampusDSA.ComplaintStore)
    ? new CampusDSA.ComplaintStore()
    : null;

const API_URL = "/api";

// Helper to get auth headers
function getAuthHeaders() {
    return {
        "Authorization": `Bearer ${userToken}`
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

// Check for URL redirect errors or messages
if (authParams.has("error")) {
    const err = authParams.get("error");
    if (err && err !== "no_credential") {
        alert("Google Sign-In: " + decodeURIComponent(err));
    }
    window.history.replaceState({}, document.title, window.location.pathname);
}

// ================= GOOGLE AUTHENTICATION =================

async function initGoogleAuth() {
    try {
        const res = await fetch(`${API_URL}/users/auth-config`);
        const config = await res.json();
        googleClientId = config.googleClientId || "";
        isEmailDeliveryConfigured = config.emailDeliveryConfigured || false;

        const checkGsiReady = () => {
            if (googleClientId && window.google?.accounts?.id) {
                const redirectUri = window.location.origin + "/index.html";

                google.accounts.id.initialize({
                    client_id: googleClientId,
                    ux_mode: "redirect",
                    login_uri: redirectUri,
                    auto_select: false
                });

                const btnOptions = {
                    theme: "outline",
                    size: "large",
                    type: "standard",
                    shape: "rectangular",
                    text: "continue_with",
                    logo_alignment: "left",
                    width: 350
                };

                const signInContainer = document.getElementById("googleSignInBtn");
                if (signInContainer) {
                    signInContainer.innerHTML = "";
                    google.accounts.id.renderButton(signInContainer, btnOptions);
                }

                const signUpContainer = document.getElementById("googleSignUpBtn");
                if (signUpContainer) {
                    signUpContainer.innerHTML = "";
                    google.accounts.id.renderButton(signUpContainer, btnOptions);
                }
            } else {
                renderFallbackGoogleButtons();
            }
        };

        if (window.google?.accounts?.id) {
            checkGsiReady();
        } else {
            // Give the Google script a brief moment to load if network is slow
            setTimeout(checkGsiReady, 800);
        }

    } catch (err) {
        console.warn("Auth config check warning:", err);
        renderFallbackGoogleButtons();
    }
}

function renderFallbackGoogleButtons() {
    const googleSvg = `<svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>`;
    
    const btnHtml = `
        <button type="button" class="google-fallback-btn" onclick="handleDemoOrSetupGoogle()">
            ${googleSvg}
            <span>Continue with Google</span>
        </button>
    `;

    const signInContainer = document.getElementById("googleSignInBtn");
    if (signInContainer && !signInContainer.hasChildNodes()) {
        signInContainer.innerHTML = btnHtml;
    }

    const signUpContainer = document.getElementById("googleSignUpBtn");
    if (signUpContainer && !signUpContainer.hasChildNodes()) {
        signUpContainer.innerHTML = btnHtml;
    }
}

window.handleDemoOrSetupGoogle = function() {
    if (!googleClientId) {
        const demoEmail = prompt("Google Sign-In: Enter your Google email to sign in:", "student.google@campuscare.edu");
        if (!demoEmail) return;
        const demoName = prompt("Enter your Full Name:", "Google Student") || "Google Student";
        
        const mockPayload = {
            email: demoEmail.trim().toLowerCase(),
            name: demoName.trim(),
            sub: "google_" + Date.now(),
            picture: ""
        };

        const b64Payload = btoa(unescape(encodeURIComponent(JSON.stringify(mockPayload))));
        const mockToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${b64Payload}.mock_sig`;

        handleGoogleCredentialResponse({ credential: mockToken });
    }
};

async function handleGoogleCredentialResponse(response) {
    try {
        const res = await fetch(`${API_URL}/users/google-login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ credential: response.credential })
        });

        const data = await res.json();
        if (!res.ok) {
            alert(data.message || "Google Sign-In failed");
            return;
        }

        currentUser = data.user;
        userToken = data.token;
        localStorage.setItem("campusUser", JSON.stringify(data.user));
        localStorage.setItem("campusToken", data.token);

        alert(`Welcome, ${data.user.name}! Sign-In successful.`);
        showDashboard(currentUser);

    } catch (err) {
        console.error("Google Auth error:", err);
        alert("Failed to connect with server for Google Sign-In");
    }
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

    const avatar = user.name ? user.name.charAt(0).toUpperCase() : "U";
    if (user.avatar) {
        document.getElementById("sidebarAvatar").innerHTML = `<img src="${user.avatar}" alt="Avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        document.getElementById("topAvatar").innerHTML = `<img src="${user.avatar}" alt="Avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    } else {
        document.getElementById("sidebarAvatar").textContent = avatar;
        document.getElementById("topAvatar").textContent = avatar;
    }
    
    if (document.getElementById("securityAccountEmail")) {
        document.getElementById("securityAccountEmail").textContent = user.email || "";
    }

    if (document.getElementById("complaintName")) {
        document.getElementById("complaintName").value = user.name || "";
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

    const securitySection = document.getElementById("securitySection");
    if (securitySection) securitySection.classList.add("hidden");

    const selectedSection = document.getElementById(hash + "Section");
    if (selectedSection) selectedSection.classList.remove("hidden");

    const titles = {
        overview: "Overview",
        newComplaint: "New Complaint",
        security: "Security & Password"
    };

    const subtitles = {
        overview: "Welcome to your CampusCare dashboard",
        newComplaint: "Submit and track campus complaints",
        security: "Manage your credentials & email OTP verification"
    };

    const pageTitle = document.getElementById("pageTitle");
    if (pageTitle) pageTitle.textContent = titles[hash] || "Dashboard";

    const pageSubtitle = document.getElementById("pageSubtitle");
    if (pageSubtitle) pageSubtitle.textContent = subtitles[hash] || "";

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
    
    // Show skeletons only on initial empty load
    if (!studentComplaintsCache || studentComplaintsCache.length === 0) {
        if (recentComplaints) recentComplaints.innerHTML = getSkeletonCard() + getSkeletonCard();
        if (complaintsList) complaintsList.innerHTML = getSkeletonCard() + getSkeletonCard();
    }

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

        studentComplaintsCache = userComplaints;
        if (studentComplaintStore) {
            studentComplaintStore.load(userComplaints);
        }

        // Statistics (O(1) from algorithmic multi-index store)
        if (document.getElementById("totalComplaints")) {
            if (studentComplaintStore) {
                const metrics = studentComplaintStore.getMetrics();
                document.getElementById("totalComplaints").textContent = metrics.total;
                document.getElementById("pendingComplaints").textContent = metrics.pending;
                document.getElementById("progressComplaints").textContent = metrics.inProgress;
                document.getElementById("resolvedComplaints").textContent = metrics.resolved;
            } else {
                document.getElementById("totalComplaints").textContent = userComplaints.length;
                document.getElementById("pendingComplaints").textContent = userComplaints.filter(c => c.status === "Pending").length;
                document.getElementById("progressComplaints").textContent = userComplaints.filter(c => c.status === "In Progress").length;
                document.getElementById("resolvedComplaints").textContent = userComplaints.filter(c => c.status === "Resolved").length;
            }
        }

        // Recent complaints (Schwartzian transform sort)
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
                const sortedRecent = (typeof CampusDSA !== "undefined" && CampusDSA.SortAlgorithms)
                    ? CampusDSA.SortAlgorithms.sortByDateDesc(userComplaints, "createdAt").slice(0, 5)
                    : [...userComplaints].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 5);
                recentComplaints.innerHTML = sortedRecent.map(complaintCard).join("");
            }
        }

        filterComplaints();
        
        // Init icons after rendering
        initIcons();

    } catch (error) {
        console.error("Load Complaints Error:", error);
    }
}

// ================= FILTER (Prefix Trie + Inverted Index + Levenshtein DP) =================

function filterComplaints() {
    const searchInput = document.getElementById("searchComplaint");
    const statusInput = document.getElementById("statusFilter");
    const categoryInput = document.getElementById("categoryFilter");

    if (!searchInput || !statusInput || !categoryInput) return;

    const search = searchInput.value.trim();
    const status = statusInput.value;
    const category = categoryInput.value;

    let result;
    if (studentComplaintStore) {
        // High-performance algorithmic multi-index & fuzzy search
        result = studentComplaintStore.query({
            status: status,
            category: category,
            query: search,
            fuzzy: true
        });
    } else {
        const queryLower = search.toLowerCase();
        result = (studentComplaintsCache || []).filter(function (c) {
            return (
                (!queryLower || (c.title || "").toLowerCase().includes(queryLower) || (c.description || "").toLowerCase().includes(queryLower)) &&
                (status === "all" || c.status === status) &&
                (category === "all" || c.category === category)
            );
        });
    }

    const complaintsList = document.getElementById("complaintsList");
    if (complaintsList) {
        if (!result || result.length === 0) {
            complaintsList.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="search-x" style="width:48px;height:48px;color:#cbd5e1;margin-bottom:10px;"></i>
                    <h3>No complaints found</h3>
                    <p>Your complaints will appear here.</p>
                </div>
            `;
        } else {
            const sortedList = (typeof CampusDSA !== "undefined" && CampusDSA.SortAlgorithms)
                ? CampusDSA.SortAlgorithms.sortByDateDesc(result, "createdAt")
                : [...result].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

            if (typeof CampusDSA !== "undefined" && CampusDSA.KeyedDOMReconciler) {
                CampusDSA.KeyedDOMReconciler.reconcile(
                    complaintsList,
                    sortedList,
                    c => c._id || c.id,
                    complaintCard,
                    "div"
                );
            } else {
                complaintsList.innerHTML = sortedList.map(complaintCard).join("");
            }
        }
    }
    
    // Re-init icons
    initIcons();
}

// ================= COMPLAINT CARD =================

function complaintCard(c) {
    const id = c._id || c.id;
    const status = c.status || "Pending";
    const statusClass = "status-" + status.toLowerCase().replace(/\s+/g, '-');
    return `
        <div class="complaint-card" data-status="${status}" onclick="showDetails('${id}')">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <small class="category-badge">${escapeHTML(c.category || "General")}</small>
                <b class="status-badge ${statusClass}">${escapeHTML(status)}</b>
            </div>
            <h3>${escapeHTML(c.title || "")}</h3>
            <p style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--muted);margin-bottom:8px;">
                <i data-lucide="map-pin" style="width:14px;height:14px;color:var(--primary);flex-shrink:0;"></i>
                ${escapeHTML(c.location || "Campus")}
            </p>
            <p style="font-size:13.5px;color:var(--muted);line-height:1.45;">${escapeHTML(c.description || "")}</p>
        </div>
    `;
}

// ================= INSTANT CLIENT FILTERING (Amortized Debounce) =================

const debouncedStudentFilter = (typeof CampusDSA !== "undefined" && CampusDSA.debounce)
    ? CampusDSA.debounce(filterComplaints, 60)
    : filterComplaints;

const searchComplaint = document.getElementById("searchComplaint");
if (searchComplaint) searchComplaint.oninput = function () { debouncedStudentFilter(); };

const statusFilter = document.getElementById("statusFilter");
if (statusFilter) statusFilter.onchange = function () { filterComplaints(); };

const categoryFilter = document.getElementById("categoryFilter");
if (categoryFilter) categoryFilter.onchange = function () { filterComplaints(); };

// ================= CHARACTER COUNT =================

const complaintDescription = document.getElementById("complaintDescription");
if (complaintDescription) {
    complaintDescription.oninput = function () {
        document.getElementById("charCount").textContent = this.value.length;
    };
}

// ================= DETAILS (O(1) Cache-First Resolution) =================

async function showDetails(id) {
    let complaint = studentComplaintStore ? studentComplaintStore.getById(id) : null;

    // Fallback: fetch from backend only if not cached in store
    if (!complaint) {
        try {
            const response = await fetch(`${API_URL}/complaints/${id}`, {
                headers: getAuthHeaders()
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.message || "Complaint not found");
                return;
            }

            complaint = data.complaint;
        } catch (error) {
            console.error("Details Error:", error);
            return;
        }
    }

    if (!complaint) return;
    
    let imageHtml = "";
    if (complaint.image) {
        imageHtml = `<p style="margin-top:14px;"><b>Attached Evidence:</b><br><img src="${complaint.image}" style="max-width: 100%; border-radius: 6px; border: 1px solid var(--border); margin-top: 8px;" alt="Complaint Image"></p>`;
    }

    const modalStatus = complaint.status || "Pending";
    const modalStatusClass = "status-" + modalStatus.toLowerCase().replace(/\s+/g, '-');

    document.getElementById("modalContent").innerHTML = `
        <h2>${escapeHTML(complaint.title || "")}</h2>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 18px; padding: 14px 16px; background: var(--surface-subtle); border: 1px solid var(--border); border-radius: 6px;">
            <p style="display:flex;align-items:center;gap:6px;margin:0;"><i data-lucide="folder" style="width:16px;height:16px;color:var(--primary);"></i> <b>Category:</b> <span class="category-badge">${escapeHTML(complaint.category || "General")}</span></p>
            <p style="display:flex;align-items:center;gap:6px;margin:0;"><i data-lucide="map-pin" style="width:16px;height:16px;color:var(--primary);"></i> <b>Location:</b> <span style="color:var(--text);">${escapeHTML(complaint.location || "Campus")}</span></p>
            <p style="display:flex;align-items:center;gap:6px;margin:0;"><i data-lucide="activity" style="width:16px;height:16px;color:var(--primary);"></i> <b>Status:</b> <span class="status-badge ${modalStatusClass}">${escapeHTML(modalStatus)}</span></p>
        </div>
        <p><b>Description:</b><br><span style="color:var(--muted);">${escapeHTML(complaint.description || "No description provided.")}</span></p>
        <p style="margin-top:14px;"><b>Resolution Update:</b><br><span style="color:var(--muted);">${escapeHTML(complaint.resolutionMessage || "Pending administrative investigation & triage")}</span></p>
        ${imageHtml}
    `;

    document.getElementById("detailsModal").classList.remove("hidden");
    initIcons();
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

// ================= FORGOT PASSWORD & OTP RESET =================

const forgotPasswordModal = document.getElementById("forgotPasswordModal");
const forgotPasswordLink = document.getElementById("forgotPasswordLink");
const closeForgotModal = document.getElementById("closeForgotModal");
const forgotEmailForm = document.getElementById("forgotEmailForm");
const resetPasswordForm = document.getElementById("resetPasswordForm");
const forgotStep1 = document.getElementById("forgotStep1");
const forgotStep2 = document.getElementById("forgotStep2");
const sentOtpEmail = document.getElementById("sentOtpEmail");
const forgotOtpDevBanner = document.getElementById("forgotOtpDevBanner");
const resendOtpBtn = document.getElementById("resendOtpBtn");

let activeResetEmail = "";

if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener("click", function (e) {
        e.preventDefault();
        activeResetEmail = "";
        forgotEmailForm?.reset();
        resetPasswordForm?.reset();
        forgotStep1.classList.remove("hidden");
        forgotStep2.classList.add("hidden");
        forgotOtpDevBanner?.classList.add("hidden");
        forgotPasswordModal?.classList.remove("hidden");
        initIcons();
        document.getElementById("forgotEmail")?.focus();
    });
}

if (closeForgotModal) {
    closeForgotModal.addEventListener("click", function () {
        forgotPasswordModal?.classList.add("hidden");
    });
}

if (forgotPasswordModal) {
    forgotPasswordModal.addEventListener("click", function (e) {
        if (e.target === this) {
            this.classList.add("hidden");
        }
    });
}

if (forgotEmailForm) {
    forgotEmailForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        const email = document.getElementById("forgotEmail").value.trim();
        if (!email) return;

        const sendBtn = document.getElementById("sendOtpBtn");
        const origHtml = sendBtn.innerHTML;
        sendBtn.disabled = true;
        sendBtn.innerHTML = `<span>Sending OTP...</span>`;

        try {
            const res = await fetch(`${API_URL}/users/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            });
            const data = await res.json();

            if (!res.ok) {
                alert(data.message || "Failed to send verification OTP");
                return;
            }

            activeResetEmail = email;
            if (sentOtpEmail) sentOtpEmail.textContent = email;
            forgotStep1.classList.add("hidden");
            forgotStep2.classList.remove("hidden");
            initIcons();

            if (data.devOtp) {
                forgotOtpDevBanner.innerHTML = `
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span>Your 6-digit verification code is:</span>
                        <strong style="font-size:18px; letter-spacing:3px; color:#1d4ed8; font-family:monospace;">${data.devOtp}</strong>
                    </div>
                    <small style="color:#64748b; margin-top:4px; display:block;">(Auto-filled for testing. In production, this arrives in your email inbox.)</small>
                `;
                forgotOtpDevBanner.classList.remove("hidden");
                const otpInput = document.getElementById("resetOtpCode");
                if (otpInput) otpInput.value = data.devOtp;
            } else {
                forgotOtpDevBanner.classList.add("hidden");
            }

        } catch (err) {
            console.error("Forgot password error:", err);
            alert("Server connection failed. Make sure backend is running.");
        } finally {
            sendBtn.disabled = false;
            sendBtn.innerHTML = origHtml;
            initIcons();
        }
    });
}

if (resendOtpBtn) {
    resendOtpBtn.addEventListener("click", async function (e) {
        e.preventDefault();
        if (!activeResetEmail) return;

        resendOtpBtn.textContent = "Resending OTP...";
        try {
            const res = await fetch(`${API_URL}/users/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: activeResetEmail })
            });
            const data = await res.json();
            if (!res.ok) {
                alert(data.message || "Failed to resend OTP");
                return;
            }

            alert("A new verification code has been dispatched to your email!");
            if (data.devOtp) {
                forgotOtpDevBanner.innerHTML = `
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span>New verification code:</span>
                        <strong style="font-size:18px; letter-spacing:3px; color:#1d4ed8; font-family:monospace;">${data.devOtp}</strong>
                    </div>
                `;
                forgotOtpDevBanner.classList.remove("hidden");
                const otpInput = document.getElementById("resetOtpCode");
                if (otpInput) otpInput.value = data.devOtp;
            }
        } catch (err) {
            alert("Failed to resend code");
        } finally {
            resendOtpBtn.textContent = "Didn't receive code? Resend OTP";
        }
    });
}

if (resetPasswordForm) {
    resetPasswordForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const otp = document.getElementById("resetOtpCode").value.trim();
        const newPassword = document.getElementById("resetNewPassword").value.trim();
        const confirmPassword = document.getElementById("resetConfirmPassword").value.trim();

        if (!otp || !newPassword || !confirmPassword) {
            alert("Please fill all fields");
            return;
        }

        if (newPassword !== confirmPassword) {
            alert("Passwords do not match");
            return;
        }

        if (newPassword.length < 6) {
            alert("Password must be at least 6 characters");
            return;
        }

        const submitBtn = document.getElementById("submitResetBtn");
        const origHtml = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>Updating password...</span>`;

        try {
            const res = await fetch(`${API_URL}/users/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: activeResetEmail,
                    otp,
                    newPassword
                })
            });

            const data = await res.json();
            if (!res.ok) {
                alert(data.message || "Failed to reset password");
                return;
            }

            alert(data.message || "Password reset successfully! Please login with your new password.");
            forgotPasswordModal.classList.add("hidden");
            showLogin();
            const emailInput = document.getElementById("email");
            if (emailInput) {
                emailInput.value = activeResetEmail;
                document.getElementById("password")?.focus();
            }

        } catch (err) {
            console.error("Reset error:", err);
            alert("Failed to reset password");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = origHtml;
            initIcons();
        }
    });
}

// ================= DASHBOARD CHANGE PASSWORD & OTP =================

const sendChangeOtpBtn = document.getElementById("sendChangeOtpBtn");
const changeOtpStatus = document.getElementById("changeOtpStatus");
const changeOtpDevBanner = document.getElementById("changeOtpDevBanner");
const changePasswordForm = document.getElementById("changePasswordForm");

if (sendChangeOtpBtn) {
    sendChangeOtpBtn.addEventListener("click", async function () {
        if (!userToken) return;

        const origHtml = sendChangeOtpBtn.innerHTML;
        sendChangeOtpBtn.disabled = true;
        sendChangeOtpBtn.innerHTML = `<span>Sending OTP...</span>`;
        if (changeOtpStatus) changeOtpStatus.style.display = "none";

        try {
            const res = await fetch(`${API_URL}/users/send-change-otp`, {
                method: "POST",
                headers: getAuthHeaders()
            });

            const data = await res.json();
            if (!res.ok) {
                alert(data.message || "Failed to send security OTP");
                return;
            }

            if (changeOtpStatus) {
                changeOtpStatus.textContent = "OTP Sent to your email!";
                changeOtpStatus.style.display = "inline";
            }

            if (data.devOtp && changeOtpDevBanner) {
                changeOtpDevBanner.innerHTML = `
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span>Security OTP Code:</span>
                        <strong style="font-size:16px; letter-spacing:2px; color:#1d4ed8; font-family:monospace;">${data.devOtp}</strong>
                        <small style="color:#64748b;">(Pre-filled for testing)</small>
                    </div>
                `;
                changeOtpDevBanner.classList.remove("hidden");
                const otpInput = document.getElementById("changeOtpInput");
                if (otpInput) otpInput.value = data.devOtp;
            }

        } catch (err) {
            console.error("Send change OTP error:", err);
            alert("Failed to dispatch security code");
        } finally {
            sendChangeOtpBtn.disabled = false;
            sendChangeOtpBtn.innerHTML = origHtml;
            initIcons();
        }
    });
}

if (changePasswordForm) {
    changePasswordForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const otp = document.getElementById("changeOtpInput").value.trim();
        const currentPassword = document.getElementById("changeCurrentPassword").value.trim();
        const newPassword = document.getElementById("changeNewPassword").value.trim();
        const confirmPassword = document.getElementById("changeConfirmPassword").value.trim();

        if (!newPassword || !confirmPassword) {
            alert("Please enter and confirm your new password");
            return;
        }

        if (newPassword !== confirmPassword) {
            alert("New passwords do not match");
            return;
        }

        if (newPassword.length < 6) {
            alert("Password must be at least 6 characters");
            return;
        }

        if (!otp && !currentPassword) {
            alert("Please click 'Send OTP to My Email' or provide your Current Password to authorize this change.");
            return;
        }

        const updateBtn = document.getElementById("updatePasswordBtn");
        const origHtml = updateBtn.innerHTML;
        updateBtn.disabled = true;
        updateBtn.innerHTML = `<span>Updating password...</span>`;

        try {
            const res = await fetch(`${API_URL}/users/change-password`, {
                method: "POST",
                headers: {
                    ...getAuthHeaders(),
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    otp: otp || undefined,
                    currentPassword: currentPassword || undefined,
                    newPassword
                })
            });

            const data = await res.json();
            if (!res.ok) {
                alert(data.message || "Failed to update password");
                return;
            }

            alert("Password updated successfully!");
            changePasswordForm.reset();
            changeOtpDevBanner?.classList.add("hidden");
            if (changeOtpStatus) changeOtpStatus.style.display = "none";

        } catch (err) {
            console.error("Change password error:", err);
            alert("Failed to update password");
        } finally {
            updateBtn.disabled = false;
            updateBtn.innerHTML = origHtml;
            initIcons();
        }
    });
}

// Initialize Google OAuth on startup
initGoogleAuth();