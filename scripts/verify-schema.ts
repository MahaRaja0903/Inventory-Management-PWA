/**
 * Verify src/config/fieldMap.ts against the live Frappe doctypes.
 *
 * The whole family of bugs this app suffered came from one cause: a field name in the
 * code that no longer matched the doctype, failing silently as `undefined` rather than
 * as an error. This script catches that class of drift in one pass.
 *
 * Run it after any doctype change:  npm run verify:schema
 * Exits non-zero when something is wrong, so it can gate a deploy.
 */
import { getFrappeDoc } from "../src/config/frappeClient";
import { FIELD_MAPS } from "../src/config/fieldMap";

/** Select fields whose exact option values the application branches on. */
const EXPECTED_OPTIONS: Record<string, Record<string, string[]>> = {
  "ATS User": { role: ["Admin", "Employee"], status: ["Active", "Inactive"] },
  "ATS Inventory Item": { stockstatus: ["In Stock", "Low Stock", "Out of Stock"] },
  "ATS Expense": { status: ["Pending", "Approved", "Rejected"] },
  "ATS Attendance": { status: ["Checked In", "Checked Out", "Absent"] },
  "ATS Sale": {
    servicetype: ["Tattoo", "Piercing", "Aftercare Product", "Other"],
    paymentmethod: ["Cash", "Card", "Bank Transfer", "UPI"],
  },
  "ATS Notification": { type: ["info", "success", "warning", "danger"] },
  "ATS Task": {
    status: ["Pending", "In Progress", "Completed"],
    priority: ["Low", "Medium", "High"],
    tasktype: ["Daily Task", "One Time Task"],
  },
};

/** Doctypes the app uses but can work without — reported, not failed. */
const OPTIONAL_DOCTYPES = ["ATS Customer History"];

/** Frappe layout elements carry no data, so they need no mapping. */
const LAYOUT_FIELDTYPES = new Set([
  "Column Break",
  "Section Break",
  "Tab Break",
  "HTML",
  "Heading",
]);

async function main() {
  const errors: string[] = [];
  const notes: string[] = [];

  for (const [doctype, map] of Object.entries(FIELD_MAPS)) {
    const dt = await getFrappeDoc("DocType", doctype);

    if (!dt) {
      errors.push(`${doctype}: doctype does not exist`);
      continue;
    }

    const fields = new Map<string, any>((dt.fields || []).map((f: any) => [f.fieldname, f]));
    const mappedFrappeNames = new Set(Object.values(map));

    for (const [appKey, frappeKey] of Object.entries(map)) {
      if (!fields.has(frappeKey)) {
        errors.push(`${doctype}: "${appKey}" maps to "${frappeKey}", which the doctype does not have`);
      }
    }

    const uncovered = [...fields.entries()]
      .filter(([name, f]) => !mappedFrappeNames.has(name) && !LAYOUT_FIELDTYPES.has(f.fieldtype))
      .map(([name]) => name);

    if (uncovered.length > 0) {
      notes.push(`${doctype}: doctype fields not used by the app — ${uncovered.join(", ")}`);
    }

    for (const [fieldname, want] of Object.entries(EXPECTED_OPTIONS[doctype] || {})) {
      const field = fields.get(fieldname);
      if (!field) continue; // already reported above if it was mapped
      const have = String(field.options || "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const missing = want.filter((w) => !have.includes(w));
      if (missing.length > 0) {
        errors.push(
          `${doctype}.${fieldname}: the app expects option(s) [${missing.join(", ")}] — doctype has [${have.join(", ")}]`
        );
      }
    }
  }

  for (const doctype of OPTIONAL_DOCTYPES) {
    const dt = await getFrappeDoc("DocType", doctype);
    if (!dt) notes.push(`${doctype}: not present — the feature it backs stays empty (handled gracefully)`);
  }

  const checked = Object.keys(FIELD_MAPS).length;

  if (notes.length > 0) {
    console.log("Notes:");
    notes.forEach((n) => console.log(`  - ${n}`));
    console.log("");
  }

  if (errors.length > 0) {
    console.error(`Schema drift detected in ${errors.length} place(s):`);
    errors.forEach((e) => console.error(`  ✗ ${e}`));
    console.error(`\nUpdate src/config/fieldMap.ts (or the doctype) so the two agree.`);
    process.exit(1);
  }

  console.log(`✓ ${checked} doctypes checked — every mapped field exists and every option list matches.`);
}

main().catch((error) => {
  console.error("Schema verification could not run:", error.message);
  process.exit(1);
});
