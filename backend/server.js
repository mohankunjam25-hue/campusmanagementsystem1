const app = require("./app");
const connectDB = require("./config/db");

const PORT = 5000;

const startServer = async () => {
    try {
        await connectDB();

        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });

    } catch (error) {
        console.log("Server Error:", error.message);
    }
};

startServer();