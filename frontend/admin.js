// ================================
// CAMPUS CARE - ADMIN JS
// ================================

// Admin login details
const ADMIN_EMAIL = "admin@campuscare.com";
const ADMIN_PASSWORD = "admin123";


// ================================
// ELEMENTS
// ================================

const adminLogin = document.getElementById("adminLogin");
const adminDashboard = document.getElementById("adminDashboard");

const adminLoginForm = document.getElementById("adminLoginForm");
const adminEmail = document.getElementById("adminEmail");
const adminPassword = document.getElementById("adminPassword");

const adminLogout = document.getElementById("adminLogout");


// ================================
// LOGIN
// ================================

adminLoginForm.addEventListener("submit", function (e) {

    e.preventDefault();

    const email = adminEmail.value.trim();
    const password = adminPassword.value.trim();

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {

        // Save admin login
        sessionStorage.setItem("adminLoggedIn", "true");

        showAdminDashboard();

    } else {

        alert("Invalid admin email or password!");

    }

});


// ================================
// SHOW DASHBOARD
// ================================

function showAdminDashboard() {

    adminLogin.style.display = "none";
    adminDashboard.style.display = "flex";

    loadAdminData();

}


// ================================
// LOGOUT
// ================================

adminLogout.addEventListener("click", function () {

    sessionStorage.removeItem("adminLoggedIn");

    adminDashboard.style.display = "none";
    adminLogin.style.display = "flex";

    adminLoginForm.reset();

});


// ================================
// GET COMPLAINTS
// ================================

function getComplaints() {

    return JSON.parse(
        localStorage.getItem("campusComplaints")
    ) || [];

}


// ================================
// LOAD ADMIN DATA
// ================================

function loadAdminData() {

    const complaints = getComplaints();

    updateStats(complaints);

    showRecentComplaints(complaints);

    showAllComplaints(complaints);

}


// ================================
// UPDATE STATS
// ================================

function updateStats(complaints) {

    const total = complaints.length;

    const pending = complaints.filter(
        complaint => complaint.status === "Pending"
    ).length;

    const progress = complaints.filter(
        complaint => complaint.status === "In Progress"
    ).length;

    const resolved = complaints.filter(
        complaint => complaint.status === "Resolved"
    ).length;


    document.getElementById("adminTotal").textContent = total;

    document.getElementById("adminPending").textContent = pending;

    document.getElementById("adminProgress").textContent = progress;

    document.getElementById("adminResolved").textContent = resolved;

}


// ================================
// RECENT COMPLAINTS
// ================================

function showRecentComplaints(complaints) {

    const container =
        document.getElementById("adminRecentComplaints");

    container.innerHTML = "";


    if (complaints.length === 0) {

        container.innerHTML = `
            <div class="admin-complaint-card">
                <h3>No Complaints Yet</h3>
                <p>
                    Students have not submitted any complaints.
                </p>
            </div>
        `;

        return;
    }


    // Latest 5 complaints
    const recent = [...complaints]
        .reverse()
        .slice(0, 5);


    recent.forEach(complaint => {

        container.innerHTML += createComplaintCard(
            complaint,
            false
        );

    });

}


// ================================
// ALL COMPLAINTS
// ================================

function showAllComplaints(complaints = getComplaints()) {

    const container =
        document.getElementById("adminComplaintList");

    container.innerHTML = "";


    if (complaints.length === 0) {

        container.innerHTML = `
            <div class="admin-complaint-card">
                <h3>No Complaints Found</h3>
                <p>
                    There are no complaints to display.
                </p>
            </div>
        `;

        return;
    }


    [...complaints]
        .reverse()
        .forEach(complaint => {

            container.innerHTML += createComplaintCard(
                complaint,
                true
            );

        });

}


// ================================
// COMPLAINT CARD
// ================================

