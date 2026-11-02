const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");

// التحقق من رمز الدخول
function authenticateToken(req, res, next) {

    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            message: "يجب تسجيل الدخول أولًا."
        });
    }

    let decoded;

    // التحقق من صحة رمز JWT
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);

    } catch (error) {
        return res.status(403).json({
            message: "رمز الدخول غير صالح أو انتهت صلاحيته."
        });
    }

    // البحث عن المستخدم في قاعدة البيانات
    const user = userModel.findById(decoded.userId);

    if (!user) {
        return res.status(401).json({
            message: "المستخدم غير موجود."
        });
    }

    // استخدام بيانات المستخدم الحالية من قاعدة البيانات
    req.user = user;

    next();
}

// التحقق من صلاحيات المستخدم
function authorizeRole(...allowedRoles) {
    return (req, res, next) => {

        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: "ليس لديك صلاحية لتنفيذ هذه العملية."
            });
        }

        next();
    };
}

module.exports = {
    authenticateToken,
    authorizeRole
};