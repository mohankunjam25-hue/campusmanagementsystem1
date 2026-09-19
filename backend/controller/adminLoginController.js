const User = require("../model/userLoginLogoutModel");
const { getUsers, saveUsers, makeId } = require("../data/store");
const { isDatabaseReady } = require("../config/db");

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const findUserByEmail = async (email, password) => {
    const users = getUsers();
    const normalizedEmail = normalizeEmail(email);

    const match = users.find((user) =>
        normalizeEmail(user.email) === normalizedEmail &&
        String(user.password) === String(password)
    );

    return match || null;
};

const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        const normalizedEmail = normalizeEmail(email);

        if (isDatabaseReady()) {
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

            return res.status(201).json({
                message: "User registered successfully",
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            });
        }

        const users = getUsers();
        const exists = users.some((user) => normalizeEmail(user.email) === normalizedEmail);

        if (exists) {
            return res.status(400).json({
                message: "User already exists"
            });
        }

        const newUser = {
            id: makeId(),
            name: String(name).trim(),
            email: normalizedEmail,
            password,
            role: "student",
            createdAt: new Date().toISOString()
        };

        saveUsers([...users, newUser]);

        return res.status(201).json({
            message: "User registered successfully",
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role
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

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const normalizedEmail = normalizeEmail(email);

        if (isDatabaseReady()) {
            const user = await User.findOne({
                email: normalizedEmail,
                password,
                role: "student"
            }) || await User.findOne({
                email: normalizedEmail,
                password
            });

            if (!user) {
                return res.status(401).json({
                    message: "Invalid email or password"
                });
            }

            return res.status(200).json({
                message: "Login successful",
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role || "student"
                }
            });
        }

        const user = await findUserByEmail(normalizedEmail, password);

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        return res.status(200).json({
            message: "Login successful",
            user: {
                id: user.id,
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