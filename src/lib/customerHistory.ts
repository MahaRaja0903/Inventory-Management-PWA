import { getFrappeDocs, createFrappeDoc, deleteFrappeDoc, updateFrappeDoc } from "../config/frappeClient";
import { toAppList } from "../config/fieldMap";

/**
 * `ATS Customer History` does not currently exist on the Frappe instance, and every
 * call to it threw — which took down the whole customer detail response, including
 * the customer record that had already loaded fine.
 *
 * These helpers degrade instead: if the doctype is missing, history reads come back
 * empty and history writes are skipped, while the rest of the response succeeds. Once
 * the doctype is created server-side they start working with no code change.
 */
const DOCTYPE = "ATS Customer History";

let doctypeAvailable: boolean | null = null;

function markUnavailable(error: any): void {
  const detail = String(error?.message || "");
  // Treat a missing doctype as "not set up yet"; anything else is a real failure worth retrying.
  if (detail.includes("Failed to fetch") || detail.includes("Failed to create")) {
    if (doctypeAvailable !== false) {
      console.warn(
        `[customerHistory] ${DOCTYPE} is unavailable on this Frappe instance. ` +
          `Service history will be empty until the doctype is created.`
      );
    }
    doctypeAvailable = false;
  }
}

export async function getHistoryForCustomer(customerId: string): Promise<any[]> {
  if (doctypeAvailable === false) return [];
  try {
    const all = await getFrappeDocs(DOCTYPE);
    doctypeAvailable = true;
    return all
      .map((h: any) => ({
        ...h,
        _id: h.name,
        customerId: h.customerid || h.customerId,
        employeeId: h.employeeid || h.employeeId,
        serviceType: h.servicetype || h.serviceType,
        tattooDetails: h.tattoodetails || h.tattooDetails,
        piercingDetails: h.piercingdetails || h.piercingDetails,
        serviceDate: h.servicedate || h.serviceDate || h.creation,
      }))
      .filter((h: any) => h.customerId === customerId);
  } catch (error: any) {
    markUnavailable(error);
    return [];
  }
}

export async function createHistoryEntry(entry: {
  customerId: string;
  serviceType: string;
  tattooDetails?: string;
  piercingDetails?: string;
  amount: number;
  employeeId: string;
  serviceDate: string;
}): Promise<void> {
  if (doctypeAvailable === false) return;
  try {
    await createFrappeDoc(DOCTYPE, {
      customerid: entry.customerId,
      servicetype: entry.serviceType,
      tattoodetails: entry.tattooDetails,
      piercingdetails: entry.piercingDetails,
      amount: entry.amount,
      employeeid: entry.employeeId,
      servicedate: entry.serviceDate,
    });
    doctypeAvailable = true;
  } catch (error: any) {
    markUnavailable(error);
  }
}

export async function deleteHistoryForCustomer(customerId: string): Promise<void> {
  if (doctypeAvailable === false) return;
  try {
    const history = await getHistoryForCustomer(customerId);
    for (const entry of history) {
      await deleteFrappeDoc(DOCTYPE, entry._id);
    }
  } catch (error: any) {
    markUnavailable(error);
  }
}

/**
 * Recalculate a customer's visit count and lifetime spend from their sales.
 *
 * A Mongoose hook used to maintain these; the Frappe rewrite dropped it and nothing
 * replaced it, so both figures sat at zero forever. Deriving them from the sale list
 * rather than incrementing keeps them correct after an edit or a delete too.
 */
export async function recalculateCustomerTotals(customerId: string): Promise<void> {
  if (!customerId) return;
  try {
    const sales = toAppList("ATS Sale", await getFrappeDocs("ATS Sale")).filter(
      (s: any) => s.customerId === customerId
    );

    const totalVisits = sales.length;
    const totalSpending = sales.reduce(
      (sum: number, s: any) => sum + (Number(s.finalAmount) || 0),
      0
    );

    await updateFrappeDoc("ATS Customer", customerId, {
      totalvisits: totalVisits,
      totalspending: Number(totalSpending.toFixed(2)),
    });
  } catch (error: any) {
    console.error(`[customerHistory] Failed to recalculate totals for ${customerId}:`, error.message);
  }
}
