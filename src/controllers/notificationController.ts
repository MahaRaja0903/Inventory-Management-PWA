import { Request, Response } from "express";
import { getFrappeDocs, updateFrappeDoc, deleteFrappeDoc } from "../config/frappeClient";

const mapDoc = (doc: any) => ({ ...doc, _id: doc.name });

export async function getNotifications(req: Request, res: Response): Promise<void> {
  const reqUser = (req as any).user;
  if (!reqUser) {
    res.status(401).json({ message: "Unauthorized credentials" });
    return;
  }

  try {
    let list = await getFrappeDocs("ATS Notification");
    
    if (reqUser.role === "Admin") {
      list = list.filter((n: any) => n.userId === reqUser.id || !n.userId);
    } else {
      list = list.filter((n: any) => n.userId === reqUser.id);
    }

    list.sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt || a.creation || 0).getTime();
      const dateB = new Date(b.createdAt || b.creation || 0).getTime();
      return dateB - dateA;
    });

    res.status(200).json(list.map(mapDoc));
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to query notifications" });
  }
}

export async function markAsRead(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const updated = await updateFrappeDoc("ATS Notification", id, { read: true });
    if (!updated) {
      res.status(404).json({ message: "Notification not found" });
      return;
    }
    res.status(200).json({ message: "Notification marked as read successfully", notification: mapDoc(updated) });
  } catch (error: any) {
    res.status(400).json({ message: "Error updating notification" });
  }
}

export async function deleteNotification(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    await deleteFrappeDoc("ATS Notification", id);
    res.status(200).json({ message: "Notification cleared successfully" });
  } catch (error: any) {
    // Ideally we would check for 404, but assuming error implies failure.
    res.status(500).json({ message: "Failed to clear notification" });
  }
}
