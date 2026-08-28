import { Request, Response } from "express";
import { getFrappeDocs, getFrappeDoc, createFrappeDoc, updateFrappeDoc, deleteFrappeDoc } from "../config/frappeClient";

export async function getCustomers(req: Request, res: Response): Promise<void> {
  try {
    const list = await getFrappeDocs("ATS Customer", null, ["name", "name1", "mobile", "email", "address", "totalvisits", "totalspending"]);
    res.status(200).json(list.map((doc: any) => ({ ...doc, _id: doc.name, name: doc.name1 || doc.name, totalVisits: doc.totalvisits, totalSpending: doc.totalspending })));
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to load customers" });
  }
}

export async function getCustomer(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const customer = await getFrappeDoc("ATS Customer", id);
    if (!customer) {
      res.status(404).json({ message: "Customer profile not found" });
      return;
    }
    customer._id = customer.name;
    customer.name = customer.name1 || customer.name;

    const allHistory = await getFrappeDocs("ATS Customer History");
    const history = allHistory.filter((h: any) => h.customerId === id);
    
    const users = await getFrappeDocs("ATS User");
    
    const enrichedHistory = history.map((h: any) => {
      const artist = users.find((u: any) => u.name === h.employeeId);
      return {
        ...h,
        _id: h.name,
        employeeName: artist ? (artist.name1 || artist.name) : "Unknown Artist"
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
    const allCustomers = await getFrappeDocs("ATS Customer");
    const existing = allCustomers.find((c: any) => c.mobile === mobile);
    if (existing) {
      existing._id = existing.name;
      res.status(400).json({ message: "A customer with this mobile number is already registered", customer: existing });
      return;
    }

    const newCustomer = await createFrappeDoc("ATS Customer", {
      name,
      name1: name,
      mobile,
      email: email || "",
      address: address || "",
      totalvisits: 0,
      totalspending: 0
    });

    if (newCustomer) {
      newCustomer._id = newCustomer.name;
      newCustomer.name = newCustomer.name1 || newCustomer.name;
    }

    res.status(201).json({ message: "Customer created successfully", customer: newCustomer });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to register customer" });
  }
}

export async function updateCustomer(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const payload = { ...req.body };
    if (payload.name) {
      payload.name1 = payload.name;
    }

    const updated = await updateFrappeDoc("ATS Customer", id, payload);
    if (!updated) {
      res.status(404).json({ message: "Customer record not found" });
      return;
    }
    updated._id = updated.name;
    updated.name = updated.name1 || updated.name;
    res.status(200).json({ message: "Customer profile updated successfully", customer: updated });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update profile" });
  }
}

export async function deleteCustomer(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const success = await deleteFrappeDoc("ATS Customer", id);
    if (!success) {
      res.status(404).json({ message: "Customer record not found" });
      return;
    }

    const allHistory = await getFrappeDocs("ATS Customer History");
    const historyToDelete = allHistory.filter((h: any) => h.customerId === id);
    for (const h of historyToDelete) {
      await deleteFrappeDoc("ATS Customer History", h.name);
    }

    res.status(200).json({ message: "Customer and their design history records deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete customer record" });
  }
}
