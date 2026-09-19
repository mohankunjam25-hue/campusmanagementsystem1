const API_URL = "http://localhost:5000/api/complaints";


// Store all complaints
let complaints = [];


// DOM Elements
const complaintsTableBody =
    document.getElementById("complaintsTableBody");

const totalComplaints =
    document.getElementById("totalComplaints");

const pendingComplaints =
    document.getElementById("pendingComplaints");

const inProgressComplaints =
    document.getElementById("inProgressComplaints");

const resolvedComplaints =
    document.getElementById("resolvedComplaints");

const searchComplaint =
    document.getElementById("searchComplaint");

const categoryFilter =
    document.getElementById("categoryFilter");

const statusFilter =
    document.getElementById("statusFilter");

const complaintDetailsSection =
    document.getElementById("complaintDetailsSection");

const complaintDetails =
    document.getElementById("complaintDetails");

const closeDetailsBtn =
    document.getElementById("closeDetailsBtn");

const updateComplaintForm =
    document.getElementById("updateComplaintForm");

const selectedComplaintId =
    document.getElementById("selectedComplaintId");

const updateStatus =
    document.getElementById("updateStatus");

const resolutionMessage =
    document.getElementById("resolutionMessage");

const logoutBtn =
    document.getElementById("logoutBtn");


// ================================
// Get All Complaints
// ================================

async function fetchComplaints() {

    try {

        complaintsTableBody.innerHTML = `
            <tr>
                <td colspan="7">
                    Loading complaints...
                </td>
            </tr>
        `;


        const response = await fetch(API_URL);


        if (!response.ok) {
            throw new Error("Failed to fetch complaints");
        }


        const data = await response.json();


        complaints = data.complaints || [];


        updateStatistics();

        renderComplaints(complaints);

    } catch (error) {

        console.error(error);

        complaintsTableBody.innerHTML = `
            <tr>
                <td colspan="7">
                    Failed to load complaints.
                </td>
            </tr>
        `;
    }
}


// ================================
// Update Statistics
// ================================

function updateStatistics() {

    const total = complaints.length;


    const pending = complaints.filter(
        complaint => complaint.status === "Pending"
    ).length;


    const inProgress = complaints.filter(
        complaint => complaint.status === "In Progress"
    ).length;


    const resolved = complaints.filter(
        complaint => complaint.status === "Resolved"
    ).length;


    totalComplaints.textContent = total;

    pendingComplaints.textContent = pending;

    inProgressComplaints.textContent = inProgress;

    resolvedComplaints.textContent = resolved;
}


// ================================
// Render Complaints
// ================================

function renderComplaints(complaintsToRender) {

    complaintsTableBody.innerHTML = "";


    if (complaintsToRender.length === 0) {

        complaintsTableBody.innerHTML = `
            <tr>
                <td colspan="7">
                    No complaints found.
                </td>
            </tr>
        `;

        return;
    }


    complaintsToRender.forEach(complaint => {

        const row = document.createElement("tr");


        const studentName =
            complaint.reportedBy?.name || "Unknown";


        const createdDate =
            new Date(complaint.createdAt)
                .toLocaleDateString();


        row.innerHTML = `

            <td>
                ${ escapeHTML(complaint.title) }
            </td>

            <td>
                ${ escapeHTML(complaint.category) }
            </td>

            <td>
                ${ escapeHTML(studentName) }
            </td>

            <td>
                ${ escapeHTML(complaint.location) }
            </td>

            <td>
                <span class="status status-${ getStatusClass(complaint.status) }">
                    ${ escapeHTML(complaint.status) }
                </span>
            </td>

            <td>
                ${ createdDate }
            </td>

            <td>

                <button
                    type="button"
                    class="view-btn"
                    data-id="${ complaint._id }"
                >
                    View
                </button>

            </td>
        `;


        complaintsTableBody.appendChild(row);

    });


    // Add event listeners to View buttons
    const viewButtons =
        document.querySelectorAll(".view-btn");


    viewButtons.forEach(button => {

        button.addEventListener("click", () => {

            const complaintId =
                button.dataset.id;

            fetchComplaintDetails(complaintId);

        });

    });
}


// ================================
// Get Complaint Details
// ================================

async function fetchComplaintDetails(id) {

    try {

        const response =
            await fetch(`${ API_URL }/${ id }`);


        if (!response.ok) {
            throw new Error("Complaint not found");
        }


        const data =
            await response.json();


        const complaint =
            data.complaint;


        showComplaintDetails(complaint);

    } catch (error) {

        console.error(error);

        alert("Failed to load complaint details.");
    }
}


