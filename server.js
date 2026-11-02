// استدعاء التطبيق
const app = require("./app");

// تحديد رقم المنفذ
const PORT = process.env.PORT || 3000;

// تشغيل السيرفر
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});