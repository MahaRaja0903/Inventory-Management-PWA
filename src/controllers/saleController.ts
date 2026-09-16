import { Request, Response } from "express";
import { getFrappeDocs, getFrappeDoc, createFrappeDoc, updateFrappeDoc, deleteFrappeDoc } from "../config/frappeClient";
import { toApp, toAppList, toFrappe } from "../config/fieldMap";
import { deriveStockStatus } from "../lib/stock";
import { createHistoryEntry, recalculateCustomerTotals } from "../lib/customerHistory";
import { notify } from "../lib/notify";
import { formatAmount } from "../lib/money";

const DOCTYPE = "ATS Sale";
const CUSTOMER_DOCTYPE = "ATS Customer";
const USER_DOCTYPE = "ATS User";
const INVENTORY_DOCTYPE = "ATS Inventory Item";
const SALE_ITEM_DOCTYPE = "ATS Sale Item";

/**
 * `itemsused` is a child table of `ATS Sale Item` rows ({ itemid, itemname, quantity }).
 * The app sends camelCase, so rows are translated in both directions — previously they
 * were posted as-is and silently dropped, which is why a sale never listed its items.
 */
function itemRowsToFrappe(itemsUsed: any): any[] | undefined {
  if (!Array.isArray(itemsUsed)) return undefined;
  return itemsUsed
    .filter((i: any) => i && i.itemId)
    .map((i: any) => ({
      itemid: i.itemId,
      itemname: i.itemName || "",
      quantity: Number(i.quantity) || 0,
    }));
}

function itemRowsToApp(rows: any): any[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((r: any) => ({
    itemId: r.itemid || r.itemId,
    itemName: r.itemname || r.itemName || "",
    quantity: Number(r.quantity) || 0,
  }));
}

/**
 * Frappe's list endpoint omits child tables, so a sale fetched via the list has no
 * `itemsused`. Rather than re-fetching every sale individually, pull all child rows in
 * one query and group them by parent.
 */
async function loadItemsByParent(): Promise<Map<string, any[]>> {
  const byParent = new Map<string, any[]>();
  try {
    const rows = await getFrappeDocs(
      SALE_ITEM_DOCTYPE,
      null,
      ["name", "parent", "itemid", "itemname", "quantity"],
      DOCTYPE
    );
    for (const row of rows) {
      if (!row.parent) continue;
      const list = byParent.get(row.parent) || [];
      list.push(row);
      byParent.set(row.parent, list);
    }
  } catch (error: any) {
    console.error("[sales] Failed to load sale items:", error.message);
  }
  return byParent;
}

async function enrich(sales: any[]): Promise<any[]> {
  if (sales.length === 0) return sales;

  const customers = toAppList(CUSTOMER_DOCTYPE, await getFrappeDocs(CUSTOMER_DOCTYPE));
  const users = toAppList(USER_DOCTYPE, await getFrappeDocs(USER_DOCTYPE));
  const customerById = new Map(customers.map((c: any) => [c._id, c]));
  const userById = new Map(users.map((u: any) => [u._id, u]));

  // Only reach for the child rows when the documents didn't already carry them.
  const needsItems = sales.some((s: any) => !Array.isArray(s.itemsUsed));
  const itemsByParent = needsItems ? await loadItemsByParent() : new Map<string, any[]>();

  return sales.map((sale: any) => {
    const client = customerById.get(sale.customerId);
    const artist = userById.get(sale.employeeId);
    const rows = Array.isArray(sale.itemsUsed) ? sale.itemsUsed : itemsByParent.get(sale._id) || [];
    return {
      ...sale,
      itemsUsed: itemRowsToApp(rows),
      customerName: client?.name || "Walk-In Client",
      customerMobile: client?.mobile || "",
      employeeName: artist?.name || "Unknown Artist",
    };
  });
}

export async function getSales(_req: Request, res: Response): Promise<void> {
  try {
    const list = toAppList(DOCTYPE, await getFrappeDocs(DOCTYPE));
    res.status(200).json(await enrich(list));
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to load sales list" });
  }
}

export async function getSale(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const sale = toApp<any>(DOCTYPE, await getFrappeDoc(DOCTYPE, id));
    if (!sale) {
      res.status(404).json({ message: "Sale transaction log not found" });
      return;
    }
    const [enriched] = await enrich([sale]);
    res.status(200).json(enriched);
  } catch (error: any) {
    res.status(500).json({ message: "Error locating transaction log" });
  }
}

/** Deduct sold stock and keep each item's status in step with its new quantity. */
async function applyStockUsage(itemsUsed: any[]): Promise<void> {
  if (!Array.isArray(itemsUsed)) return;

  for (const item of itemsUsed) {
    try {
      const invItem = toApp<any>(INVENTORY_DOCTYPE, await getFrappeDoc(INVENTORY_DOCTYPE, item.itemId));
      if (!invItem) continue;

      const newQty = Math.max(0, (Number(invItem.quantity) || 0) - (Number(item.quantity) || 0));
      const newStatus = deriveStockStatus(newQty);

      await updateFrappeDoc(INVENTORY_DOCTYPE, item.itemId, {
        actual_quantity: newQty,
        stockstatus: newStatus,
      });

      if (newStatus !== invItem.stockStatus && newStatus !== "In Stock") {
        await notify({
          title: newStatus === "Out of Stock" ? "Out Of Stock Warning" : "Low Stock Alert",
          description: `Item "${invItem.itemName}" is down to ${newQty} units after a sale.`,
          type: newStatus === "Out of Stock" ? "danger" : "warning",
        });
      }
    } catch (error: any) {
      console.error("[sales] Failed to update inventory item", item.itemId, error.message);
    }
  }
}

