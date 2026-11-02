const express = require("express");

const router = express.Router();

const authController = require("../controllers/authController");

// إنشاء حساب جديد
router.post("/register", authController.register);
// تسجيل دخول المستخدم
router.post("/login", authController.login);
module.exports = router;