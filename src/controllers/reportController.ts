import { Request, Response } from "express";
import { getFrappeDocs } from "../config/frappeClient";
import { toAppList } from "../config/fieldMap";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const round2 = (n: number) => parseFloat((n || 0).toFixed(2));

export async function getDailySales(_req: Request, res: Response): Promise<void> {
  try {
    const list = toAppList("ATS Sale", await getFrappeDocs("ATS Sale"));
    const dailyMap: Record<string, { count: number; revenue: number; discount: number }> = {};

    // Seed the last 7 days so the chart always has a continuous run of columns.
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dailyMap[d.toISOString().split("T")[0]] = { count: 0, revenue: 0, discount: 0 };
    }

    list.forEach((sale: any) => {
      const dateStr = String(sale.createdAt || "").substring(0, 10);
      if (!dateStr) return;
      if (!dailyMap[dateStr]) dailyMap[dateStr] = { count: 0, revenue: 0, discount: 0 };
      dailyMap[dateStr].count += 1;
      dailyMap[dateStr].revenue += Number(sale.finalAmount) || 0;
      dailyMap[dateStr].discount += Number(sale.discount) || 0;
    });

    const result = Object.keys(dailyMap)
      .map((date) => ({
        date,
        count: dailyMap[date].count,
        revenue: round2(dailyMap[date].revenue),
        discount: round2(dailyMap[date].discount),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to generate daily sales reports" });
  }
}

export async function getMonthlySales(_req: Request, res: Response): Promise<void> {
  try {
    const list = toAppList("ATS Sale", await getFrappeDocs("ATS Sale"));
    const monthlyMap: Record<string, { count: number; revenue: number }> = {};

    const year = new Date().getFullYear();
    MONTHS.forEach((_, idx) => {
      monthlyMap[`${year}-${String(idx + 1).padStart(2, "0")}`] = { count: 0, revenue: 0 };
    });

    list.forEach((sale: any) => {
      const monthKey = String(sale.createdAt || "").substring(0, 7);
      if (!monthKey || monthKey.length !== 7) return;
      if (!monthlyMap[monthKey]) monthlyMap[monthKey] = { count: 0, revenue: 0 };
      monthlyMap[monthKey].count += 1;
      monthlyMap[monthKey].revenue += Number(sale.finalAmount) || 0;
    });

    const result = Object.keys(monthlyMap)
      .map((monthStr) => {
        const [yr, mo] = monthStr.split("-");
        return {
          month: monthStr,
          name: `${MONTHS[parseInt(mo, 10) - 1] || mo} ${yr}`,
          count: monthlyMap[monthStr].count,
          revenue: round2(monthlyMap[monthStr].revenue),
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month));

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to generate monthly sales reports" });
  }
}

export async function getExpensesReport(_req: Request, res: Response): Promise<void> {
  try {
    const list = toAppList("ATS Expense", await getFrappeDocs("ATS Expense"));

    let totalExpense = 0;
    let approvedExpense = 0;
    let pendingExpense = 0;
    const categoryMap: Record<string, number> = {};

    list.forEach((item: any) => {
      const amount = Number(item.amount) || 0;
      totalExpense += amount;
      if (item.status === "Approved") approvedExpense += amount;
      else if (item.status === "Pending") pendingExpense += amount;

      const category = item.category || "Uncategorised";
      categoryMap[category] = (categoryMap[category] || 0) + amount;
    });

    res.status(200).json({
      totalExpense: round2(totalExpense),
      approvedExpense: round2(approvedExpense),
      pendingExpense: round2(pendingExpense),
      breakdown: Object.keys(categoryMap).map((name) => ({ name, value: round2(categoryMap[name]) })),
      rawList: list,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to compile expenses report" });
  }
}

export async function getAttendanceReport(_req: Request, res: Response): Promise<void> {
  try {
    const list = toAppList("ATS Attendance", await getFrappeDocs("ATS Attendance"));
    const allUsers = toAppList("ATS User", await getFrappeDocs("ATS User"));
    const employees = allUsers.filter((u: any) => u.role === "Employee");

    const attendanceSummary = employees.map((user: any) => {
      const shifts = list.filter((a: any) => a.employeeId === user._id);
      const totalPresentDays = shifts.filter((a: any) => a.status === "Checked Out").length;
      const activeCheckins = shifts.filter((a: any) => a.status === "Checked In").length;

      const hoursLogged = shifts
        .map((s: any) => Number(s.workingHours))
        .filter((h: number) => Number.isFinite(h) && h > 0);

      const sumHours = hoursLogged.reduce((acc: number, h: number) => acc + h, 0);
      const avgHours = hoursLogged.length > 0 ? parseFloat((sumHours / hoursLogged.length).toFixed(1)) : 0;

      return {
        // `name` is the display label; the document key is the ID and is not a person's name.
        employeeName: user.name,
        employeeEmail: user.email,
        totalPresentDays,
        activeCheckins,
        averageShiftHours: avgHours,
        totalHoursWorked: parseFloat(sumHours.toFixed(1)),
      };
    });

    res.status(200).json({
      totalRegisteredEmployees: employees.length,
      averageShiftDuration:
        attendanceSummary.length > 0
          ? round2(
              attendanceSummary.reduce((acc, cur) => acc + cur.averageShiftHours, 0) /
                attendanceSummary.length
            )
          : 0,
      employeeBreakdown: attendanceSummary,
      rawLogs: list,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to generate attendance reports" });
  }
}

export async function getInventoryReport(_req: Request, res: Response): Promise<void> {
  try {
    // Reading through `toAppList` is what makes these figures non-zero — the handler
    // used to read `quantity`/`purchasePrice`/`stockStatus`/`category` straight off the
    // Frappe document, where every one of those keys is undefined.
    const list = toAppList("ATS Inventory Item", await getFrappeDocs("ATS Inventory Item"));

    const lowStockItems = list.filter((i: any) => i.stockStatus === "Low Stock");
    const outOfStockItems = list.filter((i: any) => i.stockStatus === "Out of Stock");

    let totalStockUnits = 0;
    let totalAssetValue = 0;
    const categoryCounts: Record<string, number> = {};

    list.forEach((item: any) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.purchasePrice) || 0;
      totalStockUnits += qty;
      totalAssetValue += qty * price;

      const category = item.category || "Uncategorised";
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    res.status(200).json({
      totalUniqueItems: list.length,
      totalStockUnits,
      totalAssetValue: round2(totalAssetValue),
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
      lowStockItems,
      outOfStockItems,
      categories: Object.keys(categoryCounts).map((category) => ({
        category,
        itemsCount: categoryCounts[category],
      })),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to build inventory analytical reports" });
  }
}

export async function getNetProfitOverview(_req: Request, res: Response): Promise<void> {
  try {
    const sales = toAppList("ATS Sale", await getFrappeDocs("ATS Sale"));
    const expenses = toAppList("ATS Expense", await getFrappeDocs("ATS Expense"));

    const totalSales = sales.reduce((sum: number, item: any) => sum + (Number(item.finalAmount) || 0), 0);
    const totalExpenses = expenses
      .filter((e: any) => e.status === "Approved")
      .reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);

    res.status(200).json({
      sales: round2(totalSales),
      approvedExpenses: round2(totalExpenses),
      netProfit: round2(totalSales - totalExpenses),
    });
  } catch (error) {
    res.status(500).json({ message: "Error compiling net profit statistics" });
  }
}
