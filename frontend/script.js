<<<<<<< HEAD
=======
// ================= DATA =================

let currentUser =
    JSON.parse(localStorage.getItem("campusUser"));

let complaints =
    JSON.parse(localStorage.getItem("campusComplaints")) || [];


// ================= LOGIN =================

document.getElementById("loginForm").addEventListener("submit", function(e) {

    e.preventDefault();

    let email = document.getElementById("email").value;
    let password = document.getElementById("password").value;

    if (email === "" || password === "") {
        alert("Please enter email and password");
        return;
    }

    currentUser = {
        name: email.split("@")[0],
        email: email,
        role: "student"
    };

    localStorage.setItem(
        "campusUser",
        JSON.stringify(currentUser)
    );

    showDashboard();
});


// ================= STUDENT DEMO =================

document.getElementById("studentDemo").onclick = function() {

    currentUser = {
        name: "Vikky",
        email: "vikky@student.com",
        role: "student"
    };

    localStorage.setItem(
        "campusUser",
        JSON.stringify(currentUser)
    );

    showDashboard();
};


// ================= ADMIN PAGE =================

document.getElementById("adminDemo").onclick = function() {

    window.location.href = "admin.html";

};


// ================= SHOW DASHBOARD =================

function showDashboard() {

    document.getElementById("loginPage")
        .classList.add("hidden");

    document.getElementById("dashboardPage")
        .classList.remove("hidden");

    document.getElementById("welcomeName")
        .textContent = currentUser.name;

    document.getElementById("sidebarName")
        .textContent = currentUser.name;

    document.getElementById("sidebarEmail")
        .textContent = currentUser.email;

    document.getElementById("complaintName")
        .value = currentUser.name;

    let letter =
        currentUser.name.charAt(0).toUpperCase();

    document.getElementById("sidebarAvatar")
        .textContent = letter;

    document.getElementById("topAvatar")
        .textContent = letter;

    loadComplaints();
}


// ================= LOGOUT =================

document.getElementById("logoutBtn").onclick = function() {

    localStorage.removeItem("campusUser");

    location.reload();

};


// ================= NAVIGATION =================

function navigateTo(page) {

    document.getElementById("overviewSection")
        .classList.add("hidden");

    document.getElementById("complaintsSection")
        .classList.add("hidden");

    document.getElementById("newComplaintSection")
        .classList.add("hidden");

    document.getElementById(page + "Section")
        .classList.remove("hidden");

    let titles = {

        overview: "Overview",

        complaints: "My Complaints",

        newComplaint: "New Complaint"

    };

    document.getElementById("pageTitle")
        .textContent = titles[page];

    document.querySelectorAll(".nav-link")
        .forEach(function(link) {

            link.classList.remove("active");

        });

    let activeLink = document.querySelector(
        '[data-section="' + page + '"]'
    );

    if (activeLink) {
        activeLink.classList.add("active");
    }
}


// ================= NAV LINKS =================

document.querySelectorAll(".nav-link")
    .forEach(function(link) {

        link.onclick = function(e) {

            e.preventDefault();

            navigateTo(
                link.dataset.section
            );

        };

    });


// ================= OTHER BUTTONS =================

document.querySelectorAll("[data-go]")
    .forEach(function(button) {

        button.onclick = function() {

            navigateTo(
                button.dataset.go
            );

        };

    });


// ================= SUBMIT COMPLAINT =================

document.getElementById("complaintForm")
    .addEventListener("submit", function(e) {

        e.preventDefault();

        let complaint = {

            id: Date.now(),

            name: currentUser.name,

            email: currentUser.email,

            title:
                document.getElementById(
                    "complaintTitle"
                ).value,

            category:
                document.getElementById(
                    "complaintCategory"
                ).value,

            location:
                document.getElementById(
                    "complaintLocation"
                ).value,

            description:
                document.getElementById(
                    "complaintDescription"
                ).value,

            status: "Pending",

            date: new Date().toLocaleDateString()

        };

        complaints.unshift(complaint);

        localStorage.setItem(
            "campusComplaints",
            JSON.stringify(complaints)
        );

        this.reset();

        document.getElementById(
            "complaintName"
        ).value = currentUser.name;

        document.getElementById(
            "charCount"
        ).textContent = "0";

        alert("Complaint submitted successfully!");

        loadComplaints();

        navigateTo("overview");

    });


