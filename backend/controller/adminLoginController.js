const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../model/userLoginLogoutModel");
const { getUsers, saveUsers, makeId } = require("../data/store");
const { isDatabaseReady } = require("../config/db");

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || "default_secret_key", {
        expiresIn: "30d"
    });
};

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const findUserByEmail = async (email, password) => {
    const users = getUsers();
    const normalizedEmail = normalizeEmail(email);

    const match = users.find((user) => normalizeEmail(user.email) === normalizedEmail);
    if (match) {
        try {
            const isMatch = await bcrypt.compare(password, match.password);
            if (isMatch) return match;
        } catch (e) {}
        if (match.password === password) return match;
    }

    return null;
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
                token: generateToken(user._id),
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

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = {
            id: makeId(),
            name: String(name).trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: "student",
            createdAt: new Date().toISOString()
        };

        saveUsers([...users, newUser]);

        return res.status(201).json({
            message: "User registered successfully",
            token: generateToken(newUser.id),
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
            const user = await User.findOne({ email: normalizedEmail });

            if (user && (await user.matchPassword(password))) {
                return res.status(200).json({
                    message: "Login successful",
                    token: generateToken(user._id),
                    user: {
                        id: user._id,
                        name: user.name,
                        email: user.email,
                        role: user.role
                    }
                });
            } else {
                return res.status(401).json({ message: "Invalid email or password" });
            }
        }

        const user = await findUserByEmail(normalizedEmail, password);

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        return res.status(200).json({
            message: "Login successful",
            token: generateToken(user.id),
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

const createAdmin = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }
        const normalizedEmail = normalizeEmail(email);

        if (isDatabaseReady()) {
            const existing = await User.findOne({ email: normalizedEmail });
            if (existing) return res.status(400).json({ message: "User already exists" });

            const user = await User.create({
                name: String(name).trim(),
                email: normalizedEmail,
                password,
                role: "admin"
            });
            return res.status(201).json({ message: "Admin created successfully" });
        }

        const users = getUsers();
        if (users.some(u => normalizeEmail(u.email) === normalizedEmail)) {
            return res.status(400).json({ message: "User already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        saveUsers([...users, {
            id: makeId(),
            name: String(name).trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: "admin",
            createdAt: new Date().toISOString()
        }]);

        return res.status(201).json({ message: "Admin created successfully" });

    } catch (error) {
        res.status(500).json({ message: "Failed to create admin" });
    }
};

const getAdmins = async (req, res) => {
    try {
        if (isDatabaseReady()) {
            const admins = await User.find({ role: "admin" }).select("-password");
            return res.status(200).json(admins);
        }

        const users = getUsers().filter(u => u.role === "admin").map(u => {
            const { password, ...rest } = u;
            return rest;
        });
        return res.status(200).json(users);

    } catch (error) {
        res.status(500).json({ message: "Failed to fetch admins" });
    }
};

const deleteAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        if (isDatabaseReady()) {
            await User.findByIdAndDelete(id);
            return res.status(200).json({ message: "Admin deleted" });
        }

        const users = getUsers().filter(u => String(u.id) !== String(id) && String(u._id) !== String(id));
        saveUsers(users);
        return res.status(200).json({ message: "Admin deleted" });

    } catch (error) {
        res.status(500).json({ message: "Failed to delete admin" });
    }
};

module.exports = {
    registerUser,
    loginUser,
    createAdmin,
    getAdmins,
    deleteAdmin
};