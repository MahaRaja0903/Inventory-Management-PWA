import { Request, Response } from "express";
import {
  getFrappeDocs,
  getFrappeDoc,
  createFrappeDoc,
  updateFrappeDoc,
  deleteFrappeDoc
} from "../config/frappeClient";

// Optionally we can define the DocType names here
const INVENTORY_DOCTYPE = "ATS Inventory Item";
const NOTIFICATION_DOCTYPE = "ATS Notification";

export async function getInventory(req: Request, res: Response): Promise<void> {
  try {
    const list = await getFrappeDocs(INVENTORY_DOCTYPE);
    
    // Map Frappe's `name` property to `_id` so the frontend doesn't break
    const mappedList = list.map(item => ({ ...item, _id: item.name }));
    
    res.status(200).json(mappedList);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to load inventory" });
  }
}

export async function getInventoryItem(req: Request, res: Response): Promise<void> {
  const { id } = req.params; // ID is the 'name' in Frappe
  try {
    const item = await getFrappeDoc(INVENTORY_DOCTYPE, id);
    if (!item) {
      res.status(404).json({ message: "Inventory item not found" });
      return;
    }
    res.status(200).json({ ...item, _id: item.name });
  } catch (error: any) {
    res.status(500).json({ message: "Error finding item" });
  }
}

export async function createInventoryItem(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  try {
    const data = { ...req.body, createdBy: user.id };
    
    // Create doc in Frappe
    const newItem = await createFrappeDoc(INVENTORY_DOCTYPE, data);
    newItem._id = newItem.name;

    // If item is created at 0 stock, notify
    if (newItem.stockStatus === "Out of Stock") {
      await createFrappeDoc(NOTIFICATION_DOCTYPE, {
        title: "Item Out of Stock!",
        description: `New inventory item "${newItem.itemName}" was logged with 0 quantity.`,
        type: "danger",
        isRead: 0
      });
    }

    res.status(201).json({ message: "Inventory item created successfully", item: newItem });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to create inventory item" });
  }
}

export async function updateInventoryItem(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    // Remove _id from body if it's there to avoid Frappe trying to update the PK
    const { _id, name, ...updateData } = req.body;
    
    const updated = await updateFrappeDoc(INVENTORY_DOCTYPE, id, updateData);
    if (!updated) {
      res.status(404).json({ message: "Item not found" });
      return;
    }
    updated._id = updated.name;

    // Dynamic stock warning trigger
    if (updated.stockStatus === "Low Stock") {
      await createFrappeDoc(NOTIFICATION_DOCTYPE, {
        title: "Low Stock Alert",
        description: `Item "${updated.itemName}" has only ${updated.quantity} units left!`,
        type: "warning",
        isRead: 0
      });
    } else if (updated.stockStatus === "Out of Stock") {
      await createFrappeDoc(NOTIFICATION_DOCTYPE, {
        title: "Out Of Stock Warning",
        description: `Item "${updated.itemName}" is completely out of stock!`,
        type: "danger",
        isRead: 0
      });
    }

    res.status(200).json({ message: "Inventory item updated successfully", item: updated });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update item" });
  }
}

export async function deleteInventoryItem(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const success = await deleteFrappeDoc(INVENTORY_DOCTYPE, id);
    if (!success) {
      res.status(404).json({ message: "Item not found" });
      return;
    }
    res.status(200).json({ message: "Inventory item deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete item" });
  }
}
