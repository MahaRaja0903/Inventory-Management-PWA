import mongoose, { Schema } from "mongoose";
import { Expense as ExpenseType } from "../types";

const expenseSchema = new Schema<ExpenseType>({
  title: { type: String, required: true },
  category: { type: String, required: true },
  amount: { type: Number, default: 0 },
  date: { type: String, required: true },
  notes: { type: String, default: "" },
  receiptImage: { type: String },
  status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
  employeeId: { type: String, required: true },
  approvedBy: { type: String },
  createdAt: { type: String, default: () => new Date().toISOString() }
});

expenseSchema.set('toJSON', { virtuals: true, versionKey: false, transform: (doc, ret) => { ret._id = ret._id.toString(); } });

const ExpenseModel = mongoose.model<ExpenseType>("Expense", expenseSchema);

export class Expense {
  static async find(query: Partial<ExpenseType> = {}): Promise<ExpenseType[]> {
    return await ExpenseModel.find(query).lean();
  }

  static async findById(id: string): Promise<ExpenseType | null> {
    return await ExpenseModel.findById(id).lean();
  }

  static async create(data: Partial<ExpenseType>): Promise<ExpenseType> {
    const newExpense = new ExpenseModel(data);
    return await newExpense.save();
  }

  static async findByIdAndUpdate(id: string, updates: Partial<ExpenseType>): Promise<ExpenseType | null> {
    return await ExpenseModel.findByIdAndUpdate(id, updates, { new: true }).lean();
  }

  static async findByIdAndDelete(id: string): Promise<boolean> {
    const result = await ExpenseModel.findByIdAndDelete(id);
    return !!result;
  }
}
