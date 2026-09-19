const express = require("express");
const cors = require("cors");
const path = require("path");

require("dotenv").config();

const app = express();
const frontendPath = path.join(__dirname, "..", "frontend");

app.use(cors());
app.use(express.json());

const complaintRoutes = require("./route/complaintRoutes");
const userRoutes = require("./route/userRoutes");

app.use(express.static(frontendPath));

app.get("/api", (req, res) => {
    res.json({
        message: "Campus Complaint Management System API is running"
    });
});

app.use("/api/complaints", complaintRoutes);
app.use("/api/users", userRoutes);

app.get("/", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
});

module.exports = app;