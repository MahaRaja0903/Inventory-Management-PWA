import { Request, Response } from "express";
import { Notification } from "../models/Notification";

export async function getNotifications(req: Request, res: Response): Promise<void> {
  const reqUser = (req as any).user;
  if (!reqUser) {
    res.status(401).json({ message: "Unauthorized credentials" });
    return;
  }

  try {
    let query: any = {};
    if (reqUser.role === "Admin") {
      query = {
        $or: [
          { userId: reqUser.id },
          { userId: null },
          { userId: { $exists: false } }
        ]
      };
    } else {
      query = { userId: reqUser.id };
    }

    const list = await Notification.find(query);
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.status(200).json(list);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to query notifications" });
  }
}

export async function markAsRead(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const updated = await Notification.markAsRead(id);
    if (!updated) {
      res.status(404).json({ message: "Notification not found" });
      return;
    }
    res.status(200).json({ message: "Notification marked as read successfully", notification: updated });
  } catch (error: any) {
    res.status(400).json({ message: "Error updating notification" });
  }
}

export async function deleteNotification(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const success = await Notification.delete(id);
    if (!success) {
      res.status(404).json({ message: "Notification not found" });
      return;
    }
    res.status(200).json({ message: "Notification cleared successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to clear notification" });
  }
}
