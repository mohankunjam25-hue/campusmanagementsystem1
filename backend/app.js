const express = require("express");

const app = express();

// Middleware
app.use(express.json());

// Routes
const complaintRoutes = require("./route/complaintRoutes");

app.use("/api/complaints", complaintRoutes);


// Test Route
app.get("/", (req, res) => {
    res.json({
        message: "Campus Complaint Management System API is running"
    });
});


module.exports = app;