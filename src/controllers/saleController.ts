import { Request, Response } from "express";
import { getFrappeDocs, getFrappeDoc, createFrappeDoc, updateFrappeDoc, deleteFrappeDoc } from "../config/frappeClient";

export async function getSales(req: Request, res: Response): Promise<void> {
  try {
    const rawSales = await getFrappeDocs("ATS Sale");
    const list = rawSales.map((doc: any) => ({ ...doc, _id: doc.name }));
    
    // Enrich with names
    const rawCustomers = await getFrappeDocs("ATS Customer");
    const customers = rawCustomers.map((doc: any) => ({ ...doc, _id: doc.name }));
    
    const rawUsers = await getFrappeDocs("ATS User");
    const users = rawUsers.map((doc: any) => ({ ...doc, _id: doc.name }));

    const enriched = list.map((item: any) => {
      const client = customers.find((c: any) => c._id === item.customerId);
      const artist = users.find((u: any) => u._id === item.employeeId);
      return {
        ...item,
        customerName: client ? client.customerName || client.name : "Walk-In Client",
        customerMobile: client ? client.mobile : "",
        employeeName: artist ? artist.fullName || artist.name : "Unknown Artist"
      };
    });

    res.status(200).json(enriched);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to load sales list" });
  }
}

export async function getSale(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const sale = await getFrappeDoc("ATS Sale", id);
    if (!sale) {
      res.status(404).json({ message: "Sale transaction log not found" });
      return;
    }
    sale._id = sale.name;
    res.status(200).json(sale);
  } catch (error: any) {
    res.status(500).json({ message: "Error locating transaction log" });
  }
}

export async function createSale(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const { customerId, serviceType, amount, discount, paymentMethod, tattooDetails, piercingDetails, employeeId, itemsUsed } = req.body;

  if (!serviceType || amount === undefined) {
    res.status(400).json({ message: "Service Type and Amount are required fields" });
    return;
  }

  try {
    const targetArtistId = employeeId || user.id; // Allow admin to choose employee, default to current user

    const newSale = await createFrappeDoc("ATS Sale", {
      customerId: customerId || "",
      employeeId: targetArtistId,
      serviceType,
      amount: Number(amount),
      discount: discount !== undefined ? Number(discount) : 0,
      paymentMethod: paymentMethod || "UPI",
      itemsUsed: itemsUsed || []
    });
    newSale._id = newSale.name;

    // Reduce inventory stock
    if (itemsUsed && Array.isArray(itemsUsed)) {
      for (const item of itemsUsed) {
        try {
          const invItem = await getFrappeDoc("ATS Inventory Item", item.itemId);
          if (invItem) {
            const newQty = Math.max(0, (invItem.quantity || 0) - item.quantity);
            await updateFrappeDoc("ATS Inventory Item", item.itemId, { quantity: newQty });
          }
        } catch (e) {
          console.error("Failed to update inventory item", item.itemId, e);
        }
      }
    }

    // Check if customer ID exists - if yes, create a corresponding history record!
    if (customerId) {
      try {
        await createFrappeDoc("ATS Customer History", {
          customerId,
          serviceType: serviceType === "Piercing" ? "Piercing" : "Tattoo",
          tattooDetails: tattooDetails || (serviceType === "Tattoo" ? "New custom tattoo session" : undefined),
          piercingDetails: piercingDetails || (serviceType === "Piercing" ? "New high grade piercing" : undefined),
          amount: newSale.amount - (newSale.discount || 0),
          employeeId: targetArtistId,
          serviceDate: newSale.creation || new Date().toISOString()
        });
      } catch (e) {
        console.error("Failed to create customer history", e);
      }
    }

    // Generate notification for new sale
    let clientName = "Walk-In";
    if (customerId) {
      try {
        const client = await getFrappeDoc("ATS Customer", customerId);
        clientName = client.customerName || client.name || "Walk-In";
      } catch (e) {
        console.error("Failed to fetch customer for notification", e);
      }
    }

    try {
      await createFrappeDoc("ATS Notification", {
        title: "New Sale Logged",
        description: `${serviceType} service registered for ${clientName}. Total revenue: $${newSale.amount - (newSale.discount || 0)}.`,
        type: "success"
      });
    } catch (e) {
      console.error("Failed to create notification", e);
    }

    res.status(201).json({ message: "Sale logged successfully", sale: newSale });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to log sale" });
  }
}

export async function updateSale(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const updated = await updateFrappeDoc("ATS Sale", id, req.body);
    if (!updated) {
      res.status(404).json({ message: "Sale transaction log not found" });
      return;
    }
    updated._id = updated.name;
    res.status(200).json({ message: "Sale logged transaction updated successfully", sale: updated });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update transaction" });
  }
}

export async function deleteSale(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    await deleteFrappeDoc("ATS Sale", id);
    res.status(200).json({ message: "Sale transaction deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete transaction log" });
  }
}
