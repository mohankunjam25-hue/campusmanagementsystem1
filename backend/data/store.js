const fs = require("fs");
const path = require("path");

const STORAGE_PATH = path.join(__dirname, "store.json");

const defaultData = {
    users: [],
    complaints: []
};

function ensureStore() {
    if (!fs.existsSync(STORAGE_PATH)) {
        fs.writeFileSync(STORAGE_PATH, JSON.stringify(defaultData, null, 2));
    }

    const raw = fs.readFileSync(STORAGE_PATH, "utf8");

    try {
        const parsed = JSON.parse(raw);
        return {
            users: Array.isArray(parsed.users) ? parsed.users : [],
            complaints: Array.isArray(parsed.complaints) ? parsed.complaints : []
        };
    } catch (error) {
        fs.writeFileSync(STORAGE_PATH, JSON.stringify(defaultData, null, 2));
        return { ...defaultData };
    }
}

function writeStore(data) {
    fs.writeFileSync(STORAGE_PATH, JSON.stringify(data, null, 2));
}

function getUsers() {
    return ensureStore().users;
}

function saveUsers(users) {
    const data = ensureStore();
    data.users = users;
    writeStore(data);
}

function getComplaints() {
    return ensureStore().complaints;
}

function saveComplaints(complaints) {
    const data = ensureStore();
    data.complaints = complaints;
    writeStore(data);
}

function makeId() {
    return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

module.exports = {
    getUsers,
    saveUsers,
    getComplaints,
    saveComplaints,
    makeId,
    ensureStore
};
