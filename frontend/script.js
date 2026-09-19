








































































































































































































const complaintForm = document.getElementById("complaintForm");

complaintForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const submitBtn = document.getElementById("submitBtn");

    try {

        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting...";


        // Create FormData
        const formData = new FormData();

        formData.append(
            "title",
            document.getElementById("complaintTitle").value.trim()
        );

        formData.append(
            "category",
            document.getElementById("complaintCategory").value
        );

        formData.append(
            "location",
            document.getElementById("complaintLocation").value.trim()
        );

        formData.append(
            "description",
            document.getElementById("complaintDescription").value.trim()
        );


        // Add image only if selected
        const imageInput = document.getElementById("complaintImage");

        if (imageInput.files.length > 0) {

            formData.append(
                "image",
                imageInput.files[0]
            );

        }


        // Get JWT
        const token = localStorage.getItem("token");

        if (!token) {

            alert("Please login first.");

            window.location.href = "../login.html";

            return;
        }


        // Send request to backend
        const response = await fetch(
            "http://localhost:5000/api/complaints",
            {
                method: "POST",

                headers: {
                    Authorization: `Bearer ${ token }`
                },

                body: formData
            }
        );


        const data = await response.json();


        if (!response.ok) {

            throw new Error(
                data.message || "Failed to create complaint"
            );

        }


        alert("Complaint submitted successfully.");

        complaintForm.reset();


        // Redirect to complaints page
        window.location.href = "complaints.html";


    } catch (error) {

        console.error("Complaint submission error:", error);

        alert(error.message);


    } finally {

        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Complaint";

    }

});