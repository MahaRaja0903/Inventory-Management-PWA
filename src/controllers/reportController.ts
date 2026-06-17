import { Request, Response } from "express";
import { Sale } from "../models/Sale";
import { Expense } from "../models/Expense";
import { Inventory } from "../models/Inventory";
import { Attendance } from "../models/Attendance";
import { User } from "../models/User";

export async function getDailySales(req: Request, res: Response): Promise<void> {
  try {
    const list = await Sale.find();
    
    // Aggregate by last 30 days
    const dailyMap: { [date: string]: { count: number, revenue: number, discount: number } } = {};
    
    // Pre-populate last 7 days to ensure chart has continuous stream
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      dailyMap[dateStr] = { count: 0, revenue: 0, discount: 0 };
    }

    list.forEach(sale => {
      const dateStr = sale.createdAt?.split("T")[0];
      if (dateStr) {
        if (!dailyMap[dateStr]) {
          dailyMap[dateStr] = { count: 0, revenue: 0, discount: 0 };
        }
        dailyMap[dateStr].count += 1;
        dailyMap[dateStr].revenue += sale.finalAmount;
        dailyMap[dateStr].discount += sale.discount;
      }
    });

    const result = Object.keys(dailyMap).map(date => ({
      date,
      count: dailyMap[date].count,
      revenue: parseFloat(dailyMap[date].revenue.toFixed(2)),
      discount: parseFloat(dailyMap[date].discount.toFixed(2))
    })).sort((a, b) => a.date.localeCompare(b.date));

    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to generate daily sales reports" });
  }
}

export async function getMonthlySales(req: Request, res: Response): Promise<void> {
  try {
    const list = await Sale.find();
    const monthlyMap: { [month: string]: { count: number, revenue: number } } = {};

    // Pre-fill some months
    const year = new Date().getFullYear();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    months.forEach((m, idx) => {
      const key = `${year}-${String(idx + 1).padStart(2, '0')}`;
      monthlyMap[key] = { count: 0, revenue: 0 };
    });

    list.forEach(sale => {
      const dateParts = sale.createdAt?.split("T")[0].split("-");
      if (dateParts && dateParts.length >= 2) {
        const monthKey = `${dateParts[0]}-${dateParts[1]}`;
        if (!monthlyMap[monthKey]) {
          monthlyMap[monthKey] = { count: 0, revenue: 0 };
        }
        monthlyMap[monthKey].count += 1;
        monthlyMap[monthKey].revenue += sale.finalAmount;
      }
    });

    const result = Object.keys(monthlyMap).map(monthStr => {
      const parts = monthStr.split("-");
      const monthIdx = parseInt(parts[1]) - 1;
      const monthLabel = months[monthIdx] || parts[1];
      return {
        month: monthStr,
        name: `${monthLabel} ${parts[0]}`,
        count: monthlyMap[monthStr].count,
        revenue: parseFloat(monthlyMap[monthStr].revenue.toFixed(2))
      };
    }).sort((a, b) => a.month.localeCompare(b.month));

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to generate monthly sales reports" });
  }
}

export async function getExpensesReport(req: Request, res: Response): Promise<void> {
  try {
    const list = await Expense.find();
    
    let totalExpense = 0;
    let approvedExpense = 0;
    let pendingExpense = 0;
    const categoryMap: { [cat: string]: number } = {};

    list.forEach(item => {
      totalExpense += item.amount;
      if (item.status === "Approved") {
        approvedExpense += item.amount;
      } else if (item.status === "Pending") {
        pendingExpense += item.amount;
      }

      if (!categoryMap[item.category]) {
        categoryMap[item.category] = 0;
      }
      categoryMap[item.category] += item.amount;
    });

    const breakdown = Object.keys(categoryMap).map(category => ({
      name: category,
      value: parseFloat(categoryMap[category].toFixed(2))
    }));

    res.status(200).json({
      totalExpense: parseFloat(totalExpense.toFixed(2)),
      approvedExpense: parseFloat(approvedExpense.toFixed(2)),
      pendingExpense: parseFloat(pendingExpense.toFixed(2)),
      breakdown,
      rawList: list
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to compile expenses report" });
  }
}

export async function getAttendanceReport(req: Request, res: Response): Promise<void> {
  try {
    const list = await Attendance.find();
    const users = await User.find({ role: "Employee" });

    const attendanceSummary = users.map(user => {
      const shifts = list.filter(a => a.employeeId === user._id);
      const totalPresentDays = shifts.filter(a => a.status === "Checked Out").length;
      const activeCheckins = shifts.filter(a => a.status === "Checked In").length;
      
      let sumHours = 0;
      let countHours = 0;
      shifts.forEach(s => {
        if (s.workingHours !== undefined) {
          sumHours += s.workingHours;
          countHours++;
        }
      });

      const avgHours = countHours > 0 ? parseFloat((sumHours / countHours).toFixed(1)) : 0;

      return {
        employeeName: user.name,
        employeeEmail: user.email,
        totalPresentDays,
        activeCheckins,
        averageShiftHours: avgHours,
        totalHoursWorked: parseFloat(sumHours.toFixed(1))
      };
    });

    res.status(200).json({
      totalRegisteredEmployees: users.length,
      averageShiftDuration: attendanceSummary.length > 0
        ? parseFloat((attendanceSummary.reduce((acc, current) => acc + current.averageShiftHours, 0) / attendanceSummary.length).toFixed(2))
        : 0,
      employeeBreakdown: attendanceSummary,
      rawLogs: list
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to generate attendance reports" });
  }
}

export async function getInventoryReport(req: Request, res: Response): Promise<void> {
  try {
    const list = await Inventory.find();

    const lowStockItems = list.filter(i => i.stockStatus === "Low Stock");
    const outOfStockItems = list.filter(i => i.stockStatus === "Out of Stock");
    
    let totalItems = 0;
    let totalAssetValue = 0;
    const categoryCounts: { [cat: string]: number } = {};

    list.forEach(item => {
      totalItems += item.quantity;
      totalAssetValue += item.quantity * item.purchasePrice;

      if (!categoryCounts[item.category]) {
        categoryCounts[item.category] = 0;
      }
      categoryCounts[item.category] += 1;
    });

    const categorySummary = Object.keys(categoryCounts).map(cat => ({
      category: cat,
      itemsCount: categoryCounts[cat]
    }));

    res.status(200).json({
      totalUniqueItems: list.length,
      totalStockUnits: totalItems,
      totalAssetValue: parseFloat(totalAssetValue.toFixed(2)),
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
      lowStockItems,
      outOfStockItems,
      categories: categorySummary
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to build inventory analytical reports" });
  }
}
export async function getNetProfitOverview(req: Request, res: Response): Promise<void> {
  try {
    const sales = await Sale.find();
    const expenses = await Expense.find({ status: "Approved" });

    const totalSales = sales.reduce((sum, item) => sum + item.finalAmount, 0);
    const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
    const netProfit = totalSales - totalExpenses;

    res.status(200).json({
      sales: parseFloat(totalSales.toFixed(2)),
      approvedExpenses: parseFloat(totalExpenses.toFixed(2)),
      netProfit: parseFloat(netProfit.toFixed(2))
    });
  } catch (error) {
    res.status(500).json({ message: "Error compiling net profit statistics" });
  }
}
