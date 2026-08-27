import { Request, Response } from "express";
import { getFrappeDocs } from "../config/frappeClient";

const mapDoc = (doc: any) => ({ ...doc, _id: doc.name });

export async function getDailySales(req: Request, res: Response): Promise<void> {
  try {
    const list = await getFrappeDocs("ATS Sale");
    
    // Aggregate by last 30 days
    const dailyMap: { [date: string]: { count: number, revenue: number, discount: number } } = {};
    
    // Pre-populate last 7 days to ensure chart has continuous stream
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      dailyMap[dateStr] = { count: 0, revenue: 0, discount: 0 };
    }

    list.forEach((sale: any) => {
      const dateString = sale.createdAt || sale.creation;
      const dateStr = dateString ? dateString.substring(0, 10) : undefined;
      if (dateStr) {
        if (!dailyMap[dateStr]) {
          dailyMap[dateStr] = { count: 0, revenue: 0, discount: 0 };
        }
        dailyMap[dateStr].count += 1;
        const finalAmt = sale.finalAmount !== undefined ? sale.finalAmount : (sale.finalamount || 0);
        dailyMap[dateStr].revenue += finalAmt;
        dailyMap[dateStr].discount += (sale.discount || 0);
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
    const list = await getFrappeDocs("ATS Sale");
    const monthlyMap: { [month: string]: { count: number, revenue: number } } = {};

    // Pre-fill some months
    const year = new Date().getFullYear();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    months.forEach((m, idx) => {
      const key = `${year}-${String(idx + 1).padStart(2, '0')}`;
      monthlyMap[key] = { count: 0, revenue: 0 };
    });

    list.forEach((sale: any) => {
      const dateString = sale.createdAt || sale.creation;
      const dateParts = dateString ? dateString.substring(0, 10).split("-") : null;
      if (dateParts && dateParts.length >= 2) {
        const monthKey = `${dateParts[0]}-${dateParts[1]}`;
        if (!monthlyMap[monthKey]) {
          monthlyMap[monthKey] = { count: 0, revenue: 0 };
        }
        monthlyMap[monthKey].count += 1;
        const finalAmt = sale.finalAmount !== undefined ? sale.finalAmount : (sale.finalamount || 0);
        monthlyMap[monthKey].revenue += finalAmt;
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
    const list = await getFrappeDocs("ATS Expense");
    
    let totalExpense = 0;
    let approvedExpense = 0;
    let pendingExpense = 0;
    const categoryMap: { [cat: string]: number } = {};

    list.forEach((item: any) => {
      const amount = item.amount || 0;
      totalExpense += amount;
      if (item.status === "Approved") {
        approvedExpense += amount;
      } else if (item.status === "Pending") {
        pendingExpense += amount;
      }

      if (!categoryMap[item.category]) {
        categoryMap[item.category] = 0;
      }
      categoryMap[item.category] += amount;
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
      rawList: list.map(mapDoc)
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to compile expenses report" });
  }
}

export async function getAttendanceReport(req: Request, res: Response): Promise<void> {
  try {
    const list = await getFrappeDocs("ATS Attendance");
    const allUsers = await getFrappeDocs("ATS User");
    const users = allUsers.filter((u: any) => u.role === "Employee");

    const attendanceSummary = users.map((user: any) => {
      const shifts = list.filter((a: any) => (a.employeeid || a.employeeId) === user.name);
      const totalPresentDays = shifts.filter((a: any) => a.status === "Checked Out").length;
      const activeCheckins = shifts.filter((a: any) => a.status === "Checked In").length;
      
      let sumHours = 0;
      let countHours = 0;
      shifts.forEach((s: any) => {
        const hours = s.workinghours !== undefined ? s.workinghours : s.workingHours;
        if (hours !== undefined) {
          sumHours += hours;
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
        ? parseFloat((attendanceSummary.reduce((acc: number, current: any) => acc + current.averageShiftHours, 0) / attendanceSummary.length).toFixed(2))
        : 0,
      employeeBreakdown: attendanceSummary,
      rawLogs: list.map(mapDoc)
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to generate attendance reports" });
  }
}

export async function getInventoryReport(req: Request, res: Response): Promise<void> {
  try {
    const list = await getFrappeDocs("ATS Inventory Item");

    const lowStockItems = list.filter((i: any) => i.stockStatus === "Low Stock");
    const outOfStockItems = list.filter((i: any) => i.stockStatus === "Out of Stock");
    
    let totalItems = 0;
    let totalAssetValue = 0;
    const categoryCounts: { [cat: string]: number } = {};

    list.forEach((item: any) => {
      const qty = item.quantity || 0;
      const price = item.purchasePrice || 0;
      totalItems += qty;
      totalAssetValue += qty * price;

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
      lowStockItems: lowStockItems.map(mapDoc),
      outOfStockItems: outOfStockItems.map(mapDoc),
      categories: categorySummary
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to build inventory analytical reports" });
  }
}

export async function getNetProfitOverview(req: Request, res: Response): Promise<void> {
  try {
    const sales = await getFrappeDocs("ATS Sale");
    const expenses = await getFrappeDocs("ATS Expense");
    const approvedExpenses = expenses.filter((e: any) => e.status === "Approved");

    const totalSales = sales.reduce((sum: number, item: any) => {
      const amt = item.finalAmount !== undefined ? item.finalAmount : (item.finalamount || 0);
      return sum + amt;
    }, 0);
    const totalExpenses = approvedExpenses.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
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
