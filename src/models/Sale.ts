import mongoose, { Schema } from "mongoose";
import { Sale as SaleType } from "../types";
import { Customer } from "./Customer";

const saleSchema = new Schema<SaleType>({
  customerId: { type: String, required: true },
  employeeId: { type: String, required: true },
  serviceType: { type: String, enum: ["Tattoo", "Piercing", "Aftercare Product", "Other"], default: "Tattoo" },
  amount: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  finalAmount: { type: Number, default: 0 },
  paymentMethod: { type: String, enum: ["Cash", "Card", "Bank Transfer", "UPI"], default: "UPI" },
  createdAt: { type: String, default: () => new Date().toISOString() }
});

saleSchema.set('toJSON', { virtuals: true, versionKey: false, transform: (doc, ret) => { ret._id = ret._id.toString(); } });

const SaleModel = mongoose.model<SaleType>("Sale", saleSchema);

export class Sale {
  static async find(query: Partial<SaleType> = {}): Promise<SaleType[]> {
    return await SaleModel.find(query).lean();
  }

  static async findById(id: string): Promise<SaleType | null> {
    return await SaleModel.findById(id).lean();
  }

  static async create(data: Partial<SaleType>): Promise<SaleType> {
    const amount = data.amount !== undefined ? Number(data.amount) : 0;
    const discount = data.discount !== undefined ? Number(data.discount) : 0;
    const finalAmount = Math.max(0, amount - discount);

    const newSale = new SaleModel({
      ...data,
      amount,
      discount,
      finalAmount
    });
    const savedSale = await newSale.save();

    if (savedSale.customerId) {
      const customerObj = await Customer.findById(savedSale.customerId);
      if (customerObj) {
        await Customer.findByIdAndUpdate(savedSale.customerId, {
          totalVisits: (customerObj.totalVisits || 0) + 1,
          totalSpending: (customerObj.totalSpending || 0) + finalAmount
        });
      }
    }

    return savedSale;
  }

  static async findByIdAndUpdate(id: string, updates: Partial<SaleType>): Promise<SaleType | null> {
    const oldSale = await SaleModel.findById(id);
    if (!oldSale) return null;

    const amount = updates.amount !== undefined ? Number(updates.amount) : oldSale.amount;
    const discount = updates.discount !== undefined ? Number(updates.discount) : oldSale.discount;
    const finalAmount = Math.max(0, amount - discount);

    const updatedSale = await SaleModel.findByIdAndUpdate(
      id,
      { ...updates, amount, discount, finalAmount },
      { new: true }
    ).lean();

    if (updatedSale && oldSale.customerId) {
      const customerObj = await Customer.findById(oldSale.customerId);
      if (customerObj) {
        const difference = finalAmount - oldSale.finalAmount;
        await Customer.findByIdAndUpdate(oldSale.customerId, {
          totalSpending: Math.max(0, (customerObj.totalSpending || 0) + difference)
        });
      }
    }

    return updatedSale;
  }

  static async findByIdAndDelete(id: string): Promise<boolean> {
    const saleToDelete = await SaleModel.findByIdAndDelete(id);
    if (!saleToDelete) return false;

    if (saleToDelete.customerId) {
      const customerObj = await Customer.findById(saleToDelete.customerId);
      if (customerObj) {
        await Customer.findByIdAndUpdate(saleToDelete.customerId, {
          totalVisits: Math.max(0, (customerObj.totalVisits || 1) - 1),
          totalSpending: Math.max(0, (customerObj.totalSpending || 0) - saleToDelete.finalAmount)
        });
      }
    }

    return true;
  }
}
