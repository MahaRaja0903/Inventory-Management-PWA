import { Request, Response } from "express";
import { getFrappeDocs, getFrappeDoc, createFrappeDoc, updateFrappeDoc, deleteFrappeDoc } from "../config/frappeClient";

function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
  var R = 6371e3; // Radius of the earth in m
  var dLat = deg2rad(lat2-lat1);  
  var dLon = deg2rad(lon2-lon1); 
  var a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var d = R * c; 
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI/180)
}

function mapFrappeFields(a: any) {
  return {
    ...a,
    employeeId: a.employeeid || a.employeeId,
    checkInTime: a.checkintime || a.checkInTime,
    checkOutTime: a.checkouttime || a.checkOutTime,
    gpsLocation: a.gpslocation || a.gpsLocation,
    workingHours: a.workinghours !== undefined ? a.workinghours : a.workingHours
  };
}

export async function checkIn(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const todayStr = new Date().toISOString().split("T")[0];

  try {
    const rawAttendance = await getFrappeDocs("ATS Attendance");
    const allAttendance = rawAttendance.map(mapFrappeFields);
    const existing = allAttendance.find((a: any) => a.employeeId === user.id && a.date === todayStr);
    
    if (existing) {
      existing._id = existing.name;
      res.status(400).json({ message: "You are already checked in for today!", attendance: existing });
      return;
    }

    const { gpsLocation } = req.body;

    // Geo-fencing logic
    const configs = await getFrappeDocs("ATS Settings");
    const config = configs.length > 0 ? configs[0] : null;
    
    if (config && config.geofenceEnabled) {
      if (!gpsLocation || gpsLocation === "Unknown") {
         res.status(400).json({ message: "Location required for check-in when geofencing is enabled." });
         return;
      }
      
      const parts = gpsLocation.split(",");
      if (parts.length === 2) {
        const lat = parseFloat(parts[0].trim());
        const lon = parseFloat(parts[1].trim());
        const targetLat = parseFloat(config.geofenceLatitude);
        const targetLon = parseFloat(config.geofenceLongitude);
        
        if (!isNaN(targetLat) && !isNaN(targetLon)) {
          const distance = getDistanceFromLatLonInM(lat, lon, targetLat, targetLon);
          if (distance > 2) { 
             res.status(400).json({ message: `You must be within 2 meters from the Store Radius.` });
             return;
          }
        }
      }
    }

    const nowIso = new Date().toISOString();
    let record = await createFrappeDoc("ATS Attendance", {
      employeeid: user.id,
      checkintime: nowIso,
      gpslocation: gpsLocation || "34.0522, -118.2437",
      date: todayStr,
      status: "Checked In",
      workinghours: 0
    });

    if (record) record._id = record.name;
    record = mapFrappeFields(record);
    record.checkInTime = record.checkInTime || nowIso;

    res.status(201).json({ message: "Checked in successfully!", attendance: record });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to check in" });
  }
}

export async function checkOut(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const todayStr = new Date().toISOString().split("T")[0];

  try {
    const rawAttendance = await getFrappeDocs("ATS Attendance");
    const allAttendance = rawAttendance.map(mapFrappeFields);
    const existing = allAttendance.find((a: any) => a.employeeId === user.id && a.date === todayStr && a.status === "Checked In");

    if (!existing) {
      res.status(400).json({ message: "No active check-in session found for today. Please check in first!" });
      return;
    }

    const now = new Date();
    const inTimeStr = existing.checkInTime || existing.creation || now.toISOString();
    const inTime = new Date(inTimeStr).getTime();
    const outTime = now.getTime();
    
    let hours = 0;
    if (!isNaN(inTime)) {
      hours = Number(((outTime - inTime) / (1000 * 60 * 60)).toFixed(2));
    }
    
    if (hours < 8) {
      res.status(400).json({ message: `Minimum 8 hours required for check out. You have only worked ${hours} hours.` });
      return;
    }

    let updated = await updateFrappeDoc("ATS Attendance", existing.name, {
      checkouttime: now.toISOString(),
      status: "Checked Out",
      workinghours: hours
    });

    if (updated) updated._id = updated.name;
    updated = mapFrappeFields(updated);
    
    updated.checkOutTime = updated.checkOutTime || now.toISOString();
    updated.workingHours = updated.workingHours !== undefined ? updated.workingHours : hours;

    res.status(200).json({ message: "Checked out successfully!", attendance: updated });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to check out" });
  }
}

export async function getAttendance(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const { date } = req.query;

  try {
    const rawList = await getFrappeDocs("ATS Attendance");
    let list = rawList.map(mapFrappeFields);
    
    if (date) {
      list = list.filter((a: any) => a.date === date);
    }

    if (user.role !== "Admin") {
      list = list.filter((a: any) => a.employeeId === user.id);
    }

    const users = await getFrappeDocs("ATS User");
    const enriched = list.map((item: any) => {
      item._id = item.name;
      item.checkInTime = item.checkInTime || item.creation;
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
    const rawList = await getFrappeDocs("ATS Attendance");
    let list = rawList.map(mapFrappeFields);
    
    if (user.role !== "Admin") {
      list = list.filter((a: any) => a.employeeId === user.id);
    }

    list.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const users = await getFrappeDocs("ATS User");
    const enriched = list.map((item: any) => {
      item._id = item.name;
      item.checkInTime = item.checkInTime || item.creation;
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
