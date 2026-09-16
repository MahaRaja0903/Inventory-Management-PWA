import { Request, Response } from "express";
import { getFrappeDocs, getFrappeDoc, createFrappeDoc, updateFrappeDoc, deleteFrappeDoc } from "../config/frappeClient";
import { toApp, toAppList, toFrappe } from "../config/fieldMap";
import { notify, notifyAdmins } from "../lib/notify";
import { formatAmount } from "../lib/money";

const DOCTYPE = "ATS Expense";
const USER_DOCTYPE = "ATS User";

/** Attach the submitter's name so the approval list shows a person, not a raw ID. */
async function withEmployeeNames(expenses: any[]): Promise<any[]> {
  if (expenses.length === 0) return expenses;
  const users = toAppList(USER_DOCTYPE, await getFrappeDocs(USER_DOCTYPE));
  const byId = new Map(users.map((u: any) => [u._id, u]));

  return expenses.map((exp: any) => ({
    ...exp,
    employeeName: byId.get(exp.employeeId)?.name || "Unknown Employee",
    approvedByName: exp.approvedBy ? byId.get(exp.approvedBy)?.name || "" : "",
  }));
}

export async function getExpenses(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  try {
    let list = toAppList(DOCTYPE, await getFrappeDocs(DOCTYPE));
    if (user.role !== "Admin") {
      list = list.filter((e: any) => e.employeeId === user.id);
    }
    res.status(200).json(await withEmployeeNames(list));
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to load expenses" });
  }
}

export async function getExpense(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const user = (req as any).user;
  try {
    const item = toApp<any>(DOCTYPE, await getFrappeDoc(DOCTYPE, id));
    if (!item) {
      res.status(404).json({ message: "Expense not found" });
      return;
    }

    if (user.role !== "Admin" && item.employeeId !== user.id) {
      res.status(403).json({ message: "Denied. You can only view your own expenses" });
      return;
    }

    const [enriched] = await withEmployeeNames([item]);
    res.status(200).json(enriched);
  } catch (error: any) {
    res.status(500).json({ message: "Error loading expense" });
  }
}

export async function createExpense(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const { title, category, amount, date, notes, receiptImage } = req.body;

  if (!title || amount === undefined || !date) {
    res.status(400).json({ message: "Title, Amount and Date are required fields" });
    return;
  }

  const parsedAmount = Number(amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    res.status(400).json({ message: "Amount must be a positive number" });
    return;
  }

  try {
    const isAdmin = user.role === "Admin";
    const status = isAdmin ? req.body.status || "Approved" : "Pending";

    const newExpense = toApp<any>(
      DOCTYPE,
      await createFrappeDoc(
        DOCTYPE,
        toFrappe(DOCTYPE, {
          title,
          category,
          amount: parsedAmount,
          date,
          notes,
          receiptImage,
          employeeId: user.id,
          status,
          approvedBy: isAdmin ? user.id : "",
        })
      )
    );

    if (newExpense.status === "Pending") {
      await notifyAdmins({
        title: "New Expense Submitted",
        description: `${user.name || "An employee"} logged a new expense for "${title}" of ${formatAmount(parsedAmount)}.`,
        type: "info",
      });
    }

    const [enriched] = await withEmployeeNames([newExpense]);
    res.status(201).json({ message: "Expense submitted successfully", expense: enriched });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to log expense" });
  }
}

export async function updateExpense(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const user = (req as any).user;

  try {
    const existing = toApp<any>(DOCTYPE, await getFrappeDoc(DOCTYPE, id));
    if (!existing) {
      res.status(404).json({ message: "Expense not found" });
      return;
    }

    if (user.role !== "Admin" && existing.employeeId !== user.id) {
      res.status(403).json({ message: "Denied. You can only update your own expenses" });
      return;
    }

    const payload = toFrappe(DOCTYPE, req.body);
    const statusChanged = req.body.status && req.body.status !== existing.status;

    if (statusChanged) {
      if (user.role !== "Admin") {
        // Employees cannot approve or reject anything, including their own submissions.
        delete payload.status;
      } else {
        payload.approvedby = user.id;
        await notify({
          userId: existing.employeeId,
          title: `Expense ${req.body.status}`,
          description: `Your expense report for "${existing.title}" was ${String(req.body.status).toLowerCase()}.`,
          type: req.body.status === "Approved" ? "success" : "danger",
        });
      }
    }

    const updated = toApp<any>(DOCTYPE, await updateFrappeDoc(DOCTYPE, id, payload));
    const [enriched] = await withEmployeeNames([updated]);

    res.status(200).json({ message: "Expense updated successfully", expense: enriched });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update expense" });
  }
}

export async function deleteExpense(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const user = (req as any).user;

  try {
    const existing = toApp<any>(DOCTYPE, await getFrappeDoc(DOCTYPE, id));
    if (!existing) {
      res.status(404).json({ message: "Expense not found" });
      return;
    }

    if (user.role !== "Admin" && existing.employeeId !== user.id) {
      res.status(403).json({ message: "Denied. You can only delete your own submissions" });
      return;
    }

    if (existing.status === "Approved" && user.role !== "Admin") {
      res.status(400).json({ message: "Cannot delete approved expenses. Ask Administrator." });
      return;
    }

    await deleteFrappeDoc(DOCTYPE, id);
    res.status(200).json({ message: "Expense item deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete expense" });
  }
}
