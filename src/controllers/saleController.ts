import { Request, Response } from "express";
import { Sale } from "../models/Sale";
import { Customer } from "../models/Customer";
import { CustomerHistory } from "../models/CustomerHistory";
import { Notification } from "../models/Notification";
import { User } from "../models/User";

export async function getSales(req: Request, res: Response): Promise<void> {
  try {
    const list = await Sale.find();
    
    // Enrich with names
    const customers = await Customer.find();
    const users = await User.find();

    const enriched = list.map(item => {
      const client = customers.find(c => c._id === item.customerId);
      const artist = users.find(u => u._id === item.employeeId);
      return {
        ...item,
        customerName: client ? client.name : "Walk-In Client",
        customerMobile: client ? client.mobile : "",
        employeeName: artist ? artist.name : "Unknown Artist"
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
    const sale = await Sale.findById(id);
    if (!sale) {
      res.status(404).json({ message: "Sale transaction log not found" });
      return;
    }
    res.status(200).json(sale);
  } catch (error: any) {
    res.status(500).json({ message: "Error locating transaction log" });
  }
}

export async function createSale(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const { customerId, serviceType, amount, discount, paymentMethod, tattooDetails, piercingDetails, employeeId } = req.body;

  if (!serviceType || amount === undefined) {
    res.status(400).json({ message: "Service Type and Amount are required fields" });
    return;
  }

  try {
    const targetArtistId = employeeId || user.id; // Allow admin to choose employee, default to current user

    const newSale = await Sale.create({
      customerId: customerId || "",
      employeeId: targetArtistId,
      serviceType,
      amount: Number(amount),
      discount: discount !== undefined ? Number(discount) : 0,
      paymentMethod: paymentMethod || "UPI"
    });

    // Check if customer ID exists - if yes, create a corresponding history record!
    if (customerId) {
      await CustomerHistory.create({
        customerId,
        serviceType: serviceType === "Piercing" ? "Piercing" : "Tattoo",
        tattooDetails: tattooDetails || (serviceType === "Tattoo" ? "New custom tattoo session" : undefined),
        piercingDetails: piercingDetails || (serviceType === "Piercing" ? "New high grade piercing" : undefined),
        amount: newSale.amount - newSale.discount,
        employeeId: targetArtistId,
        serviceDate: newSale.createdAt
      });
    }

    // Generate notification for new sale
    const clientName = customerId 
      ? (await Customer.findById(customerId))?.name || "Walk-In" 
      : "Walk-In";

    await Notification.create({
      title: "New Sale Logged",
      description: `${serviceType} service registered for ${clientName}. Total revenue: $${newSale.finalAmount}.`,
      type: "success"
    });

    res.status(201).json({ message: "Sale logged successfully", sale: newSale });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to log sale" });
  }
}

export async function updateSale(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const updated = await Sale.findByIdAndUpdate(id, req.body);
    if (!updated) {
      res.status(404).json({ message: "Sale transaction log not found" });
      return;
    }
    res.status(200).json({ message: "Sale logged transaction updated successfully", sale: updated });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update transaction" });
  }
}

export async function deleteSale(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const success = await Sale.findByIdAndDelete(id);
    if (!success) {
      res.status(404).json({ message: "Sale log not found" });
      return;
    }
    res.status(200).json({ message: "Sale transaction deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete transaction log" });
  }
}
