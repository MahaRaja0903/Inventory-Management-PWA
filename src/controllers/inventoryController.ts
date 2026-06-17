import { Request, Response } from "express";
import { Inventory } from "../models/Inventory";
import { Notification } from "../models/Notification";

export async function getInventory(req: Request, res: Response): Promise<void> {
  try {
    const list = await Inventory.find();
    res.status(200).json(list);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to load inventory" });
  }
}

export async function getInventoryItem(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const item = await Inventory.findById(id);
    if (!item) {
      res.status(404).json({ message: "Inventory item not found" });
      return;
    }
    res.status(200).json(item);
  } catch (error: any) {
    res.status(500).json({ message: "Error finding item" });
  }
}

export async function createInventoryItem(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  try {
    const data = { ...req.body, createdBy: user.id };
    const newItem = await Inventory.create(data);

    // If item is created at 0 stock, notify
    if (newItem.stockStatus === "Out of Stock") {
      await Notification.create({
        title: "Item Out of Stock!",
        description: `New inventory item "${newItem.itemName}" was logged with 0 quantity.`,
        type: "danger"
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
    const updated = await Inventory.findByIdAndUpdate(id, req.body);
    if (!updated) {
      res.status(404).json({ message: "Item not found" });
      return;
    }

    // Dynamic stock warning trigger
    if (updated.stockStatus === "Low Stock") {
      await Notification.create({
        title: "Low Stock Alert",
        description: `Item "${updated.itemName}" has only ${updated.quantity} units left!`,
        type: "warning"
      });
    } else if (updated.stockStatus === "Out of Stock") {
      await Notification.create({
        title: "Out Of Stock Warning",
        description: `Item "${updated.itemName}" is completely out of stock!`,
        type: "danger"
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
    const success = await Inventory.findByIdAndDelete(id);
    if (!success) {
      res.status(404).json({ message: "Item not found" });
      return;
    }
    res.status(200).json({ message: "Inventory item deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete item" });
  }
}
