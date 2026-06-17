import mongoose, { Schema } from "mongoose";
import { Customer as CustomerType } from "../types";

const customerSchema = new Schema<CustomerType>({
  name: { type: String, required: true },
  mobile: { type: String, required: true },
  email: { type: String, required: true },
  address: { type: String, default: "" },
  totalVisits: { type: Number, default: 0 },
  totalSpending: { type: Number, default: 0 },
  createdAt: { type: String, default: () => new Date().toISOString() }
});

customerSchema.set('toJSON', { virtuals: true, versionKey: false, transform: (doc, ret) => { ret._id = ret._id.toString(); } });

const CustomerModel = mongoose.model<CustomerType>("Customer", customerSchema);

export class Customer {
  static async find(query: Partial<CustomerType> = {}): Promise<CustomerType[]> {
    return await CustomerModel.find(query).lean();
  }

  static async findById(id: string): Promise<CustomerType | null> {
    return await CustomerModel.findById(id).lean();
  }

  static async findOne(query: Partial<CustomerType>): Promise<CustomerType | null> {
    return await CustomerModel.findOne(query).lean();
  }

  static async create(data: Partial<CustomerType>): Promise<CustomerType> {
    const newCustomer = new CustomerModel({
      ...data,
      name: data.name || "Walk-In Client"
    });
    return await newCustomer.save();
  }

  static async findByIdAndUpdate(id: string, updates: Partial<CustomerType>): Promise<CustomerType | null> {
    return await CustomerModel.findByIdAndUpdate(id, updates, { new: true }).lean();
  }

  static async findByIdAndDelete(id: string): Promise<boolean> {
    const result = await CustomerModel.findByIdAndDelete(id);
    return !!result;
  }
}
