const db = require("../database");

// البحث عن مستخدم باستخدام اسم المستخدم
function findByUsername(username) {
    return db.prepare(`
        SELECT id, username, password, role
FROM users
WHERE username = ?
    `).get(username);
}

// إنشاء مستخدم جديد
function create(username, hashedPassword) {
    return db.prepare(`
        INSERT INTO users (username, password)
        VALUES (?, ?)
    `).run(username, hashedPassword);
}
// البحث عن مستخدم باستخدام رقمه
function findById(id) {
    return db.prepare(`
        SELECT id, username, role
        FROM users
        WHERE id = ?
    `).get(id);
}
module.exports = {
    findByUsername,
    findById,
    create
};