import mongoose, { Schema } from "mongoose";
import { User as UserType } from "../types";

const userSchema = new Schema<UserType>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["Admin", "Employee"], default: "Employee" },
  phone: { type: String, default: "" },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  profileImage: { type: String },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() }
}, {
  timestamps: false // We are managing createdAt/updatedAt as strings for now to match frontend
});

// For Mongoose to return _id as a string in JSON and matching the frontend expectation
userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    // ret._id is already there, but we want to ensure it's a string
    ret._id = ret._id.toString();
  }
});

const UserModel = mongoose.model<UserType>("User", userSchema);

export class User {
  static async find(query: Partial<UserType> = {}): Promise<UserType[]> {
    return await UserModel.find(query).lean();
  }

  static async findOne(query: Partial<UserType>): Promise<UserType | null> {
    return await UserModel.findOne(query).lean();
  }

  static async findById(id: string): Promise<UserType | null> {
    return await UserModel.findById(id).lean();
  }

  static async create(data: Partial<UserType>): Promise<UserType> {
    const newUser = new UserModel({
      ...data,
      profileImage: data.profileImage || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(data.name || 'User')}`,
    });
    return await newUser.save();
  }

  static async findByIdAndUpdate(id: string, updates: Partial<UserType>): Promise<UserType | null> {
    return await UserModel.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date().toISOString() },
      { new: true }
    ).lean();
  }

  static async findByIdAndDelete(id: string): Promise<boolean> {
    const result = await UserModel.findByIdAndDelete(id);
    return !!result;
  }
}
