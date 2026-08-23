import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { getFrappeDocs, getFrappeDoc, createFrappeDoc, updateFrappeDoc, deleteFrappeDoc } from "../config/frappeClient";

export async function getEmployees(req: Request, res: Response): Promise<void> {
  try {
    const list = await getFrappeDocs("ATS User");
    res.status(200).json(list.map((doc: any) => ({ ...doc, _id: doc.name })));
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to load employees" });
  }
}

export async function getEmployee(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const employee = await getFrappeDoc("ATS User", id);
    if (!employee) {
      res.status(404).json({ message: "Employee record not found" });
      return;
    }
    employee._id = employee.name;
    res.status(200).json(employee);
  } catch (error: any) {
    res.status(500).json({ message: "Error locating employee" });
  }
}

export async function createEmployee(req: Request, res: Response): Promise<void> {
  const { name, email, password, role, phone, status, profileImage } = req.body;

  if (!name || !email) {
    res.status(400).json({ message: "Name and email are required to registers employee" });
    return;
  }

  try {
    const allUsers = await getFrappeDocs("ATS User");
    const existing = allUsers.find((u: any) => u.email === email.toLowerCase());
    
    if (existing) {
      res.status(400).json({ message: "An employee with this email already exists" });
      return;
    }

    const salt = bcrypt.genSaltSync(10);
    const rawPass = password || "Test@123";
    const hashedPassword = bcrypt.hashSync(rawPass, salt);

    const newEmployee = await createFrappeDoc("ATS User", {
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || "Employee",
      phone: phone || "",
      status: status || "Active",
      profileImage: profileImage || undefined
    });

    if (newEmployee) newEmployee._id = newEmployee.name;

    res.status(201).json({
      message: "Employee registered successfully",
      employee: {
        id: newEmployee._id,
        name: newEmployee.full_name || newEmployee.name_field || newEmployee.name,
        email: newEmployee.email,
        role: newEmployee.role,
        phone: newEmployee.phone,
        status: newEmployee.status,
        profileImage: newEmployee.profileImage
      }
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to registers employee" });
  }
}

export async function updateEmployee(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, email, password, role, phone, status, profileImage } = req.body;

  try {
    const existing = await getFrappeDoc("ATS User", id);
    if (!existing) {
      res.status(404).json({ message: "Employee not found" });
      return;
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email.toLowerCase();
    if (role !== undefined) updates.role = role;
    if (phone !== undefined) updates.phone = phone;
    if (status !== undefined) updates.status = status;
    if (profileImage !== undefined) updates.profileImage = profileImage;

    if (password) {
      const salt = bcrypt.genSaltSync(10);
      updates.password = bcrypt.hashSync(password, salt);
    }

    const updated = await updateFrappeDoc("ATS User", id, updates);
    if (updated) updated._id = updated.name;
    
    res.status(200).json({ message: "Employee updated successfully", employee: updated });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update employee" });
  }
}

export async function deleteEmployee(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const requestingUser = (req as any).user;
    if (requestingUser && requestingUser.id === id) {
      res.status(400).json({ message: "Cannot delete your own active administrator account" });
      return;
    }

    const success = await deleteFrappeDoc("ATS User", id);
    if (!success) {
      res.status(404).json({ message: "Employee not found" });
      return;
    }
    res.status(200).json({ message: "Employee deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete employee" });
  }
}
