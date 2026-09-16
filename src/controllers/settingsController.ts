import { Request, Response } from "express";
import { getFrappeDoc, updateFrappeDoc } from "../config/frappeClient";
import { toApp, toFrappe, toBool, toCheckbox } from "../config/fieldMap";

const DOCTYPE = "ATS Settings";
const SINGLE_NAME = "ATS Settings";

/** Fallbacks for settings the doctype may not carry yet. */
export const DEFAULT_GEOFENCE_RADIUS_M = 100;
export const DEFAULT_MINIMUM_SHIFT_HOURS = 8;

/**
 * The stored document is flat and lowercase (`studioname`, `geofenceenabled`), while
 * the Settings screen reads a nested `profileSettings` object. That mismatch made the
 * page load blank and silently discard every save.
 */
function toClientShape(doc: any) {
  const mapped = toApp<any>(DOCTYPE, doc) || {};
  return {
    _id: mapped._id,
    theme: mapped.theme || "dark",
    notificationEnabled: toBool(mapped.notificationEnabled),
    profileSettings: {
      studioName: mapped.studioName || "",
      studioEmail: mapped.studioEmail || "",
      studioPhone: mapped.studioPhone || "",
      studioAddress: mapped.studioAddress || "",
    },
    geofenceEnabled: toBool(mapped.geofenceEnabled),
    geofenceLatitude: mapped.geofenceLatitude !== undefined ? Number(mapped.geofenceLatitude) : undefined,
    geofenceLongitude: mapped.geofenceLongitude !== undefined ? Number(mapped.geofenceLongitude) : undefined,
    geofenceRadius: Number(mapped.geofenceRadius) || DEFAULT_GEOFENCE_RADIUS_M,
    minimumShiftHours:
      mapped.minimumShiftHours !== undefined && mapped.minimumShiftHours !== ""
        ? Number(mapped.minimumShiftHours)
        : DEFAULT_MINIMUM_SHIFT_HOURS,
  };
}

/** Shared by the attendance controller so the rules live in one place. */
export async function loadSettings() {
  return toClientShape(await getFrappeDoc(DOCTYPE, SINGLE_NAME));
}

export async function getSettings(_req: Request, res: Response): Promise<void> {
  try {
    res.status(200).json(await loadSettings());
  } catch (error: any) {
    res.status(500).json({ message: "Failed to download configuration settings" });
  }
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body || {};
    const profile = body.profileSettings || {};

    const payload = toFrappe(DOCTYPE, {
      theme: body.theme,
      studioName: profile.studioName,
      studioEmail: profile.studioEmail,
      studioPhone: profile.studioPhone,
      studioAddress: profile.studioAddress,
      notificationEnabled:
        body.notificationEnabled !== undefined ? toCheckbox(body.notificationEnabled) : undefined,
      geofenceEnabled:
        body.geofenceEnabled !== undefined ? toCheckbox(body.geofenceEnabled) : undefined,
      geofenceLatitude: body.geofenceLatitude,
      geofenceLongitude: body.geofenceLongitude,
      geofenceRadius: body.geofenceRadius,
      minimumShiftHours: body.minimumShiftHours,
    });

    if (Object.keys(payload).length === 0) {
      res.status(400).json({ message: "No settings were supplied to update" });
      return;
    }

    // Fields the doctype doesn't define yet are rejected individually rather than
    // failing the whole save, so the studio profile still updates.
    let updated;
    try {
      updated = await updateFrappeDoc(DOCTYPE, SINGLE_NAME, payload);
    } catch (error: any) {
      const optional = ["geofenceradius", "minimumshifthours"];
      const trimmed = { ...payload };
      let removedAny = false;
      for (const key of optional) {
        if (key in trimmed) {
          delete trimmed[key];
          removedAny = true;
        }
      }
      if (!removedAny) throw error;
      console.warn(
        "[settings] Retrying without geofenceradius/minimumshifthours — add these fields to the ATS Settings doctype to make them configurable."
      );
      updated = await updateFrappeDoc(DOCTYPE, SINGLE_NAME, trimmed);
    }

    res.status(200).json({
      message: "System configurations updated successfully",
      settings: toClientShape(updated),
    });
  } catch (error: any) {
    console.error("[settings] Failed to update:", error.message);
    res.status(400).json({ message: "Failed to apply system modifications" });
  }
}
