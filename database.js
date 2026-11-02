
const Database = require("better-sqlite3");

const dbFile = process.env.DB_FILE || "employees.db";
const db = new Database(dbFile);
console.log("مسار قاعدة البيانات:", db.name);
db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);
// إضافة حقل الصلاحية إذا لم يكن موجودًا
const userColumns = db.prepare(`
    PRAGMA table_info(users)
`).all();

const hasRoleColumn = userColumns.some(
    column => column.name === "role"
);

if (!hasRoleColumn) {
    db.exec(`
        ALTER TABLE users
        ADD COLUMN role TEXT NOT NULL DEFAULT 'user'
    `);
}
console.log("تم تجهيز قاعدة البيانات بنجاح.");
const tables = db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
`).all();

console.log("الجداول الموجودة:", tables);
module.exports = db;
