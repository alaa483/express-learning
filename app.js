require("dotenv").config();
const express = require("express");

const app = express();

app.use(express.json());

// استدعاء مسارات الموظفين
const employeeRoutes = require("./routes/employeeRoutes");
const authRoutes = require("./routes/authRoutes");
// تسجيل ومتابعة الطلبات
app.use((req, res, next) => {
    const start = Date.now();

    res.on("finish", () => {
        const duration = Date.now() - start;

        console.log(
            req.method,
            req.url,
            res.statusCode,
            duration + "ms"
        );
    });

    next();
});

// الصفحة الرئيسية
app.get("/", (req, res) => {
    res.send("مرحبًا بك في أول تطبيق Express!");
});

// صفحة التعريف
app.get("/about", (req, res) => {
    res.send("هذه صفحة التعريف بالتطبيق.");
});

// ربط مسارات الموظفين
app.use("/employees", employeeRoutes);
app.use("/auth", authRoutes);
// معالجة الأخطاء
app.use((err, req, res, next) => {

    console.error("حدث خطأ في السيرفر:", err);

    res.status(500).json({
        success: false,
        message: "حدث خطأ داخلي في السيرفر.",
        error: process.env.NODE_ENV === "development"
            ? err.message
            : undefined
    });

});

// تصدير التطبيق لاستخدامه في الاختبارات
module.exports = app;
