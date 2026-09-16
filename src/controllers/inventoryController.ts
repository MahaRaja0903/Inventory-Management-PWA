import { Request, Response } from "express";
import {
  getFrappeDocs,
  getFrappeDoc,
  createFrappeDoc,
  updateFrappeDoc,
  deleteFrappeDoc,
} from "../config/frappeClient";
import { toApp, toAppList, toFrappe } from "../config/fieldMap";
import { deriveStockStatus } from "../lib/stock";
import { notify } from "../lib/notify";

const DOCTYPE = "ATS Inventory Item";

/**
 * `tattoo_item_group` is a Frappe Link field, not free text. Saving a category that
 * isn't a registered group fails with a raw LinkValidationError stack trace, which is
 * what made "Add Item" unusable. Categories are now served to the form as a dropdown
 * and validated here so a bad value produces a readable message.
 */
const CATEGORY_DOCTYPE = "Tattoo Item Group";

async function listCategories(): Promise<string[]> {
  const groups = await getFrappeDocs(CATEGORY_DOCTYPE, null, ["name"]);
  return groups.map((g: any) => g.name);
}

export async function getCategories(_req: Request, res: Response): Promise<void> {
  try {
    res.status(200).json(await listCategories());
  } catch (error: any) {
    res.status(500).json({ message: "Failed to load inventory categories" });
  }
}

export async function getInventory(_req: Request, res: Response): Promise<void> {
  try {
    res.status(200).json(toAppList(DOCTYPE, await getFrappeDocs(DOCTYPE)));
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to load inventory" });
  }
}

export async function getInventoryItem(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const item = toApp(DOCTYPE, await getFrappeDoc(DOCTYPE, id));
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
  const { itemName, category, quantity, purchasePrice } = req.body;

  if (!itemName || !category) {
    res.status(400).json({ message: "Item Name and Category are required fields" });
    return;
  }

  try {
    const categories = await listCategories();
    if (!categories.includes(category)) {
      res.status(400).json({
        message: `"${category}" is not a valid category. Choose one of: ${categories.join(", ")}`,
      });
      return;
    }

    const qty = Number(quantity) || 0;
    const stockStatus = deriveStockStatus(qty);

    const newItem = toApp<any>(
      DOCTYPE,
      await createFrappeDoc(
        DOCTYPE,
        toFrappe(DOCTYPE, {
          itemName,
          category,
          quantity: qty,
          purchasePrice: Number(purchasePrice) || 0,
          stockStatus,
        })
      )
    );

    if (stockStatus === "Out of Stock") {
      await notify({
        title: "Item Out of Stock",
        description: `New inventory item "${itemName}" was logged with 0 quantity.`,
        type: "danger",
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
    const existing = toApp<any>(DOCTYPE, await getFrappeDoc(DOCTYPE, id));
    if (!existing) {
      res.status(404).json({ message: "Item not found" });
      return;
    }

    if (req.body.category !== undefined) {
      const categories = await listCategories();
      if (!categories.includes(req.body.category)) {
        res.status(400).json({
          message: `"${req.body.category}" is not a valid category. Choose one of: ${categories.join(", ")}`,
        });
        return;
      }
    }

    const payload = toFrappe(DOCTYPE, req.body);

    // Status always follows quantity, so it can never drift out of step with stock.
    const nextQty =
      req.body.quantity !== undefined ? Number(req.body.quantity) : Number(existing.quantity) || 0;
    const nextStatus = deriveStockStatus(nextQty);
    payload.stockstatus = nextStatus;

    const updated = toApp<any>(DOCTYPE, await updateFrappeDoc(DOCTYPE, id, payload));

    // Only announce a status change, so an unrelated edit doesn't re-raise the alert.
    if (nextStatus !== existing.stockStatus) {
      if (nextStatus === "Low Stock") {
        await notify({
          title: "Low Stock Alert",
          description: `Item "${updated.itemName}" has only ${nextQty} units left.`,
          type: "warning",
        });
      } else if (nextStatus === "Out of Stock") {
        await notify({
          title: "Out Of Stock Warning",
          description: `Item "${updated.itemName}" is completely out of stock.`,
          type: "danger",
        });
      }
    }

    res.status(200).json({ message: "Inventory item updated successfully", item: updated });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update item" });
  }
}

export async function deleteInventoryItem(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const existing = await getFrappeDoc(DOCTYPE, id);
    if (!existing) {
      res.status(404).json({ message: "Item not found" });
      return;
    }
    await deleteFrappeDoc(DOCTYPE, id);
    res.status(200).json({ message: "Inventory item deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete item" });
  }
}
