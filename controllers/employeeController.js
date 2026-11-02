

const employeeModel = require("../models/employeeModel");
// عرض جميع الموظفين
function getAllEmployees(req, res) {
    const employees = employeeModel.getAll();

    res.json(employees);
}

// عرض موظف برقم محدد
function getEmployeeById(req, res) {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            message: "رقم الموظف غير صحيح."
        });
    }

    const employee = employeeModel.getById(id);

    if (!employee) {
        return res.status(404).json({
            message: "الموظف غير موجود."
        });
    }

    res.json(employee);
}

// إضافة موظف
function addEmployee(req, res) {
    const { id, name } = req.body;

    try {
        employeeModel.create(id, name);

        res.status(201).json({
            message: "تمت إضافة الموظف بنجاح.",
            employee: {
                id,
                name
            }
        });

    } catch (error) {
        if (error.code === "SQLITE_CONSTRAINT_PRIMARYKEY") {
            return res.status(409).json({
                message: "رقم الموظف موجود بالفعل."
            });
        }

        throw error;
    }
}

// تعديل موظف
function updateEmployee(req, res) {
    const id = Number(req.params.id);
    const { name } = req.body;

    const result = employeeModel.update(id, name);

    if (result.changes === 0) {
        return res.status(404).json({
            message: "الموظف غير موجود."
        });
    }

    res.json({
        message: "تم تعديل بيانات الموظف بنجاح.",
        employee: {
            id,
            name
        }
    });
}

// حذف موظف
function deleteEmployee(req, res) {
    const id = Number(req.params.id);

    const result = employeeModel.remove(id);

    if (result.changes === 0) {
        return res.status(404).json({
            message: "الموظف غير موجود."
        });
    }

    res.json({
        message: "تم حذف الموظف بنجاح."
    });
}

module.exports = {
    getAllEmployees,
    getEmployeeById,
    addEmployee,
    updateEmployee,
    deleteEmployee
};