function createComplaintCard(complaint, showUpdate) {

    let statusClass = "pending";

    if (complaint.status === "In Progress") {
        statusClass = "progress";
    }

    if (complaint.status === "Resolved") {
        statusClass = "resolved";
    }


    return `
        <div class="admin-complaint-card">

            <div class="admin-complaint-top">

                <div>

                    <h3>
                        ${escapeHTML(complaint.title)}
                    </h3>

                    <p>
                        ${escapeHTML(complaint.description)}
                    </p>

                </div>

                <span class="status ${statusClass}">
                    ${complaint.status}
                </span>

            </div>


            <div class="complaint-info">

                <span>
                    👤 ${escapeHTML(complaint.name || "Unknown")}
                </span>

                <span>
                    📂 ${escapeHTML(complaint.category)}
                </span>

                <span>
                    📍 ${escapeHTML(complaint.location)}
                </span>

                <span>
                    📅 ${escapeHTML(complaint.date || "")}
                </span>

            </div>


            ${
                showUpdate
                ?
                `
                <div class="admin-update">

                    <select
                        class="status-select"
                        data-id="${complaint.id}"
                    >

                        <option
                            value="Pending"
                            ${complaint.status === "Pending" ? "selected" : ""}
                        >
                            Pending
                        </option>

                        <option
                            value="In Progress"
                            ${complaint.status === "In Progress" ? "selected" : ""}
                        >
                            In Progress
                        </option>

                        <option
                            value="Resolved"
                            ${complaint.status === "Resolved" ? "selected" : ""}
                        >
                            Resolved
                        </option>

                    </select>


                    <button
                        onclick="updateComplaint('${complaint.id}')"
                    >
                        Update Status
                    </button>

                </div>
                `
                :
                ""
            }

        </div>
    `;
}


// ================================
// UPDATE STATUS
// ================================

function updateComplaint(id) {

    const complaints = getComplaints();

    const select =
        document.querySelector(
            `.status-select[data-id="${id}"]`
        );


    if (!select) {
        return;
    }


    const newStatus = select.value;


    const complaintIndex = complaints.findIndex(
        complaint => String(complaint.id) === String(id)
    );


    if (complaintIndex === -1) {
        alert("Complaint not found!");
        return;
    }


    complaints[complaintIndex].status = newStatus;


    localStorage.setItem(
        "campusComplaints",
        JSON.stringify(complaints)
    );


    alert("Complaint status updated!");


    loadAdminData();

}


// ================================
// NAVIGATION
// ================================

const navLinks =
    document.querySelectorAll(".admin-nav a");


navLinks.forEach(link => {

    link.addEventListener("click", function (e) {

        e.preventDefault();


        navLinks.forEach(item => {
            item.classList.remove("active");
        });


        this.classList.add("active");


        const sectionId =
            this.getAttribute("data-section");


        document.querySelectorAll(
            ".admin-main section"
        ).forEach(section => {

            section.style.display = "none";

        });


        const section =
            document.getElementById(sectionId);


        if (section) {
            section.style.display = "block";
        }


        if (sectionId === "allComplaints") {

            showAllComplaints(
                getComplaints()
            );

        }

    });

});


// ================================
// SEARCH
// ================================

const adminSearch =
    document.getElementById("adminSearch");

const adminStatus =
    document.getElementById("adminStatus");

const adminCategory =
    document.getElementById("adminCategory");


function filterComplaints() {

    const complaints = getComplaints();


    const search =
        adminSearch.value.toLowerCase().trim();


    const status =
        adminStatus.value;


    const category =
        adminCategory.value;


    const filtered = complaints.filter(
        complaint => {

            const matchesSearch =
                complaint.title
                    .toLowerCase()
                    .includes(search) ||

                complaint.description
                    .toLowerCase()
                    .includes(search) ||

                complaint.name
                    .toLowerCase()
                    .includes(search);


            const matchesStatus =
                status === "all" ||
                complaint.status === status;


            const matchesCategory =
                category === "all" ||
                complaint.category === category;


            return (
                matchesSearch &&
                matchesStatus &&
                matchesCategory
            );

        }
    );


    showAllComplaints(filtered);

}


adminSearch.addEventListener(
    "input",
    filterComplaints
);

adminStatus.addEventListener(
    "change",
    filterComplaints
);

adminCategory.addEventListener(
    "change",
    filterComplaints
);


// ================================
// HTML SECURITY
// ================================

function escapeHTML(value) {

    if (!value) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ================================
// ADMIN LOGIN CHECK
// ================================


adminDashboard.style.display = "none";
adminLogin.style.display = "flex";