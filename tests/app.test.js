
// استخدام قاعدة بيانات مستقلة للاختبارات
process.env.DB_FILE = "test-employees.db";
const userModel = require("../models/userModel");
const request = require("supertest");
const app = require("../app");
const db = require("../database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const employeeModel = require("../models/employeeModel");
// بيانات المستخدم التجريبي
const TEST_USERNAME = "testuser";
const TEST_PASSWORD = "Test12345!";

let employeeCounter = 0;

// إنشاء رقم فريد لكل موظف اختباري
function nextEmployeeId() {
    employeeCounter++;
    return Date.now() * 1000 + employeeCounter;
}

// تسجيل الدخول والحصول على JWT حسب الصلاحية
async function getToken(role = "user") {

    db.prepare(`
        UPDATE users
        SET role = ?
        WHERE username = ?
    `).run(role, TEST_USERNAME);

    const response = await request(app)
        .post("/auth/login")
        .send({
            username: TEST_USERNAME,
            password: TEST_PASSWORD
        });

    if (response.statusCode !== 200 || !response.body.token) {
        throw new Error("فشل إنشاء رمز الدخول للاختبار.");
    }

    return response.body.token;
}

// إنشاء موظف تجريبي مباشرة في قاعدة البيانات
function createTestEmployee(id, name = "موظف اختباري") {
    return db.prepare(`
        INSERT INTO employees (id, name)
        VALUES (?, ?)
    `).run(id, name);
}

// تجهيز حساب الاختبار قبل تشغيل الاختبارات
beforeAll(async () => {

    const hashedPassword = await bcrypt.hash(
        TEST_PASSWORD,
        10
    );

    const existingUser = db.prepare(`
        SELECT id
        FROM users
        WHERE username = ?
    `).get(TEST_USERNAME);

    if (existingUser) {

        db.prepare(`
            UPDATE users
            SET password = ?, role = 'user'
            WHERE username = ?
        `).run(hashedPassword, TEST_USERNAME);

    } else {

        db.prepare(`
            INSERT INTO users (username, password, role)
            VALUES (?, ?, 'user')
        `).run(TEST_USERNAME, hashedPassword);

    }

});

// إعادة صلاحية المستخدم العادي قبل كل اختبار
beforeEach(() => {

    db.prepare(`
        UPDATE users
        SET role = 'user'
        WHERE username = ?
    `).run(TEST_USERNAME);

});

// إغلاق قاعدة البيانات بعد انتهاء الاختبارات
afterAll(() => {
    db.close();
});


describe("اختبارات التطبيق ونظام الموظفين", () => {

    // 1. اختبار الصفحة الرئيسية
    test("يجب أن تعمل الصفحة الرئيسية", async () => {

        const response = await request(app).get("/");

        expect(response.statusCode).toBe(200);

        expect(response.text).toBe(
            "مرحبًا بك في أول تطبيق Express!"
        );

    });


    // 2. عرض جميع الموظفين
    test("يجب عرض قائمة الموظفين", async () => {

        const response = await request(app)
            .get("/employees");

        expect(response.statusCode).toBe(200);

        expect(Array.isArray(response.body)).toBe(true);

    });


    // 3. عرض موظف موجود
    test("يجب عرض موظف موجود باستخدام رقمه", async () => {

        const id = nextEmployeeId();

        createTestEmployee(id, "موظف للبحث");

        try {

            const response = await request(app)
                .get(`/employees/${id}`);

            expect(response.statusCode).toBe(200);

            expect(response.body.id).toBe(id);

            expect(response.body.name).toBe("موظف للبحث");

        } finally {

            db.prepare(
                "DELETE FROM employees WHERE id = ?"
            ).run(id);

        }

    });


    // 4. البحث عن موظف غير موجود
    test("يجب إرجاع 404 عند البحث عن موظف غير موجود", async () => {

        const id = nextEmployeeId();

        const response = await request(app)
            .get(`/employees/${id}`);

        expect(response.statusCode).toBe(404);

        expect(response.body.message).toBe(
            "الموظف غير موجود."
        );

    });


    // 5. البحث برقم موظف غير صحيح
    test("يجب رفض البحث باستخدام رقم موظف غير صحيح", async () => {

        const response = await request(app)
            .get("/employees/abc");

        expect(response.statusCode).toBe(400);

        expect(response.body.message).toBe(
            "رقم الموظف غير صحيح."
        );

    });


    // 6. تسجيل الدخول بنجاح
    test("يجب السماح بتسجيل الدخول بالبيانات الصحيحة", async () => {

        const response = await request(app)
            .post("/auth/login")
            .send({
                username: TEST_USERNAME,
                password: TEST_PASSWORD
            });

        expect(response.statusCode).toBe(200);

        expect(response.body.message).toBe(
            "تم تسجيل الدخول بنجاح."
        );

        expect(typeof response.body.token).toBe("string");

    });


    // 7. كلمة مرور خاطئة
    test("يجب رفض تسجيل الدخول بكلمة مرور خاطئة", async () => {

        const response = await request(app)
            .post("/auth/login")
            .send({
                username: TEST_USERNAME,
                password: "WrongPassword123"
            });

        expect(response.statusCode).toBe(401);

        expect(response.body.message).toBe(
            "اسم المستخدم أو كلمة المرور غير صحيحة."
        );

    });


    // 8. اسم مستخدم غير موجود
    test("يجب رفض تسجيل الدخول باسم مستخدم غير موجود", async () => {

        const response = await request(app)
            .post("/auth/login")
            .send({
                username: "unknown_user_12345",
                password: TEST_PASSWORD
            });

        expect(response.statusCode).toBe(401);

    });


    // 9. إنشاء حساب جديد
    test("يجب السماح بإنشاء حساب مستخدم جديد", async () => {

        const username = `register_${Date.now()}`;

        try {

            const response = await request(app)
                .post("/auth/register")
                .send({
                    username,
                    password: "Register123!"
                });

            expect(response.statusCode).toBe(201);

            expect(response.body.user.username).toBe(username);

            const savedUser = db.prepare(`
                SELECT username, password
                FROM users
                WHERE username = ?
            `).get(username);

            expect(savedUser).toBeDefined();

            expect(savedUser.password).not.toBe("Register123!");

            expect(
                await bcrypt.compare(
                    "Register123!",
                    savedUser.password
                )
            ).toBe(true);

        } finally {

            db.prepare(
                "DELETE FROM users WHERE username = ?"
            ).run(username);

        }

    });


    // 10. اسم مستخدم مكرر
    test("يجب رفض إنشاء حساب باسم مستخدم موجود", async () => {

        const response = await request(app)
            .post("/auth/register")
            .send({
                username: TEST_USERNAME,
                password: "Another123!"
            });

        expect(response.statusCode).toBe(409);

        expect(response.body.message).toBe(
            "اسم المستخدم موجود بالفعل."
        );

    });


    // 11. كلمة مرور قصيرة
    test("يجب رفض إنشاء حساب بكلمة مرور قصيرة", async () => {

        const response = await request(app)
            .post("/auth/register")
            .send({
                username: "short_password_user",
                password: "123"
            });

        expect(response.statusCode).toBe(400);

    });


    // 12. اسم مستخدم فارغ
    test("يجب رفض إنشاء حساب دون اسم مستخدم", async () => {

        const response = await request(app)
            .post("/auth/register")
            .send({
                username: "   ",
                password: "Password123!"
            });

        expect(response.statusCode).toBe(400);

    });


    // 13. إضافة موظف دون تسجيل الدخول
    test("يجب رفض إضافة موظف دون تسجيل الدخول", async () => {

        const response = await request(app)
            .post("/employees")
            .send({
                id: nextEmployeeId(),
                name: "موظف اختباري"
            });

        expect(response.statusCode).toBe(401);

    });


    // 14. رمز JWT غير صالح
    test("يجب رفض الطلب عند استخدام رمز JWT غير صالح", async () => {

        const response = await request(app)
            .post("/employees")
            .set("Authorization", "Bearer invalid.token.value")
            .send({
                id: nextEmployeeId(),
                name: "موظف اختباري"
            });

        expect(response.statusCode).toBe(403);

    });


    // 15. مستخدم غير موجود في قاعدة البيانات
    test("يجب رفض الرمز الخاص بمستخدم غير موجود", async () => {

        const fakeToken = jwt.sign(
            {
                userId: -999999,
                username: "unknown",
                role: "admin"
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        const response = await request(app)
            .post("/employees")
            .set("Authorization", `Bearer ${fakeToken}`)
            .send({
                id: nextEmployeeId(),
                name: "موظف اختباري"
            });

        expect(response.statusCode).toBe(401);

    });


    // 16. منع المستخدم العادي من الإضافة
    test("يجب منع المستخدم العادي من إضافة موظف", async () => {

        const token = await getToken("user");

        const response = await request(app)
            .post("/employees")
            .set("Authorization", `Bearer ${token}`)
            .send({
                id: nextEmployeeId(),
                name: "موظف اختبار الصلاحيات"
            });

        expect(response.statusCode).toBe(403);

    });


    // 17. التحقق من بيانات الإضافة
    test("يجب رفض إضافة موظف ببيانات غير صحيحة", async () => {

        const token = await getToken("admin");

        const response = await request(app)
            .post("/employees")
            .set("Authorization", `Bearer ${token}`)
            .send({
                id: 0,
                name: ""
            });

        expect(response.statusCode).toBe(400);

        expect(response.body.success).toBe(false);

        expect(response.body.errors.length).toBeGreaterThan(0);

    });


    // 18. إضافة موظف بصلاحية المدير
    test("يجب السماح للمدير بإضافة موظف", async () => {

        const id = nextEmployeeId();

        const token = await getToken("admin");

        try {

            const response = await request(app)
                .post("/employees")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    id,
                    name: "موظف المدير"
                });

            expect(response.statusCode).toBe(201);

            expect(response.body.employee.name).toBe(
                "موظف المدير"
            );

        } finally {

            db.prepare(
                "DELETE FROM employees WHERE id = ?"
            ).run(id);

        }

    });


    // 19. منع تكرار رقم الموظف
    test("يجب رفض إضافة موظف برقم موجود بالفعل", async () => {

        const id = nextEmployeeId();

        const token = await getToken("admin");

        createTestEmployee(id, "الموظف الأصلي");

        try {

            const response = await request(app)
                .post("/employees")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    id,
                    name: "موظف مكرر"
                });

            expect(response.statusCode).toBe(409);

            expect(response.body.message).toBe(
                "رقم الموظف موجود بالفعل."
            );

        } finally {

            db.prepare(
                "DELETE FROM employees WHERE id = ?"
            ).run(id);

        }

    });


    // 20. تعديل موظف بنجاح
    test("يجب السماح للمدير بتعديل بيانات موظف", async () => {

        const id = nextEmployeeId();

        const token = await getToken("admin");

        createTestEmployee(id, "قبل التعديل");

        try {

            const response = await request(app)
                .put(`/employees/${id}`)
                .set("Authorization", `Bearer ${token}`)
                .send({
                    name: "بعد التعديل"
                });

            expect(response.statusCode).toBe(200);

            expect(response.body.employee.name).toBe(
                "بعد التعديل"
            );

        } finally {

            db.prepare(
                "DELETE FROM employees WHERE id = ?"
            ).run(id);

        }

    });


    // 21. تعديل موظف غير موجود
    test("يجب رفض تعديل موظف غير موجود", async () => {

        const id = nextEmployeeId();

        const token = await getToken("admin");

        const response = await request(app)
            .put(`/employees/${id}`)
            .set("Authorization", `Bearer ${token}`)
            .send({
                name: "اسم جديد"
            });

        expect(response.statusCode).toBe(404);

        expect(response.body.message).toBe(
            "الموظف غير موجود."
        );

    });


    // 22. رقم غير صالح عند التعديل
    test("يجب رفض تعديل موظف برقم غير صحيح", async () => {

        const token = await getToken("admin");

        const response = await request(app)
            .put("/employees/abc")
            .set("Authorization", `Bearer ${token}`)
            .send({
                name: "اسم جديد"
            });

        expect(response.statusCode).toBe(400);

    });


    // 23. اسم غير صحيح عند التعديل
    test("يجب رفض تعديل الموظف باسم فارغ", async () => {

        const token = await getToken("admin");

        const response = await request(app)
            .put(`/employees/${nextEmployeeId()}`)
            .set("Authorization", `Bearer ${token}`)
            .send({
                name: "   "
            });

        expect(response.statusCode).toBe(400);

    });


    // 24. حذف موظف بنجاح
    test("يجب السماح للمدير بحذف موظف", async () => {

        const id = nextEmployeeId();

        const token = await getToken("admin");

        createTestEmployee(id, "موظف للحذف");

        try {

            const response = await request(app)
                .delete(`/employees/${id}`)
                .set("Authorization", `Bearer ${token}`);

            expect(response.statusCode).toBe(200);

            expect(response.body.message).toBe(
                "تم حذف الموظف بنجاح."
            );

            const deletedEmployee = db.prepare(
                "SELECT * FROM employees WHERE id = ?"
            ).get(id);

            expect(deletedEmployee).toBeUndefined();

        } finally {

            db.prepare(
                "DELETE FROM employees WHERE id = ?"
            ).run(id);

        }

    });


    // 25. حذف موظف غير موجود
    test("يجب رفض حذف موظف غير موجود", async () => {

        const token = await getToken("admin");

        const response = await request(app)
            .delete(`/employees/${nextEmployeeId()}`)
            .set("Authorization", `Bearer ${token}`);

        expect(response.statusCode).toBe(404);

        expect(response.body.message).toBe(
            "الموظف غير موجود."
        );

    });


    // 26. رقم غير صالح عند الحذف
    test("يجب رفض حذف موظف برقم غير صحيح", async () => {

        const token = await getToken("admin");

        const response = await request(app)
            .delete("/employees/abc")
            .set("Authorization", `Bearer ${token}`);

        expect(response.statusCode).toBe(400);

    });
    test("يجب رفض تسجيل الدخول عند غياب اسم المستخدم أو كلمة المرور", async () => {

        // اختبار غياب كلمة المرور
        const response1 = await request(app)
            .post("/auth/login")
            .send({
                username: TEST_USERNAME
            });

        expect(response1.statusCode).toBe(400);

        expect(response1.body.message).toBe(
            "اسم المستخدم وكلمة المرور مطلوبان."
        );

        // اختبار غياب اسم المستخدم
        const response2 = await request(app)
            .post("/auth/login")
            .send({
                password: TEST_PASSWORD
            });

        expect(response2.statusCode).toBe(400);

        expect(response2.body.message).toBe(
            "اسم المستخدم وكلمة المرور مطلوبان."
        );

    });

    // الاختبار 28: صفحة التعريف
    test("يجب أن تعمل صفحة التعريف بنجاح", async () => {

        const response = await request(app).get("/about");

        expect(response.statusCode).toBe(200);

        expect(response.text).toBe(
            "هذه صفحة التعريف بالتطبيق."
        );

    });


    // الاختبار 29: معالجة خطأ أثناء إنشاء الحساب
    test("يجب معالجة أخطاء إنشاء الحساب وإرجاع 500", async () => {

        const findSpy = jest.spyOn(
            userModel,
            "findByUsername"
        ).mockImplementationOnce(() => {
            throw new Error("TEST_REGISTER_ERROR");
        });

        const errorSpy = jest.spyOn(
            console,
            "error"
        ).mockImplementation(() => { });

        try {

            const response = await request(app)
                .post("/auth/register")
                .send({
                    username: "register_error_test",
                    password: "Password123!"
                });

            expect(response.statusCode).toBe(500);

            expect(response.body.success).toBe(false);

            expect(response.body.message).toBe(
                "حدث خطأ داخلي في السيرفر."
            );

        } finally {

            findSpy.mockRestore();
            errorSpy.mockRestore();

        }

    });


    // الاختبار 30: معالجة خطأ أثناء تسجيل الدخول
    test("يجب معالجة أخطاء تسجيل الدخول وإرجاع 500", async () => {

        const findSpy = jest.spyOn(
            userModel,
            "findByUsername"
        ).mockImplementationOnce(() => {
            throw new Error("TEST_LOGIN_ERROR");
        });

        const errorSpy = jest.spyOn(
            console,
            "error"
        ).mockImplementation(() => { });

        const previousNodeEnv = process.env.NODE_ENV;

        process.env.NODE_ENV = "development";

        try {

            const response = await request(app)
                .post("/auth/login")
                .send({
                    username: "testuser",
                    password: "Test12345!"
                });

            expect(response.statusCode).toBe(500);

            expect(response.body.success).toBe(false);

            expect(response.body.message).toBe(
                "حدث خطأ داخلي في السيرفر."
            );

            expect(response.body.error).toBe(
                "TEST_LOGIN_ERROR"
            );

        } finally {

            findSpy.mockRestore();
            errorSpy.mockRestore();

            if (previousNodeEnv === undefined) {
                delete process.env.NODE_ENV;
            } else {
                process.env.NODE_ENV = previousNodeEnv;
            }

        }

    });

    test("يجب معالجة خطأ غير متوقع أثناء إضافة موظف", async () => {

        const id = nextEmployeeId();

        const originalUser = db.prepare(
            "SELECT role FROM users WHERE username = ?"
        ).get(TEST_USERNAME);

        // محاكاة خطأ في قاعدة البيانات
        const createSpy = jest.spyOn(
            employeeModel,
            "create"
        ).mockImplementationOnce(() => {
            throw new Error("TEST_EMPLOYEE_DB_ERROR");
        });

        // منع طباعة الخطأ المتوقع أثناء الاختبار
        const errorSpy = jest.spyOn(
            console,
            "error"
        ).mockImplementation(() => { });

        try {

            const token = await getToken("admin");

            const response = await request(app)
                .post("/employees")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    id,
                    name: "موظف اختبار الخطأ"
                });

            expect(response.statusCode).toBe(500);

            expect(response.body.success).toBe(false);

            expect(response.body.message).toBe(
                "حدث خطأ داخلي في السيرفر."
            );

        } finally {

            createSpy.mockRestore();
            errorSpy.mockRestore();

            // إعادة الصلاحية الأصلية
            db.prepare(
                "UPDATE users SET role = ? WHERE username = ?"
            ).run(originalUser.role, TEST_USERNAME);

            // التأكد من عدم وجود سجل تجريبي
            db.prepare(
                "DELETE FROM employees WHERE id = ?"
            ).run(id);

        }

    });

    test("يجب إضافة حقل role تلقائيًا عند ترقية قاعدة بيانات قديمة", () => {

        const migrationDbPath = path.join(
            __dirname,
            `legacy-migration-${Date.now()}.db`
        );

        // إنشاء قاعدة بيانات قديمة لا تحتوي على role
        const legacyDb = new Database(migrationDbPath);

        legacyDb.exec(`
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

        // إضافة مستخدم قديم
        legacyDb.prepare(`
        INSERT INTO users (username, password)
        VALUES (?, ?)
    `).run("legacy_user", "hashed-password");

        legacyDb.close();

        const previousDbFile = process.env.DB_FILE;
        let migratedDb;

        try {

            // توجيه database.js إلى قاعدة البيانات القديمة
            process.env.DB_FILE = migrationDbPath;

            // تحميل database.js من جديد لتشغيل الترقية
            jest.resetModules();

            migratedDb = require("../database");

            // التحقق من إضافة عمود role
            const columns = migratedDb.prepare(
                "PRAGMA table_info(users)"
            ).all();

            const hasRoleColumn = columns.some(
                column => column.name === "role"
            );

            expect(hasRoleColumn).toBe(true);

            // التحقق من أن المستخدم القديم حصل على صلاحية user
            const user = migratedDb.prepare(`
            SELECT role
            FROM users
            WHERE username = ?
        `).get("legacy_user");

            expect(user.role).toBe("user");

        } finally {

            // إغلاق قاعدة البيانات التجريبية
            if (migratedDb && migratedDb.open) {
                migratedDb.close();
            }

            // إعادة إعدادات قاعدة البيانات الأصلية
            if (previousDbFile === undefined) {
                delete process.env.DB_FILE;
            } else {
                process.env.DB_FILE = previousDbFile;
            }

            jest.resetModules();

            // حذف ملف قاعدة البيانات التجريبية
            if (fs.existsSync(migrationDbPath)) {
                fs.unlinkSync(migrationDbPath);
            }

        }

    });

});
