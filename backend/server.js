const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const app = require("./app");
const { connectDB } = require("./config/db");
const User = require("./model/userLoginLogoutModel");
const bcrypt = require("bcryptjs");
const { getUsers, saveUsers, makeId } = require("./data/store");

// Handle Uncaught Exceptions
process.on("uncaughtException", err => {
    console.error("UNCAUGHT EXCEPTION! Shutting down...");
    console.error(err.name, err.message);
    process.exit(1);
});

const PORT = process.env.PORT || 5000;

const seedAdmin = async () => {
    try {
        const adminEmail = "super@campuscare.com";
        const adminPassword = "superadmin123";
        const { isDatabaseReady } = require("./config/db");

        if (isDatabaseReady()) {
            const adminExists = await User.findOne({ email: adminEmail });
            if (!adminExists) {
                await User.create({
                    name: "Super Admin",
                    email: adminEmail,
                    password: adminPassword,
                    role: "super_admin"
                });
                console.log("Super Admin seeded in MongoDB");
            }
        } else {
            const users = getUsers();
            const exists = users.some(u => u.email === adminEmail);
            if (!exists) {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(adminPassword, salt);
                saveUsers([...users, {
                    id: makeId(),
                    name: "Super Admin",
                    email: adminEmail,
                    password: hashedPassword,
                    role: "super_admin",
                    createdAt: new Date().toISOString()
                }]);
                console.log("Super Admin seeded in Local Store");
            }
        }
    } catch (err) {
        console.error("Error seeding admin:", err);
    }
};

let server;

const startServer = async () => {
    try {
        await connectDB();
        await seedAdmin();

        server = app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });

    } catch (error) {
        console.log("Server Error:", error.message);
    }
};

startServer();

// Handle Unhandled Rejections
process.on("unhandledRejection", err => {
    console.error("UNHANDLED REJECTION! Shutting down...");
    console.error(err.name, err.message);
    if (server) {
        server.close(() => {
            process.exit(1);
        });
    } else {
        process.exit(1);
    }
});