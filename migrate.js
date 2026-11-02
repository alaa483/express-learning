
const db = require("./database");

try {
    const result = db.prepare(`
        INSERT INTO employees (id, name)
        VALUES (?, ?)
    `).run(11, "سارة");

    console.log("تمت إضافة الموظف بنجاح.");
    console.log("رقم الموظف الجديد:", result.lastInsertRowid);

    const employee = db.prepare(`
        SELECT id, name
        FROM employees
        WHERE id = ?
    `).get(11);

    console.log("بيانات الموظف:", employee);
} catch (error) {
    console.error("حدث خطأ:", error.message);
} finally {
    db.close();
}