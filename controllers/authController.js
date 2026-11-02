const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");

// إنشاء حساب مستخدم جديد
async function register(req, res, next) {
    const username = typeof req.body.username === "string"
        ? req.body.username.trim()
        : "";

    const password = typeof req.body.password === "string"
        ? req.body.password
        : "";

    // التحقق من البيانات
    if (!username || password.length < 8) {
        return res.status(400).json({
            message: "اسم المستخدم مطلوب، وكلمة المرور يجب ألا تقل عن 8 أحرف."
        });
    }

    try {
        // التأكد من أن اسم المستخدم غير موجود
        const existingUser = userModel.findByUsername(username);

        if (existingUser) {
            return res.status(409).json({
                message: "اسم المستخدم موجود بالفعل."
            });
        }

        // تشفير كلمة المرور
        const hashedPassword = await bcrypt.hash(password, 10);

        // حفظ المستخدم في قاعدة البيانات
        userModel.create(username, hashedPassword);

        res.status(201).json({
            message: "تم إنشاء الحساب بنجاح.",
            user: {
                username
            }
        });

    } catch (error) {
        next(error);
    }
}

// تسجيل دخول المستخدم
async function login(req, res, next) {
    const username = typeof req.body.username === "string"
        ? req.body.username.trim()
        : "";

    const password = typeof req.body.password === "string"
        ? req.body.password
        : "";

    if (!username || !password) {
        return res.status(400).json({
            message: "اسم المستخدم وكلمة المرور مطلوبان."
        });
    }

    try {
        // البحث عن المستخدم
        const user = userModel.findByUsername(username);

        if (!user) {
            return res.status(401).json({
                message: "اسم المستخدم أو كلمة المرور غير صحيحة."
            });
        }

        // مقارنة كلمة المرور
        const isPasswordCorrect = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordCorrect) {
            return res.status(401).json({
                message: "اسم المستخدم أو كلمة المرور غير صحيحة."
            });
        }

        // إنشاء رمز الدخول JWT
        const token = jwt.sign(
            {
                userId: user.id,
                username: user.username,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN || "1h"
            }
        );

        res.json({
            message: "تم تسجيل الدخول بنجاح.",
            token
        });

    } catch (error) {
        next(error);
    }
}

// تصدير الدوال
module.exports = {
    register,
    login
};