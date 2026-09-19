
let currentUser = JSON.parse(localStorage.getItem("campusUser"));

const API_URL = "http://localhost:5000/api";


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

            console.log("Login response:", data);

            if (!response.ok) {
                alert(data.message || "Login failed");
                return;
            }

            currentUser = data.user;

            localStorage.setItem(
                "campusUser",
                JSON.stringify(data.user)
            );

            alert("Login successful!");

            showDashboard(currentUser);

        } catch (error) {
            console.error("Login Error:", error);

            alert(
                "Server connection failed. Make sure backend is running on port 5000."
            );
        }
    });
}


// ================= REGISTER =================

const registerForm = document.getElementById("registerForm");

if (registerForm) {
    registerForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const name = document
            .getElementById("registerName")
            .value
            .trim();

        const email = document
            .getElementById("registerEmail")
            .value
            .trim();

        const password = document
            .getElementById("registerPassword")
            .value
            .trim();

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
                body: JSON.stringify({
                    name: name,
                    email: email,
                    password: password
                })
            });

            const data = await response.json();

            console.log("Register response:", data);

            if (!response.ok) {
                alert(data.message || "Registration failed");
                return;
            }

            alert("Registration successful! Please login.");

            registerForm.reset();

            showLogin();

        } catch (error) {
            console.error("Register Error:", error);

            alert(
                "Server connection failed. Make sure backend is running."
            );
        }
    });
}


// ================= SHOW DASHBOARD =================

function showDashboard(user) {
    if (!user) {
        return;
    }

    document
        .getElementById("loginPage")
        .classList
        .add("hidden");

    document
        .getElementById("registerPage")
        .classList
        .add("hidden");

    document
        .getElementById("dashboardPage")
        .classList
        .remove("hidden");

    document.getElementById("welcomeName").textContent = user.name;

    document.getElementById("sidebarName").textContent = user.name;

    document.getElementById("sidebarEmail").textContent = user.email;

    const avatar = user.name.charAt(0).toUpperCase();

    document.getElementById("sidebarAvatar").textContent = avatar;

    document.getElementById("topAvatar").textContent = avatar;

    document.getElementById("complaintName").value = user.name;

    loadComplaints();
}


// ================= SHOW LOGIN =================

function showLogin() {
    document
        .getElementById("registerPage")
        .classList
        .add("hidden");

    document
        .getElementById("dashboardPage")
        .classList
        .add("hidden");

    document
        .getElementById("loginPage")
        .classList
        .remove("hidden");
}


// ================= REGISTER PAGE =================

const registerBtn = document.getElementById("registerBtn");

if (registerBtn) {
    registerBtn.addEventListener("click", function () {
        document
            .getElementById("loginPage")
            .classList
            .add("hidden");

        document
            .getElementById("registerPage")
            .classList
            .remove("hidden");
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

        currentUser = null;

        document
            .getElementById("dashboardPage")
            .classList
            .add("hidden");

        document
            .getElementById("loginPage")
            .classList
            .remove("hidden");
    });
}


// ================= NAVIGATION =================

function navigateTo(page) {
    const overviewSection = document.getElementById("overviewSection");
    if (overviewSection) {
        overviewSection.classList.add("hidden");
    }

    const newComplaintSection = document.getElementById("newComplaintSection");
    if (newComplaintSection) {
        newComplaintSection.classList.add("hidden");
    }

    const selectedSection =
        document.getElementById(page + "Section");

    if (selectedSection) {
        selectedSection.classList.remove("hidden");
    }

    const titles = {
        overview: "Overview",
        newComplaint: "New Complaint"
    };

    document.getElementById("pageTitle").textContent =
        titles[page] || "Dashboard";

    document
        .querySelectorAll(".nav-link")
        .forEach(function (link) {
            link.classList.remove("active");
        });

    const activeLink = document.querySelector(
        `[data-section="${page}"]`
    );

    if (activeLink) {
        activeLink.classList.add("active");
    }
}


// ================= NAV LINKS =================

document
    .querySelectorAll(".nav-link")
    .forEach(function (link) {

        link.onclick = function (e) {
            e.preventDefault();

            navigateTo(link.dataset.section);
        };

    });


// ================= SUBMIT COMPLAINT =================

const complaintForm = document.getElementById("complaintForm");

if (complaintForm) {

    complaintForm.addEventListener("submit", async function (e) {

        e.preventDefault();

        if (!currentUser) {
            alert("Please login first.");
            return;
        }

        const title = document
            .getElementById("complaintTitle")
            .value
            .trim();

        const description = document
            .getElementById("complaintDescription")
            .value
            .trim();

        const category = document
            .getElementById("complaintCategory")
            .value;

        const location = document
            .getElementById("complaintLocation")
            .value
            .trim();

        if (!title || !description || !category || !location) {
            alert("Please fill all complaint fields");
            return;
        }

        try {

            const response = await fetch(`${API_URL}/complaints`, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    title: title,
                    description: description,
                    category: category,
                    location: location,
                    reportedBy: currentUser.id
                })
            });

            const data = await response.json();

            console.log("Complaint response:", data);

            if (!response.ok) {
                alert(data.message || "Complaint submission failed");
                return;
            }

            alert("Complaint submitted successfully!");

            complaintForm.reset();

            document.getElementById("complaintName").value =
                currentUser.name;

            document.getElementById("charCount").textContent = "0";

            await loadComplaints();

            navigateTo("overview");

        } catch (error) {

            console.error("Complaint Error:", error);

            alert(
                "Server connection failed. Make sure backend is running."
            );
        }

    });
}


// ================= LOAD COMPLAINTS =================

