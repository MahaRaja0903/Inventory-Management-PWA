import { Request, Response } from "express";
import { getFrappeDocs, updateFrappeDoc } from "../config/frappeClient";

export async function getSettings(req: Request, res: Response): Promise<void> {
  try {
    const configs = await getFrappeDocs("ATS Settings");
    const config = configs.length > 0 ? configs[0] : {};
    if (config.name) config._id = config.name;
    res.status(200).json(config);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to download configuration settings" });
  }
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  try {
    // Assuming ATS Settings is a Single doctype or we just update the first one
    const configs = await getFrappeDocs("ATS Settings");
    if (configs.length > 0) {
      const updated = await updateFrappeDoc("ATS Settings", configs[0].name, req.body);
      if (updated) updated._id = updated.name;
      res.status(200).json({ message: "System configurations updated successfully", settings: updated });
    } else {
      res.status(404).json({ message: "Settings not found to update" });
    }
  } catch (error: any) {
    res.status(400).json({ message: "Failed to apply system modifications" });
  }
}
