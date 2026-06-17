import mongoose, { Schema } from "mongoose";
import { CustomerHistoryItem as HistoryType } from "../types";

const customerHistorySchema = new Schema<HistoryType>({
  customerId: { type: String, required: true },
  serviceType: { type: String, enum: ["Tattoo", "Piercing", "Consultation", "Touch-Up"], default: "Tattoo" },
  tattooDetails: { type: String, default: "" },
  piercingDetails: { type: String, default: "" },
  amount: { type: Number, default: 0 },
  employeeId: { type: String, required: true },
  serviceDate: { type: String, default: () => new Date().toISOString() }
});

customerHistorySchema.set('toJSON', { virtuals: true, versionKey: false, transform: (doc, ret) => { ret._id = ret._id.toString(); } });

const CustomerHistoryModel = mongoose.model<HistoryType>("CustomerHistory", customerHistorySchema);

export class CustomerHistory {
  static async find(query: Partial<HistoryType> = {}): Promise<HistoryType[]> {
    return await CustomerHistoryModel.find(query).lean();
  }

  static async create(data: Partial<HistoryType>): Promise<HistoryType> {
    const newItem = new CustomerHistoryModel(data);
    return await newItem.save();
  }

  static async deleteByCustomer(customerId: string): Promise<void> {
    await CustomerHistoryModel.deleteMany({ customerId });
  }
}
