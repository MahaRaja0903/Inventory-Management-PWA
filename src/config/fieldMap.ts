/**
 * Frappe <-> application field mapping.
 *
 * Frappe stores every custom fieldname in lowercase (`isread`, `userid`, `tasktype`,
 * `actual_quantity`), while the React app and `src/types.ts` use camelCase. Doing that
 * translation ad hoc in each controller is what produced the family of bugs where a
 * value silently read back as `undefined` — a zero in a report, a blank in a form, an
 * authorisation check that never matched.
 *
 * Every controller now reads through `toApp` and writes through `toFrappe` so the
 * translation exists in exactly one place.
 *
 * Two Frappe conventions to keep in mind:
 *   - `name` is the primary key, exposed to the app as `_id`.
 *   - doctypes that need a human-readable label keep it in `name1`, which the app
 *     surfaces as `name`.
 */

export type FieldMap = Record<string, string>;

/**
 * app field -> frappe field. `name`/`_id` are handled separately by the mappers.
 * Exported so `npm run verify:schema` can check it against the live doctypes.
 */
export const FIELD_MAPS: Record<string, FieldMap> = {
  "ATS User": {
    name: "name1",
    email: "email",
    password: "password",
    role: "role",
    phone: "phone",
    status: "status",
    profileImage: "profileimage",
  },

  "ATS Inventory Item": {
    itemName: "itemname",
    category: "tattoo_item_group",
    quantity: "actual_quantity",
    defaultQuantity: "default_quantity",
    purchasePrice: "purchaseprice",
    stockStatus: "stockstatus",
  },

  "ATS Expense": {
    title: "title",
    category: "category",
    amount: "amount",
    date: "date",
    notes: "notes",
    receiptImage: "receiptimage",
    employeeId: "employeeid",
    approvedBy: "approvedby",
    status: "status",
  },

  "ATS Attendance": {
    employeeId: "employeeid",
    checkInTime: "checkintime",
    checkOutTime: "checkouttime",
    gpsLocation: "gpslocation",
    workingHours: "workinghours",
    date: "date",
    status: "status",
  },

  "ATS Customer": {
    name: "name1",
    mobile: "mobile",
    email: "email",
    address: "address",
    totalVisits: "totalvisits",
    totalSpending: "totalspending",
  },

  "ATS Sale": {
    customerId: "customerid",
    employeeId: "employeeid",
    serviceType: "servicetype",
    amount: "amount",
    discount: "discount",
    finalAmount: "finalamount",
    paymentMethod: "paymentmethod",
    itemsUsed: "itemsused",
  },

  "ATS Notification": {
    userId: "userid",
    title: "title",
    description: "description",
    message: "message",
    type: "type",
    isRead: "isread",
  },

  "ATS Task": {
    title: "title",
    description: "description",
    assignedTo: "assignedto",
    assignedBy: "assignedby",
    priority: "priority",
    taskType: "tasktype",
    dueDate: "duedate",
    status: "status",
    notes: "notes",
  },

  "ATS Settings": {
    theme: "theme",
    notificationEnabled: "notificationenabled",
    studioName: "studioname",
    studioEmail: "studioemail",
    studioPhone: "studiophone",
    studioAddress: "studioaddress",
    geofenceEnabled: "geofenceenabled",
    geofenceLatitude: "geofencelatitude",
    geofenceLongitude: "geofencelongitude",
    geofenceRadius: "geofenceradius",
    minimumShiftHours: "minimumshifthours",
  },
};

/** Frappe fields that are metadata, not user data. Kept on reads, stripped on writes. */
const FRAPPE_INTERNAL = new Set([
  "name",
  "owner",
  "creation",
  "modified",
  "modified_by",
  "docstatus",
  "idx",
  "doctype",
  "parent",
  "parentfield",
  "parenttype",
]);

function mapFor(doctype: string): FieldMap {
  const map = FIELD_MAPS[doctype];
  if (!map) throw new Error(`No field map registered for doctype "${doctype}"`);
  return map;
}

/**
 * Frappe document -> application shape.
 *
 * Adds `_id` (from `name`), `createdAt`/`updatedAt` (from `creation`/`modified`), and
 * every mapped camelCase field. The raw Frappe keys are preserved alongside so that
 * anything not yet migrated keeps working.
 */
export function toApp<T extends Record<string, any> = any>(
  doctype: string,
  doc: any
): T | null {
  if (!doc) return null;
  const map = mapFor(doctype);
  const out: Record<string, any> = { ...doc };

  out._id = doc.name;
  out.createdAt = doc.creation;
  out.updatedAt = doc.modified;

  for (const [appKey, frappeKey] of Object.entries(map)) {
    // Prefer the canonical Frappe field, then an already-camelCase value, then
    // whatever the app key currently holds (covers partially migrated documents).
    const value =
      doc[frappeKey] !== undefined ? doc[frappeKey] : doc[appKey];
    if (value !== undefined) out[appKey] = value;
  }

  // `name1` doubles as the display label; without it `name` would leak the primary key.
  if (map.name === "name1") {
    out.name = doc.name1 || doc.name;
  }

  return out as T;
}

export function toAppList<T extends Record<string, any> = any>(
  doctype: string,
  docs: any[]
): T[] {
  return (docs || []).map((d) => toApp<T>(doctype, d)).filter(Boolean) as T[];
}

/**
 * Application payload -> Frappe payload.
 *
 * Only mapped keys are forwarded, which also strips `name` — a PUT carrying `name`
 * asks Frappe to rename the document and would orphan anything referencing it.
 * Keys whose value is `undefined` are dropped so a partial update stays partial.
 */
export function toFrappe(doctype: string, payload: any): Record<string, any> {
  const map = mapFor(doctype);
  const out: Record<string, any> = {};
  if (!payload) return out;

  for (const [appKey, frappeKey] of Object.entries(map)) {
    const value =
      payload[appKey] !== undefined ? payload[appKey] : payload[frappeKey];
    if (value !== undefined) out[frappeKey] = value;
  }

  for (const key of Object.keys(out)) {
    if (FRAPPE_INTERNAL.has(key)) delete out[key];
  }

  return out;
}

/** Frappe stores checkboxes as 0/1; the app uses booleans. */
export function toBool(value: any): boolean {
  return value === 1 || value === "1" || value === true || value === "true";
}

export function toCheckbox(value: any): number {
  return toBool(value) ? 1 : 0;
}
