import { Request, Response } from "express";
import { Settings } from "../models/Settings";

export async function getSettings(req: Request, res: Response): Promise<void> {
  try {
    const config = await Settings.get();
    res.status(200).json(config);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to download configuration settings" });
  }
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  try {
    const updated = await Settings.update(req.body);
    res.status(200).json({ message: "System configurations updated successfully", settings: updated });
  } catch (error: any) {
    res.status(400).json({ message: "Failed to apply system modifications" });
  }
}
