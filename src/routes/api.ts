import { Router } from "express";
import * as authController from "../controllers/authController";
import * as inventoryController from "../controllers/inventoryController";
import * as expenseController from "../controllers/expenseController";
import * as employeeController from "../controllers/employeeController";
import * as attendanceController from "../controllers/attendanceController";
import * as customerController from "../controllers/customerController";
import * as saleController from "../controllers/saleController";
import * as reportController from "../controllers/reportController";
import * as notificationController from "../controllers/notificationController";
import * as settingsController from "../controllers/settingsController";
import * as taskController from "../controllers/taskController";

import { authenticateToken, requireAdmin, requireEmployeeOrAdmin } from "../middleware/auth";

const router = Router();

// --- Authentication Routes ---
router.post("/auth/login", authController.login);
router.post("/auth/logout", authController.logout);
router.post("/auth/refresh", authController.refresh);
router.get("/auth/profile", authenticateToken, authController.getProfile);

// --- Task Management Routes ---
router.get("/tasks", authenticateToken, taskController.getTasks);
router.get("/tasks/my", authenticateToken, taskController.getMyTasks);
router.post("/tasks", authenticateToken, requireAdmin, taskController.createTask);
router.put("/tasks/:id/status", authenticateToken, taskController.updateTaskStatus);
router.put("/tasks/:id", authenticateToken, requireAdmin, taskController.updateTask);
router.delete("/tasks/:id", authenticateToken, requireAdmin, taskController.deleteTask);

// --- Inventory CRUD (Protections: Viewable by all authenticated, modifications by Admin) ---
router.get("/inventory", authenticateToken, inventoryController.getInventory);
router.get("/inventory/:id", authenticateToken, inventoryController.getInventoryItem);
router.post("/inventory", authenticateToken, requireAdmin, inventoryController.createInventoryItem);
router.put("/inventory/:id", authenticateToken, requireAdmin, inventoryController.updateInventoryItem);
router.delete("/inventory/:id", authenticateToken, requireAdmin, inventoryController.deleteInventoryItem);

// --- Expenses CRUD ---
router.get("/expenses", authenticateToken, expenseController.getExpenses);
router.get("/expenses/:id", authenticateToken, expenseController.getExpense);
router.post("/expenses", authenticateToken, expenseController.createExpense);
router.put("/expenses/:id", authenticateToken, expenseController.updateExpense);
router.delete("/expenses/:id", authenticateToken, expenseController.deleteExpense);

// --- Employees Admin panel CRUD ---
router.get("/employees", authenticateToken, employeeController.getEmployees);
router.get("/employees/:id", authenticateToken, employeeController.getEmployee);
router.post("/employees", authenticateToken, requireAdmin, employeeController.createEmployee);
router.put("/employees/:id", authenticateToken, requireAdmin, employeeController.updateEmployee);
router.delete("/employees/:id", authenticateToken, requireAdmin, employeeController.deleteEmployee);

// --- Attendance Actions ---
router.post("/attendance/check-in", authenticateToken, attendanceController.checkIn);
router.post("/attendance/check-out", authenticateToken, attendanceController.checkOut);
router.get("/attendance", authenticateToken, attendanceController.getAttendance);
router.get("/attendance/history", authenticateToken, attendanceController.getAttendanceHistory);

// --- Customers Portfolio CRUD ---
router.get("/customers", authenticateToken, customerController.getCustomers);
router.get("/customers/:id", authenticateToken, customerController.getCustomer);
router.post("/customers", authenticateToken, customerController.createCustomer);
router.put("/customers/:id", authenticateToken, customerController.updateCustomer);
router.delete("/customers/:id", authenticateToken, requireAdmin, customerController.deleteCustomer);

// --- Sales Transaction CRUD ---
router.get("/sales", authenticateToken, saleController.getSales);
router.get("/sales/:id", authenticateToken, saleController.getSale);
router.post("/sales", authenticateToken, saleController.createSale);
router.put("/sales/:id", authenticateToken, requireAdmin, saleController.updateSale);
router.delete("/sales/:id", authenticateToken, requireAdmin, saleController.deleteSale);

// --- Reports Aggregations (Admins only) ---
router.get("/reports/daily-sales", authenticateToken, requireAdmin, reportController.getDailySales);
router.get("/reports/monthly-sales", authenticateToken, requireAdmin, reportController.getMonthlySales);
router.get("/reports/expenses", authenticateToken, requireAdmin, reportController.getExpensesReport);
router.get("/reports/attendance", authenticateToken, requireAdmin, reportController.getAttendanceReport);
router.get("/reports/inventory", authenticateToken, requireAdmin, reportController.getInventoryReport);
router.get("/reports/net-profit", authenticateToken, requireAdmin, reportController.getNetProfitOverview);

// --- Notifications Management ---
router.get("/notifications", authenticateToken, notificationController.getNotifications);
router.put("/notifications/:id/read", authenticateToken, notificationController.markAsRead);
router.delete("/notifications/:id", authenticateToken, notificationController.deleteNotification);

// --- Studio Settings ---
router.get("/settings", authenticateToken, settingsController.getSettings);
router.put("/settings", authenticateToken, requireAdmin, settingsController.updateSettings);

export default router;
