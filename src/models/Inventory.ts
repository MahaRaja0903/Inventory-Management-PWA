import mongoose, { Schema } from "mongoose";
import { InventoryItem as InventoryType, StockStatus } from "../types";

const inventorySchema = new Schema<InventoryType>({
  itemName: { type: String, required: true },
  category: { type: String, required: true },
  quantity: { type: Number, default: 0 },
  purchasePrice: { type: Number, default: 0 },
  sellingPrice: { type: Number, default: 0 },
  supplier: { type: String, default: "" },
  notes: { type: String, default: "" },
  stockStatus: { type: String, enum: ["In Stock", "Low Stock", "Out of Stock"], default: "In Stock" },
  createdBy: { type: String, required: true },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() }
});

inventorySchema.set('toJSON', { virtuals: true, versionKey: false, transform: (doc, ret) => { ret._id = ret._id.toString(); } });

const InventoryModel = mongoose.model<InventoryType>("Inventory", inventorySchema);

export class Inventory {
  private static determineStockStatus(quantity: number): StockStatus {
    if (quantity <= 0) return "Out of Stock";
    if (quantity <= 5) return "Low Stock";
    return "In Stock";
  }

  static async find(query: Partial<InventoryType> = {}): Promise<InventoryType[]> {
    return await InventoryModel.find(query).lean();
  }

  static async findById(id: string): Promise<InventoryType | null> {
    return await InventoryModel.findById(id).lean();
  }

  static async create(data: Partial<InventoryType>): Promise<InventoryType> {
    const qty = data.quantity !== undefined ? Number(data.quantity) : 0;
    const newItem = new InventoryModel({
      ...data,
      quantity: qty,
      stockStatus: this.determineStockStatus(qty)
    });
    return await newItem.save();
  }

  static async findByIdAndUpdate(id: string, updates: Partial<InventoryType>): Promise<InventoryType | null> {
    if (updates.quantity !== undefined) {
      updates.stockStatus = this.determineStockStatus(Number(updates.quantity));
    }
    return await InventoryModel.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date().toISOString() },
      { new: true }
    ).lean();
  }

  static async findByIdAndDelete(id: string): Promise<boolean> {
    const result = await InventoryModel.findByIdAndDelete(id);
    return !!result;
  }
}
