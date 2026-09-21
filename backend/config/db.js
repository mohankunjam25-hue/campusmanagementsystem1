const mongoose = require("mongoose");

let isMongoConnected = false;

const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGO_URI;

        if (!mongoUri) {
            if (process.env.NODE_ENV === "production") {
                console.error("FATAL ERROR: MONGO_URI is missing in production environment.");
                process.exit(1);
            } else {
                console.log("MongoDB URI missing. Starting in local fallback mode.");
                isMongoConnected = false;
                return false;
            }
        }

        await mongoose.connect(mongoUri);

        isMongoConnected = true;
        console.log("MongoDB connected successfully");
        return true;
    } catch (error) {
        if (process.env.NODE_ENV === "production") {
            console.error("FATAL ERROR: MongoDB connection failed in production:", error.message);
            process.exit(1);
        } else {
            isMongoConnected = false;
            console.log("MongoDB connection failed:", error.message);
            console.log("Starting in local fallback mode.");
            return false;
        }
    }
};

const isDatabaseReady = () => isMongoConnected;

module.exports = {
    connectDB,
    isDatabaseReady
};