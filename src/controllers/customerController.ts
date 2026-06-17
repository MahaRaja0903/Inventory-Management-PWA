import { Request, Response } from "express";
import { Customer } from "../models/Customer";
import { CustomerHistory } from "../models/CustomerHistory";
import { User } from "../models/User";

export async function getCustomers(req: Request, res: Response): Promise<void> {
  try {
    const list = await Customer.find();
    res.status(200).json(list);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to load customers" });
  }
}

export async function getCustomer(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const customer = await Customer.findById(id);
    if (!customer) {
      res.status(404).json({ message: "Customer profile not found" });
      return;
    }

    // Enrich with their complete portfolio history
    const history = await CustomerHistory.find({ customerId: id });
    const users = await User.find();
    
    const enrichedHistory = history.map(h => {
      const artist = users.find(u => u._id === h.employeeId);
      return {
        ...h,
        employeeName: artist ? artist.name : "Unknown Artist"
      };
    });

    res.status(200).json({
      ...customer,
      history: enrichedHistory
    });
  } catch (error: any) {
    res.status(500).json({ message: "Error locating customer record" });
  }
}

export async function createCustomer(req: Request, res: Response): Promise<void> {
  const { name, mobile, email, address } = req.body;

  if (!name || !mobile) {
    res.status(400).json({ message: "Name and Mobile number are required fields" });
    return;
  }

  try {
    const existing = await Customer.findOne({ mobile });
    if (existing) {
      res.status(400).json({ message: "A customer with this mobile number is already registered", customer: existing });
      return;
    }

    const newCustomer = await Customer.create({
      name,
      mobile,
      email: email || "",
      address: address || "",
      totalVisits: 0,
      totalSpending: 0
    });

    res.status(201).json({ message: "Customer created successfully", customer: newCustomer });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to register customer" });
  }
}

export async function updateCustomer(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const updated = await Customer.findByIdAndUpdate(id, req.body);
    if (!updated) {
      res.status(404).json({ message: "Customer record not found" });
      return;
    }
    res.status(200).json({ message: "Customer profile updated successfully", customer: updated });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update profile" });
  }
}

export async function deleteCustomer(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const success = await Customer.findByIdAndDelete(id);
    if (!success) {
      res.status(404).json({ message: "Customer record not found" });
      return;
    }

    // Clean up related history entries
    await CustomerHistory.deleteByCustomer(id);

    res.status(200).json({ message: "Customer and their design history records deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete customer record" });
  }
}
