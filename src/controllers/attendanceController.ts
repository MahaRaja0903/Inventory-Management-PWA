import { Request, Response } from "express";
import { Attendance } from "../models/Attendance";
import { User } from "../models/User";

export async function checkIn(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const todayStr = new Date().toISOString().split("T")[0];

  try {
    // Check if already checked in today
    const existing = await Attendance.findOne({ employeeId: user.id, date: todayStr });
    
    if (existing) {
      res.status(400).json({ message: "You are already checked in for today!", attendance: existing });
      return;
    }

    const { gpsLocation } = req.body;

    const record = await Attendance.create({
      employeeId: user.id,
      checkInTime: new Date().toISOString(),
      gpsLocation: gpsLocation || "34.0522, -118.2437",
      date: todayStr,
      status: "Checked In"
    });

    res.status(201).json({ message: "Checked in successfully!", attendance: record });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to check in" });
  }
}

export async function checkOut(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const todayStr = new Date().toISOString().split("T")[0];

  try {
    const existing = await Attendance.findOne({ employeeId: user.id, date: todayStr, status: "Checked In" });

    if (!existing) {
      res.status(400).json({ message: "No active check-in session found for today. Please check in first!" });
      return;
    }

    const updated = await Attendance.findByIdAndUpdate(existing._id, {
      checkOutTime: new Date().toISOString(),
      status: "Checked Out"
    });

    res.status(200).json({ message: "Checked out successfully!", attendance: updated });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to check out" });
  }
}

export async function getAttendance(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const { date } = req.query;

  try {
    let list;
    const query: any = {};
    if (date) {
      query.date = date;
    }

    if (user.role === "Admin") {
      // Admin sees everyone
      list = await Attendance.find(query);
    } else {
      // Employee sees only their own
      query.employeeId = user.id;
      list = await Attendance.find(query);
    }

    // Attach employee names for easy readability
    const users = await User.find();
    const enriched = list.map(item => {
      const emp = users.find(u => u._id === item.employeeId);
      return {
        ...item,
        employeeName: emp ? emp.name : "Unknown Employee",
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
    let list;
    if (user.role === "Admin") {
      list = await Attendance.find();
    } else {
      list = await Attendance.find({ employeeId: user.id });
    }

    // Sort by checking date descending
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const users = await User.find();
    const enriched = list.map(item => {
      const emp = users.find(u => u._id === item.employeeId);
      return {
        ...item,
        employeeName: emp ? emp.name : "Unknown Employee"
      };
    });

    res.status(200).json(enriched);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to fetch history" });
  }
}
