const db = require("../database");

// عرض جميع الموظفين
function getAll() {
    return db.prepare(`
        SELECT id, name
        FROM employees
        ORDER BY id
    `).all();
}

// عرض موظف باستخدام رقمه
function getById(id) {
    return db.prepare(`
        SELECT id, name
        FROM employees
        WHERE id = ?
    `).get(id);
}
// إضافة موظف جديد
function create(id, name) {
    return db.prepare(`
        INSERT INTO employees (id, name)
        VALUES (?, ?)
    `).run(id, name);
}
// تعديل اسم موظف
function update(id, name) {
    return db.prepare(`
        UPDATE employees
        SET name = ?
        WHERE id = ?
    `).run(name, id);
}
// حذف موظف
function remove(id) {
    return db.prepare(`
        DELETE FROM employees
        WHERE id = ?
    `).run(id);
}
// تصدير الدوال لاستخدامها في ملفات أخرى
module.exports = {
    getAll,
    getById,
    create,
    update,
    remove
};