async function loadComplaints() {

    if (!currentUser) {
        return;
    }

    try {

        const response = await fetch(
            `${API_URL}/complaints`
        );

        const data = await response.json();

        if (!response.ok) {
            console.log(data);
            return;
        }

        const allComplaints = data.complaints || [];

        const userComplaints = allComplaints.filter(
            function (complaint) {
                const reportedBy = complaint.reportedBy;

                if (!reportedBy) {
                    return false;
                }

                const reportedById = typeof reportedBy === "object"
                    ? (reportedBy._id || reportedBy.id)
                    : reportedBy;

                return String(reportedById) === String(currentUser.id);
            }
        );


        // Statistics

        document.getElementById("totalComplaints").textContent =
            userComplaints.length;

        document.getElementById("pendingComplaints").textContent =
            userComplaints.filter(
                c => c.status === "Pending"
            ).length;

        document.getElementById("progressComplaints").textContent =
            userComplaints.filter(
                c => c.status === "In Progress"
            ).length;

        document.getElementById("resolvedComplaints").textContent =
            userComplaints.filter(
                c => c.status === "Resolved"
            ).length;


        // Recent complaints

        const recentComplaints =
            document.getElementById("recentComplaints");

        if (userComplaints.length === 0) {

            recentComplaints.innerHTML = `
                <div class="empty-state">
                    <h3>No complaints yet</h3>
                    <p>Create your first complaint.</p>
                </div>
            `;

        } else {

            recentComplaints.innerHTML =
                userComplaints
                    .slice(0, 5)
                    .map(complaintCard)
                    .join("");
        }


        filterComplaints(userComplaints);

    } catch (error) {

        console.error(
            "Load Complaints Error:",
            error
        );

    }
}


// ================= FILTER =================

function filterComplaints(data) {

    const searchInput =
        document.getElementById("searchComplaint");

    const statusInput =
        document.getElementById("statusFilter");

    const categoryInput =
        document.getElementById("categoryFilter");

    if (!searchInput || !statusInput || !categoryInput) {
        return;
    }

    const search =
        searchInput.value.toLowerCase();

    const status =
        statusInput.value;

    const category =
        categoryInput.value;


    const result = data.filter(
        function (c) {

            return (
                c.title
                    .toLowerCase()
                    .includes(search)

                &&

                (
                    status === "all" ||
                    c.status === status
                )

                &&

                (
                    category === "all" ||
                    c.category === category
                )
            );

        }
    );


    const complaintsList =
        document.getElementById("complaintsList");

    if (result.length === 0) {

        complaintsList.innerHTML = `
            <div class="empty-state">
                <h3>No complaints found</h3>
                <p>Your complaints will appear here.</p>
            </div>
        `;

    } else {

        complaintsList.innerHTML =
            result
                .map(complaintCard)
                .join("");
    }
}


// ================= COMPLAINT CARD =================

function complaintCard(c) {

    const id = c._id || c.id;

    return `
        <div
            class="complaint-card"
            onclick="showDetails('${id}')"
        >

            <small>
                ${c.category}
            </small>

            <h3>
                ${c.title}
            </h3>

            <p>
                📍 ${c.location}
            </p>

            <p>
                ${c.description}
            </p>

            <b>
                ${c.status}
            </b>

        </div>
    `;
}


// ================= SEARCH =================

const searchComplaint =
    document.getElementById("searchComplaint");

if (searchComplaint) {

    searchComplaint.oninput = function () {

        loadComplaints();

    };
}


const statusFilter =
    document.getElementById("statusFilter");

if (statusFilter) {

    statusFilter.onchange = function () {

        loadComplaints();

    };
}


const categoryFilter =
    document.getElementById("categoryFilter");

if (categoryFilter) {

    categoryFilter.onchange = function () {

        loadComplaints();

    };
}


// ================= CHARACTER COUNT =================

const complaintDescription =
    document.getElementById("complaintDescription");

if (complaintDescription) {

    complaintDescription.oninput = function () {

        document.getElementById("charCount").textContent =
            this.value.length;

    };
}


// ================= DETAILS =================

async function showDetails(id) {

    try {

        const response = await fetch(
            `${API_URL}/complaints/${id}`
        );

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || "Complaint not found");
            return;
        }

        const complaint = data.complaint;

        document.getElementById("modalContent").innerHTML = `

            <h2>
                ${complaint.title}
            </h2>

            <p>
                <b>Category:</b>
                ${complaint.category}
            </p>

            <p>
                <b>Location:</b>
                ${complaint.location}
            </p>

            <p>
                <b>Status:</b>
                ${complaint.status}
            </p>

            <p>
                <b>Description:</b>
                ${complaint.description}
            </p>

            <p>
                <b>Resolution:</b>
                ${complaint.resolutionMessage || "Not available"}
            </p>

        `;

        document
            .getElementById("detailsModal")
            .classList
            .remove("hidden");

    } catch (error) {

        console.error(
            "Details Error:",
            error
        );

    }
}


// ================= CLOSE MODAL =================

const closeModal =
    document.getElementById("closeModal");

if (closeModal) {

    closeModal.onclick = function () {

        document
            .getElementById("detailsModal")
            .classList
            .add("hidden");

    };
}


const detailsModal =
    document.getElementById("detailsModal");

if (detailsModal) {

    detailsModal.onclick = function (e) {

        if (e.target === this) {
            this.classList.add("hidden");
        }

    };
}


// ================= MOBILE MENU =================

const mobileMenu =
    document.getElementById("mobileMenu");

if (mobileMenu) {

    mobileMenu.onclick = function () {

        document
            .querySelector(".sidebar")
            .classList
            .toggle("open");

    };
}


// ================= AUTO LOGIN =================

if (currentUser) {
    showDashboard(currentUser);
}