export async function createSale(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const {
    customerId,
    serviceType,
    amount,
    discount,
    paymentMethod,
    tattooDetails,
    piercingDetails,
    employeeId,
    itemsUsed,
  } = req.body;

  if (!serviceType || amount === undefined) {
    res.status(400).json({ message: "Service Type and Amount are required fields" });
    return;
  }

  const calcAmount = Number(amount);
  const calcDiscount = discount !== undefined ? Number(discount) : 0;

  if (!Number.isFinite(calcAmount) || calcAmount < 0) {
    res.status(400).json({ message: "Amount must be a positive number" });
    return;
  }
  if (!Number.isFinite(calcDiscount) || calcDiscount < 0) {
    res.status(400).json({ message: "Discount must be a positive number" });
    return;
  }
  if (calcDiscount > calcAmount) {
    res.status(400).json({ message: "Discount cannot be greater than the sale amount" });
    return;
  }

  try {
    const targetArtistId = employeeId || user.id;
    const finalAmount = Math.max(0, calcAmount - calcDiscount);

    const newSale = toApp<any>(
      DOCTYPE,
      await createFrappeDoc(
        DOCTYPE,
        toFrappe(DOCTYPE, {
          customerId: customerId || "",
          employeeId: targetArtistId,
          serviceType,
          amount: calcAmount,
          discount: calcDiscount,
          finalAmount,
          paymentMethod: paymentMethod || "UPI",
          itemsUsed: itemRowsToFrappe(itemsUsed),
        })
      )
    );

    await applyStockUsage(itemsUsed);

    let clientName = "Walk-In";
    if (customerId) {
      await createHistoryEntry({
        customerId,
        serviceType: serviceType === "Piercing" ? "Piercing" : "Tattoo",
        tattooDetails: tattooDetails || (serviceType === "Tattoo" ? "New custom tattoo session" : undefined),
        piercingDetails: piercingDetails || (serviceType === "Piercing" ? "New high grade piercing" : undefined),
        amount: finalAmount,
        employeeId: targetArtistId,
        serviceDate: newSale.createdAt || new Date().toISOString(),
      });

      await recalculateCustomerTotals(customerId);

      const client = toApp<any>(CUSTOMER_DOCTYPE, await getFrappeDoc(CUSTOMER_DOCTYPE, customerId));
      clientName = client?.name || "Walk-In";
    }

    await notify({
      title: "New Sale Logged",
      description: `${serviceType} service registered for ${clientName}. Total revenue: ${formatAmount(finalAmount)}.`,
      type: "success",
    });

    const [enriched] = await enrich([newSale]);
    res.status(201).json({ message: "Sale logged successfully", sale: enriched });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to log sale" });
  }
}

export async function updateSale(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const oldSale = toApp<any>(DOCTYPE, await getFrappeDoc(DOCTYPE, id));
    if (!oldSale) {
      res.status(404).json({ message: "Sale transaction log not found" });
      return;
    }

    const payload = toFrappe(DOCTYPE, req.body);
    if (req.body.itemsUsed !== undefined) {
      payload.itemsused = itemRowsToFrappe(req.body.itemsUsed);
    }

    if (req.body.amount !== undefined || req.body.discount !== undefined) {
      const amount = req.body.amount !== undefined ? Number(req.body.amount) : Number(oldSale.amount) || 0;
      const discount = req.body.discount !== undefined ? Number(req.body.discount) : Number(oldSale.discount) || 0;

      if (!Number.isFinite(amount) || amount < 0 || !Number.isFinite(discount) || discount < 0) {
        res.status(400).json({ message: "Amount and discount must be positive numbers" });
        return;
      }
      if (discount > amount) {
        res.status(400).json({ message: "Discount cannot be greater than the sale amount" });
        return;
      }

      payload.finalamount = Math.max(0, amount - discount);
    }

    const updated = toApp<any>(DOCTYPE, await updateFrappeDoc(DOCTYPE, id, payload));

    // The customer may have changed, so refresh totals on both sides.
    await recalculateCustomerTotals(oldSale.customerId);
    if (updated.customerId && updated.customerId !== oldSale.customerId) {
      await recalculateCustomerTotals(updated.customerId);
    }

    const [enriched] = await enrich([updated]);
    res.status(200).json({ message: "Sale logged transaction updated successfully", sale: enriched });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update transaction" });
  }
}

export async function deleteSale(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const existing = toApp<any>(DOCTYPE, await getFrappeDoc(DOCTYPE, id));
    if (!existing) {
      res.status(404).json({ message: "Sale transaction log not found" });
      return;
    }

    await deleteFrappeDoc(DOCTYPE, id);
    await recalculateCustomerTotals(existing.customerId);

    res.status(200).json({ message: "Sale transaction deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete transaction log" });
  }
}
