import { Request, Response } from "express";
import { getFrappeDocs, createFrappeDoc, updateFrappeDoc } from "../config/frappeClient";
import { toApp, toAppList, toFrappe } from "../config/fieldMap";
import { loadSettings } from "./settingsController";

const DOCTYPE = "ATS Attendance";
const USER_DOCTYPE = "ATS User";

/** Great-circle distance in metres. */
function distanceInMetres(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Frappe datetimes are `YYYY-MM-DD HH:mm:ss` in local time. */
function frappeNow(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
}

function parseFrappeDate(value: string | undefined): number {
  if (!value) return NaN;
  // Safari will not parse a space-separated datetime; normalise to ISO first.
  return new Date(String(value).replace(" ", "T")).getTime();
}

async function withEmployeeNames(records: any[]): Promise<any[]> {
  if (records.length === 0) return records;
  const users = toAppList(USER_DOCTYPE, await getFrappeDocs(USER_DOCTYPE));
  const byId = new Map(users.map((u: any) => [u._id, u]));

  return records.map((item: any) => {
    const emp = byId.get(item.employeeId);
    return {
      ...item,
      checkInTime: item.checkInTime || item.createdAt,
      employeeName: emp?.name || "Unknown Employee",
      employeeEmail: emp?.email || "",
    };
  });
}

export async function checkIn(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const todayStr = new Date().toISOString().split("T")[0];

  try {
    const all = toAppList(DOCTYPE, await getFrappeDocs(DOCTYPE));
    const existing = all.find((a: any) => a.employeeId === user.id && a.date === todayStr);

    if (existing) {
      res.status(400).json({ message: "You are already checked in for today!", attendance: existing });
      return;
    }

    const { gpsLocation } = req.body;
    const settings = await loadSettings();

    if (settings.geofenceEnabled) {
      if (!gpsLocation || gpsLocation === "Unknown") {
        res.status(400).json({ message: "Location required for check-in when geofencing is enabled." });
        return;
      }

      const [rawLat, rawLon] = String(gpsLocation).split(",");
      const lat = parseFloat(rawLat);
      const lon = parseFloat(rawLon);
      const targetLat = Number(settings.geofenceLatitude);
      const targetLon = Number(settings.geofenceLongitude);

      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        res.status(400).json({ message: "Could not read your location. Please try again." });
        return;
      }

      if (Number.isFinite(targetLat) && Number.isFinite(targetLon)) {
        // The radius is configurable and defaults to 100 m. It was hard-coded at 5 m,
        // which is tighter than consumer GPS accuracy, so check-in was near-impossible.
        const radius = settings.geofenceRadius;
        const distance = distanceInMetres(lat, lon, targetLat, targetLon);

        if (distance > radius) {
          res.status(400).json({
            message: `You are about ${Math.round(distance)} m from the studio. Check-in is allowed within ${radius} m.`,
          });
          return;
        }
      }
    }

    const nowFormatted = frappeNow();
    const record = toApp<any>(
      DOCTYPE,
      await createFrappeDoc(
        DOCTYPE,
        toFrappe(DOCTYPE, {
          employeeId: user.id,
          checkInTime: nowFormatted,
          gpsLocation: gpsLocation || "Unknown",
          date: todayStr,
          status: "Checked In",
          workingHours: 0,
        })
      )
    );

    record.checkInTime = record.checkInTime || nowFormatted;
    res.status(201).json({ message: "Checked in successfully!", attendance: record });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to check in" });
  }
}

export async function checkOut(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const todayStr = new Date().toISOString().split("T")[0];

  try {
    const all = toAppList(DOCTYPE, await getFrappeDocs(DOCTYPE));
    const existing = all.find(
      (a: any) => a.employeeId === user.id && a.date === todayStr && a.status === "Checked In"
    );

    if (!existing) {
      res.status(400).json({
        message: "No active check-in session found for today. Please check in first!",
      });
      return;
    }

    const now = new Date();
    const inTime = parseFrappeDate(existing.checkInTime || existing.createdAt);
    const hours = Number.isFinite(inTime)
      ? Number(((now.getTime() - inTime) / (1000 * 60 * 60)).toFixed(2))
      : 0;

    const settings = await loadSettings();
    const minimumHours = settings.minimumShiftHours;

    if (minimumHours > 0 && hours < minimumHours) {
      res.status(400).json({
        message: `A shift must be at least ${minimumHours} hours before checking out. You have worked ${hours} hours so far.`,
      });
      return;
    }

    const nowFormatted = frappeNow();
    const updated = toApp<any>(
      DOCTYPE,
      await updateFrappeDoc(
        DOCTYPE,
        existing._id,
        toFrappe(DOCTYPE, {
          checkOutTime: nowFormatted,
          status: "Checked Out",
          workingHours: hours,
        })
      )
    );

    updated.checkOutTime = updated.checkOutTime || nowFormatted;
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
    let list = toAppList(DOCTYPE, await getFrappeDocs(DOCTYPE));

    if (date) list = list.filter((a: any) => a.date === date);
    if (user.role !== "Admin") list = list.filter((a: any) => a.employeeId === user.id);

    res.status(200).json(await withEmployeeNames(list));
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to load attendance list" });
  }
}

export async function getAttendanceHistory(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;

  try {
    let list = toAppList(DOCTYPE, await getFrappeDocs(DOCTYPE));
    if (user.role !== "Admin") list = list.filter((a: any) => a.employeeId === user.id);

    list.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.status(200).json(await withEmployeeNames(list));
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to fetch history" });
  }
}