// ================= LOAD COMPLAINTS =================

function loadComplaints() {

    let userComplaints =
        complaints.filter(function(complaint) {

            return complaint.email ===
                currentUser.email;

        });


    document.getElementById(
        "totalComplaints"
    ).textContent =
        userComplaints.length;


    document.getElementById(
        "pendingComplaints"
    ).textContent =
        userComplaints.filter(function(c) {

            return c.status === "Pending";

        }).length;


    document.getElementById(
        "progressComplaints"
    ).textContent =
        userComplaints.filter(function(c) {

            return c.status === "In Progress";

        }).length;


    document.getElementById(
        "resolvedComplaints"
    ).textContent =
        userComplaints.filter(function(c) {

            return c.status === "Resolved";

        }).length;


    document.getElementById(
        "recentComplaints"
    ).innerHTML =
        userComplaints
            .slice(0, 5)
            .map(complaintCard)
            .join("");


    filterComplaints(userComplaints);
}


// ================= FILTER =================

function filterComplaints(data) {

    let search =
        document.getElementById(
            "searchComplaint"
        ).value.toLowerCase();

    let status =
        document.getElementById(
            "statusFilter"
        ).value;

    let category =
        document.getElementById(
            "categoryFilter"
        ).value;


    let result = data.filter(function(c) {

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

    });


    document.getElementById(
        "complaintsList"
    ).innerHTML =
        result
            .map(complaintCard)
            .join("");
}


// ================= COMPLAINT CARD =================

function complaintCard(c) {

    return `

        <div
            class="complaint-card"
            onclick="showDetails(${c.id})"
        >

            <small>${c.category}</small>

            <h3>${c.title}</h3>

            <p>📍 ${c.location}</p>

            <p>${c.description}</p>

            <b>${c.status}</b>

        </div>

    `;
}


// ================= SEARCH =================

document.getElementById(
    "searchComplaint"
).oninput = function() {

    loadComplaints();

};


document.getElementById(
    "statusFilter"
).onchange = function() {

    loadComplaints();

};


document.getElementById(
    "categoryFilter"
).onchange = function() {

    loadComplaints();

};


// ================= CHARACTER COUNT =================

document.getElementById(
    "complaintDescription"
).oninput = function() {

    document.getElementById(
        "charCount"
    ).textContent = this.value.length;

};


// ================= DETAILS =================

function showDetails(id) {

    let complaint =
        complaints.find(function(c) {

            return c.id === id;

        });

    if (!complaint) {
        return;
    }

    document.getElementById(
        "modalContent"
    ).innerHTML = `

        <h2>${complaint.title}</h2>

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
            <b>Date:</b>
            ${complaint.date}
        </p>

        <p>
            <b>Description:</b>
            ${complaint.description}
        </p>

    `;

    document.getElementById(
        "detailsModal"
    ).classList.remove("hidden");
}


// ================= CLOSE MODAL =================

document.getElementById(
    "closeModal"
).onclick = function() {

    document.getElementById(
        "detailsModal"
    ).classList.add("hidden");

};


document.getElementById(
    "detailsModal"
).onclick = function(e) {

    if (e.target === this) {

        this.classList.add("hidden");

    }

};


// ================= MOBILE MENU =================

document.getElementById(
    "mobileMenu"
).onclick = function() {

    document.querySelector(
        ".sidebar"
    ).classList.toggle("open");

};


// ================= AUTO LOGIN =================

if (currentUser) {

    showDashboard();

}
>>>>>>> 5192fe747ad91bdb8eac5544e4603b1454bd8132
