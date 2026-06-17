import { Request, Response } from "express";
import { Expense } from "../models/Expense";
import { Notification } from "../models/Notification";

export async function getExpenses(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  try {
    let list;
    if (user.role === "Admin") {
      // Admins see all expenses
      list = await Expense.find();
    } else {
      // Employees only see their own submitted expenses
      list = await Expense.find({ employeeId: user.id });
    }
    res.status(200).json(list);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to load expenses" });
  }
}

export async function getExpense(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const user = (req as any).user;
  try {
    const item = await Expense.findById(id);
    if (!item) {
      res.status(404).json({ message: "Expense not found" });
      return;
    }

    if (user.role !== "Admin" && item.employeeId !== user.id) {
      res.status(403).json({ message: "Denied. You can only view your own expenses" });
      return;
    }

    res.status(200).json(item);
  } catch (error: any) {
    res.status(500).json({ message: "Error loading expense" });
  }
}

export async function createExpense(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  try {
    const expenseData = {
      ...req.body,
      employeeId: user.id,
      status: user.role === "Admin" ? (req.body.status || "Approved") : "Pending", // Admin expenses can auto-approve
      approvedBy: user.role === "Admin" ? user.id : undefined
    };

    const newExpense = await Expense.create(expenseData);

    // Notify administrators if pending approval
    if (newExpense.status === "Pending") {
      await Notification.create({
        title: "New Expense Submitted",
        description: `Employee logged a new expense for "${newExpense.title}" of $${newExpense.amount}.`,
        type: "info"
      });
    }

    res.status(201).json({ message: "Expense submitted successfully", expense: newExpense });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to log expense" });
  }
}

export async function updateExpense(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const user = (req as any).user;
  try {
    const existing = await Expense.findById(id);
    if (!existing) {
      res.status(404).json({ message: "Expense not found" });
      return;
    }

    // Protection rule
    if (user.role !== "Admin" && existing.employeeId !== user.id) {
      res.status(403).json({ message: "Denied. You can only update your own expenses" });
      return;
    }

    // Role verification on approval status edit
    const payload = { ...req.body };
    if (payload.status && payload.status !== existing.status) {
      if (user.role !== "Admin") {
        // Employees cannot approve/reject their own expenses
        delete payload.status;
      } else {
        // Admin setting approval
        payload.approvedBy = user.id;

        // Custom notification to employee
        await Notification.create({
          title: `Expense ${payload.status}`,
          description: `Your expense report for "${existing.title}" was ${payload.status.toLowerCase()}.`,
          type: payload.status === "Approved" ? "success" : "danger"
        });
      }
    }

    const updated = await Expense.findByIdAndUpdate(id, payload);
    res.status(200).json({ message: "Expense updated successfully", expense: updated });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update expense" });
  }
}

export async function deleteExpense(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const user = (req as any).user;
  try {
    const existing = await Expense.findById(id);
    if (!existing) {
      res.status(404).json({ message: "Expense not found" });
      return;
    }

    if (user.role !== "Admin" && existing.employeeId !== user.id) {
      res.status(403).json({ message: "Denied. You can only delete your own submissions" });
      return;
    }

    // Prevent deletion of approved items unless Admin
    if (existing.status === "Approved" && user.role !== "Admin") {
      res.status(400).json({ message: "Cannot delete approved expenses. Ask Administrator." });
      return;
    }

    await Expense.findByIdAndDelete(id);
    res.status(200).json({ message: "Expense item deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete expense" });
  }
}
