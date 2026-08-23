import { Request, Response } from "express";
import { getFrappeDocs, getFrappeDoc, createFrappeDoc, updateFrappeDoc, deleteFrappeDoc } from "../config/frappeClient";

export async function checkIn(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const todayStr = new Date().toISOString().split("T")[0];

  try {
    const allAttendance = await getFrappeDocs("ATS Attendance");
    const existing = allAttendance.find((a: any) => a.employeeId === user.id && a.date === todayStr);
    
    if (existing) {
      existing._id = existing.name;
      res.status(400).json({ message: "You are already checked in for today!", attendance: existing });
      return;
    }

    const { gpsLocation } = req.body;

    const record = await createFrappeDoc("ATS Attendance", {
      employeeId: user.id,
      checkInTime: new Date().toISOString(),
      gpsLocation: gpsLocation || "34.0522, -118.2437",
      date: todayStr,
      status: "Checked In"
    });

    if (record) record._id = record.name;

    res.status(201).json({ message: "Checked in successfully!", attendance: record });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to check in" });
  }
}

export async function checkOut(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const todayStr = new Date().toISOString().split("T")[0];

  try {
    const allAttendance = await getFrappeDocs("ATS Attendance");
    const existing = allAttendance.find((a: any) => a.employeeId === user.id && a.date === todayStr && a.status === "Checked In");

    if (!existing) {
      res.status(400).json({ message: "No active check-in session found for today. Please check in first!" });
      return;
    }

    const updated = await updateFrappeDoc("ATS Attendance", existing.name, {
      checkOutTime: new Date().toISOString(),
      status: "Checked Out"
    });

    if (updated) updated._id = updated.name;

    res.status(200).json({ message: "Checked out successfully!", attendance: updated });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to check out" });
  }
}

export async function getAttendance(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const { date } = req.query;

  try {
    let list = await getFrappeDocs("ATS Attendance");
    
    if (date) {
      list = list.filter((a: any) => a.date === date);
    }

    if (user.role !== "Admin") {
      list = list.filter((a: any) => a.employeeId === user.id);
    }

    const users = await getFrappeDocs("ATS User");
    const enriched = list.map((item: any) => {
      item._id = item.name;
      const emp = users.find((u: any) => u.name === item.employeeId);
      return {
        ...item,
        employeeName: emp ? (emp.full_name || emp.name_field || emp.name) : "Unknown Employee",
        employeeEmail: emp ? emp.email : ""
      };
    });

    res.status(200).json(enriched);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to load attendance list" });
  }
}

export async function getAttendanceHistory(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;

  try {
    let list = await getFrappeDocs("ATS Attendance");
    
    if (user.role !== "Admin") {
      list = list.filter((a: any) => a.employeeId === user.id);
    }

    list.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const users = await getFrappeDocs("ATS User");
    const enriched = list.map((item: any) => {
      item._id = item.name;
      const emp = users.find((u: any) => u.name === item.employeeId);
      return {
        ...item,
        employeeName: emp ? (emp.full_name || emp.name_field || emp.name) : "Unknown Employee"
      };
    });

    res.status(200).json(enriched);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to fetch history" });
  }
}
