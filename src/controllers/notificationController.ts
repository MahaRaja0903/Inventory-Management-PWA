import { Request, Response } from "express";
import { getFrappeDocs, getFrappeDoc, updateFrappeDoc, deleteFrappeDoc } from "../config/frappeClient";
import { toApp, toAppList, toBool } from "../config/fieldMap";

const DOCTYPE = "ATS Notification";

export async function getNotifications(req: Request, res: Response): Promise<void> {
  const reqUser = (req as any).user;
  if (!reqUser) {
    res.status(401).json({ message: "Unauthorized credentials" });
    return;
  }

  try {
    const list = toAppList(DOCTYPE, await getFrappeDocs(DOCTYPE));

    // Studio-wide alerts carry no userId; anything with one is addressed to a person.
    const visible = list.filter((n: any) => {
      const target = n.userId || "";
      if (!target) return reqUser.role === "Admin";
      return target === reqUser.id;
    });

    visible.sort(
      (a: any, b: any) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    res.status(200).json(visible.map((n: any) => ({ ...n, isRead: toBool(n.isRead) })));
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to query notifications" });
  }
}

export async function markAsRead(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const reqUser = (req as any).user;

  try {
    const existing = toApp<any>(DOCTYPE, await getFrappeDoc(DOCTYPE, id));
    if (!existing) {
      res.status(404).json({ message: "Notification not found" });
      return;
    }

    if (existing.userId && existing.userId !== reqUser.id && reqUser.role !== "Admin") {
      res.status(403).json({ message: "You can only update your own notifications" });
      return;
    }

    const updated = toApp<any>(DOCTYPE, await updateFrappeDoc(DOCTYPE, id, { isread: 1 }));
    res.status(200).json({
      message: "Notification marked as read successfully",
      notification: { ...updated, isRead: toBool(updated?.isRead) },
    });
  } catch (error: any) {
    res.status(400).json({ message: "Error updating notification" });
  }
}

export async function deleteNotification(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const reqUser = (req as any).user;

  try {
    const existing = toApp<any>(DOCTYPE, await getFrappeDoc(DOCTYPE, id));
    if (!existing) {
      res.status(404).json({ message: "Notification not found" });
      return;
    }

    if (existing.userId && existing.userId !== reqUser.id && reqUser.role !== "Admin") {
      res.status(403).json({ message: "You can only clear your own notifications" });
      return;
    }

    await deleteFrappeDoc(DOCTYPE, id);
    res.status(200).json({ message: "Notification cleared successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to clear notification" });
  }
}