// ================================
// Show Complaint Details
// ================================

function showComplaintDetails(complaint) {

    const studentName =
        complaint.reportedBy?.name || "Unknown";


    const studentEmail =
        complaint.reportedBy?.email || "Not available";


    const createdDate =
        new Date(complaint.createdAt)
            .toLocaleString();


    complaintDetails.innerHTML = `

        <div>

            <h3>
                ${ escapeHTML(complaint.title) }
            </h3>

            <p>
                <strong>Category:</strong>
                ${ escapeHTML(complaint.category) }
            </p>

            <p>
                <strong>Location:</strong>
                ${ escapeHTML(complaint.location) }
            </p>

            <p>
                <strong>Student:</strong>
                ${ escapeHTML(studentName) }
            </p>

            <p>
                <strong>Email:</strong>
                ${ escapeHTML(studentEmail) }
            </p>

            <p>
                <strong>Description:</strong>
                ${ escapeHTML(complaint.description) }
            </p>

            <p>
                <strong>Current Status:</strong>
                ${ escapeHTML(complaint.status) }
            </p>

            <p>
                <strong>Created At:</strong>
                ${ createdDate }
            </p>

            ${ complaint.resolutionMessage
            ? `
                        <p>
                            <strong>Resolution:</strong>
                            ${ escapeHTML(
                complaint.resolutionMessage
            ) }
                        </p>
                    `
            : ""
        }

        </div>
    `;


    // Set current complaint ID
    selectedComplaintId.value =
        complaint._id;


    // Set current status
    updateStatus.value =
        complaint.status;


    // Set resolution message
    resolutionMessage.value =
        complaint.resolutionMessage || "";


    // Show details section
    complaintDetailsSection.hidden = false;


    // Scroll to details
    complaintDetailsSection.scrollIntoView({
        behavior: "smooth"
    });
}


// ================================
// Update Complaint
// ================================

updateComplaintForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        const complaintId =
            selectedComplaintId.value;


        const status =
            updateStatus.value;


        const message =
            resolutionMessage.value.trim();


        try {

            const response = await fetch(
                `${ API_URL }/${ complaintId }`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        status: status,
                        resolutionMessage: message
                    })
                }
            );


            const data =
                await response.json();


            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Failed to update complaint"
                );
            }


            alert(
                "Complaint updated successfully."
            );


            // Reload complaints
            await fetchComplaints();


            // Reload updated details
            await fetchComplaintDetails(
                complaintId
            );

        } catch (error) {

            console.error(error);

            alert(error.message);
        }

    }
);


// ================================
// Search + Filter
// ================================

function applyFilters() {

    const searchValue =
        searchComplaint.value
            .toLowerCase()
            .trim();


    const categoryValue =
        categoryFilter.value;


    const statusValue =
        statusFilter.value;


    const filteredComplaints =
        complaints.filter(complaint => {

            const studentName =
                complaint.reportedBy?.name || "";


            const matchesSearch =
                complaint.title
                    .toLowerCase()
                    .includes(searchValue)

                ||

                complaint.location
                    .toLowerCase()
                    .includes(searchValue)

                ||

                studentName
                    .toLowerCase()
                    .includes(searchValue);


            const matchesCategory =
                !categoryValue ||
                complaint.category === categoryValue;


            const matchesStatus =
                !statusValue ||
                complaint.status === statusValue;


            return (
                matchesSearch &&
                matchesCategory &&
                matchesStatus
            );

        });


    renderComplaints(filteredComplaints);
}


// Search
searchComplaint.addEventListener(
    "input",
    applyFilters
);


// Category filter
categoryFilter.addEventListener(
    "change",
    applyFilters
);


// Status filter
statusFilter.addEventListener(
    "change",
    applyFilters
);


// ================================
// Close Complaint Details
// ================================

closeDetailsBtn.addEventListener(
    "click",
    () => {

        complaintDetailsSection.hidden = true;

    }
);


// ================================
// Logout
// ================================

logoutBtn.addEventListener(
    "click",
    () => {

        localStorage.removeItem("token");
        localStorage.removeItem("user");

        window.location.href =
            "../login.html";
    }
);


// ================================
// Status CSS Class
// ================================

function getStatusClass(status) {

    if (status === "Pending") {
        return "pending";
    }

    if (status === "In Progress") {
        return "progress";
    }

    if (status === "Resolved") {
        return "resolved";
    }

    return "unknown";
}


// ================================
// Basic HTML Escape
// ================================

function escapeHTML(value) {

    if (value === null || value === undefined) {
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
// Initial Load
// ================================

fetchComplaints();