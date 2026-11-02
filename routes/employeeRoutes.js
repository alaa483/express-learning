const express = require("express");
const { body, param, validationResult } = require("express-validator");
const router = express.Router();
const employeeController = require("../controllers/employeeController");
const {
    authenticateToken,
    authorizeRole
} = require("../middleware/authMiddleware");
// التحقق من بيانات الموظف
const validateEmployee = [
    body("id")
        .isInt({ min: 1 })
        .withMessage("رقم الموظف يجب أن يكون عددًا صحيحًا موجبًا.")
        .toInt(),

    body("name")
        .trim()
        .notEmpty()
        .withMessage("اسم الموظف مطلوب."),

    (req, res, next) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array().map(error => error.msg)
            });
        }

        next();
    }
];
// التحقق من بيانات تعديل الموظف
const validateEmployeeUpdate = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("رقم الموظف يجب أن يكون عددًا صحيحًا موجبًا."),

    body("name")
        .trim()
        .notEmpty()
        .withMessage("اسم الموظف مطلوب."),

    (req, res, next) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array().map(error => error.msg)
            });
        }

        next();
    }
];
// التحقق من رقم الموظف عند الحذف
const validateEmployeeId = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("رقم الموظف يجب أن يكون عددًا صحيحًا موجبًا."),

    (req, res, next) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array().map(error => error.msg)
            });
        }

        next();
    }
];


// عرض جميع الموظفين
router.get("/", employeeController.getAllEmployees);

// عرض موظف برقم محدد
router.get("/:id", employeeController.getEmployeeById);

// إضافة موظف - المدير فقط
router.post(
    "/",
    authenticateToken,
    authorizeRole("admin"),
    validateEmployee,
    employeeController.addEmployee
);

// تعديل موظف - المدير فقط
router.put(
    "/:id",
    authenticateToken,
    authorizeRole("admin"),
    validateEmployeeUpdate,
    employeeController.updateEmployee
);

// حذف موظف - المدير فقط
router.delete(
    "/:id",
    authenticateToken,
    authorizeRole("admin"),
    validateEmployeeId,
    employeeController.deleteEmployee
);

module.exports = router;