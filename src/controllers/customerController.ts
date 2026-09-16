import { Request, Response } from "express";
import { getFrappeDocs, getFrappeDoc, createFrappeDoc, updateFrappeDoc, deleteFrappeDoc } from "../config/frappeClient";
import { toApp, toAppList, toFrappe } from "../config/fieldMap";
import { getHistoryForCustomer, deleteHistoryForCustomer } from "../lib/customerHistory";

const DOCTYPE = "ATS Customer";
const USER_DOCTYPE = "ATS User";

export async function getCustomers(_req: Request, res: Response): Promise<void> {
  try {
    res.status(200).json(toAppList(DOCTYPE, await getFrappeDocs(DOCTYPE)));
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to load customers" });
  }
}

export async function getCustomer(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const customer = toApp<any>(DOCTYPE, await getFrappeDoc(DOCTYPE, id));
    if (!customer) {
      res.status(404).json({ message: "Customer profile not found" });
      return;
    }

    // History is best-effort: a missing history doctype must not take the profile down.
    const history = await getHistoryForCustomer(id);

    let enrichedHistory = history;
    if (history.length > 0) {
      const users = toAppList(USER_DOCTYPE, await getFrappeDocs(USER_DOCTYPE));
      const byId = new Map(users.map((u: any) => [u._id, u]));
      enrichedHistory = history.map((h: any) => ({
        ...h,
        employeeName: byId.get(h.employeeId)?.name || "Unknown Artist",
      }));
    }

    res.status(200).json({ ...customer, history: enrichedHistory });
  } catch (error: any) {
    console.error("[customers] Failed to load customer:", error.message);
    res.status(500).json({ message: "Error locating customer record" });
  }
}

export async function createCustomer(req: Request, res: Response): Promise<void> {
  const { name, mobile, email, address } = req.body;

  if (!name || !mobile) {
    res.status(400).json({ message: "Name and Mobile number are required fields" });
    return;
  }

  try {
    const existing = toAppList(DOCTYPE, await getFrappeDocs(DOCTYPE)).find(
      (c: any) => c.mobile === mobile
    );

    if (existing) {
      // 409 lets the sale screen recognise a duplicate and select the existing
      // customer, instead of treating it as a generic failure.
      res.status(409).json({
        message: "A customer with this mobile number is already registered",
        customer: existing,
      });
      return;
    }

    const newCustomer = toApp(
      DOCTYPE,
      await createFrappeDoc(
        DOCTYPE,
        toFrappe(DOCTYPE, {
          name,
          mobile,
          email: email || "",
          address: address || "",
          totalVisits: 0,
          totalSpending: 0,
        })
      )
    );

    res.status(201).json({ message: "Customer created successfully", customer: newCustomer });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to register customer" });
  }
}

export async function updateCustomer(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const existing = await getFrappeDoc(DOCTYPE, id);
    if (!existing) {
      res.status(404).json({ message: "Customer record not found" });
      return;
    }

    // `toFrappe` forwards only mapped fields, so the request can no longer carry
    // `name` through to Frappe and trigger a document rename that would orphan
    // every sale pointing at this customer.
    const updated = toApp(DOCTYPE, await updateFrappeDoc(DOCTYPE, id, toFrappe(DOCTYPE, req.body)));

    res.status(200).json({ message: "Customer profile updated successfully", customer: updated });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update profile" });
  }
}

export async function deleteCustomer(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const existing = await getFrappeDoc(DOCTYPE, id);
    if (!existing) {
      res.status(404).json({ message: "Customer record not found" });
      return;
    }

    // Clear history first: deleting the customer and then failing on history left the
    // record gone but the response reporting failure.
    await deleteHistoryForCustomer(id);
    await deleteFrappeDoc(DOCTYPE, id);

    res.status(200).json({
      message: "Customer and their design history records deleted successfully",
    });
  } catch (error: any) {
    console.error("[customers] Failed to delete customer:", error.message);
    res.status(500).json({ message: "Failed to delete customer record" });
  }
}
