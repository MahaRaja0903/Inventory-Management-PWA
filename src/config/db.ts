import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { User } from "../models/User";
import { Settings } from "../models/Settings";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/aquariustattoo";

export async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB successfully");
    await seedDB();
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
}

async function seedDB() {
  try {
    const User = mongoose.model("User");
    const Inventory = mongoose.model("Inventory");
    const Customer = mongoose.model("Customer");
    const Sale = mongoose.model("Sale");
    const Expense = mongoose.model("Expense");
    const Notification = mongoose.model("Notification");

    const userCount = await User.countDocuments();
    let adminId = "";
    let employeeId = "";

    if (userCount === 0) {
      const salt = bcrypt.genSaltSync(10);
      const adminPasswordHash = bcrypt.hashSync("Test@123", salt);
      const employeePasswordHash = bcrypt.hashSync("Test@123", salt);

      const users = await User.create([
        {
          name: "Admin Manager",
          email: "admin@gmail.com",
          password: adminPasswordHash,
          role: "Admin",
          phone: "+1 (555) 0199",
          status: "Active",
          profileImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
        },
        {
          name: "Employee Artist",
          email: "employee@gmail.com",
          password: employeePasswordHash,
          role: "Employee",
          phone: "+1 (555) 0188",
          status: "Active",
          profileImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
        }
      ]);
      adminId = users[0]._id.toString();
      employeeId = users[1]._id.toString();
      console.log("Database seeded with default accounts.");
    } else {
      const admin = await User.findOne({ role: "Admin" });
      const emp = await User.findOne({ role: "Employee" });
      adminId = admin?._id.toString() || "";
      employeeId = emp?._id.toString() || "";
    }

    // Seed Inventory
    if (await Inventory.countDocuments() === 0) {
      await Inventory.create([
        { itemName: "Black Ink (Aura Eclipse)", category: "Inks", quantity: 12, purchasePrice: 15.0, supplier: "Inkwell Suppliers", createdBy: adminId },
        { itemName: "Red Radiant Ink 30ml", category: "Inks", quantity: 2, purchasePrice: 18.0, supplier: "Radiant Colors", createdBy: adminId },
        { itemName: "Disposable Needles 3RL", category: "Needles", quantity: 150, purchasePrice: 0.25, supplier: "Precision Corp", createdBy: adminId },
        { itemName: "Titanium Nose Studs", category: "Piercing", quantity: 0, purchasePrice: 2.20, supplier: "Titan Jewels", createdBy: adminId }
      ]);
      console.log("Inventory seeded.");
    }

    // Seed Customers
    let marianneId = "";
    if (await Customer.countDocuments() === 0) {
      const customers = await Customer.create([
        { name: "Marianne Vance", mobile: "555-0155", email: "marianne@vance.com", address: "42 Ocean Drive", totalVisits: 0, totalSpending: 0 },
        { name: "John Doe", mobile: "555-0144", email: "john.doe@gmail.com", address: "782 Main Street", totalVisits: 0, totalSpending: 0 }
      ]);
      marianneId = customers[0]._id.toString();
      console.log("Customers seeded.");
    }

    // Seed Sales (This will also update customer spending via model hooks)
    if (await Sale.countDocuments() === 0 && marianneId) {
      const { Sale: SaleClass } = await import("../models/Sale");
      await SaleClass.create({ customerId: marianneId, employeeId, serviceType: "Tattoo", amount: 300, discount: 20, paymentMethod: "UPI" });
      console.log("Sales seeded.");
    }

    // Seed Expenses
    if (await Expense.countDocuments() === 0) {
      await Expense.create([
        { title: "Surgical Gloves Refill", category: "Sanitation", amount: 85.0, date: new Date().toISOString().split("T")[0], status: "Approved", employeeId, approvedBy: adminId }
      ]);
      console.log("Expenses seeded.");
    }

    // Seed Notifications
    if (await Notification.countDocuments() === 0) {
      await Notification.create({ title: "Welcome to Aquarius", description: "System migration to MongoDB complete.", type: "success" });
    }

    // Ensure default settings
    await Settings.get();
    
    console.log("Seeding check complete.");
  } catch (error) {
    console.error("Error during seeding:", error);
  }
}

// Keep generateId for compatibility if needed, but Mongoose handles IDs automatically
export function generateId(): string {
  return new mongoose.Types.ObjectId().toString();
}

// These are no longer needed with MongoDB but kept as stubs if other files import them
// to prevent immediate crashes until refactored.
export function readCollection<T>(collectionName: string): T[] {
  console.warn(`readCollection called for ${collectionName}. This is deprecated.`);
  return [];
}

export function writeCollection<T>(collectionName: string, data: T[]): void {
  console.warn(`writeCollection called for ${collectionName}. This is deprecated.`);
}

export function initDB() {
  // Now called connectDB() in server.ts
  connectDB();
}
