const User = require("../model/userLoginLogoutModel");

// Register User
const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        const normalizedEmail = String(email).trim().toLowerCase();

        const existingUser = await User.findOne({ email: normalizedEmail });

        if (existingUser) {
            return res.status(400).json({
                message: "User already exists"
            });
        }

        const user = await User.create({
            name: String(name).trim(),
            email: normalizedEmail,
            password,
            role: "student"
        });

        res.status(201).json({
            message: "User registered successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: "Failed to register user",
            error: error.message
        });
    }
};


// Login User
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const normalizedEmail = String(email).trim().toLowerCase();

        const user = await User.findOne({
            email: normalizedEmail,
            password: password,
            role: "student"
        }) || await User.findOne({
            email: normalizedEmail,
            password: password
        });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        res.status(200).json({
            message: "Login successful",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role || "student"
            }
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: "Failed to login",
            error: error.message
        });
    }
};

module.exports = {
    registerUser,
    loginUser
};