const app = require("./app");
const { connectDB } = require("./config/db");
const User = require("./model/userLoginLogoutModel");
const bcrypt = require("bcryptjs");
const { getUsers, saveUsers, makeId } = require("./data/store");

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

const startServer = async () => {
    try {
        await connectDB();
        await seedAdmin();

        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });

    } catch (error) {
        console.log("Server Error:", error.message);
    }
};

startServer();