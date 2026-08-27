import { Request, Response } from "express";
import { getFrappeDoc, updateFrappeDoc } from "../config/frappeClient";

export async function getSettings(req: Request, res: Response): Promise<void> {
  try {
    const config = await getFrappeDoc("ATS Settings", "ATS Settings");
    if (config && config.name) config._id = config.name;
    res.status(200).json(config || {});
  } catch (error: any) {
    res.status(500).json({ message: "Failed to download configuration settings" });
  }
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  try {
    // Assuming ATS Settings is a Single doctype
    const config = await getFrappeDoc("ATS Settings", "ATS Settings");
    if (config) {
      const updated = await updateFrappeDoc("ATS Settings", "ATS Settings", req.body);
      if (updated) updated._id = updated.name;
      res.status(200).json({ message: "System configurations updated successfully", settings: updated });
    } else {
      res.status(404).json({ message: "Settings not found to update" });
    }
  } catch (error: any) {
    res.status(400).json({ message: "Failed to apply system modifications" });
  }
}
