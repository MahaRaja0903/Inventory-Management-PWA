import { createFrappeDoc, getFrappeDocs } from "../config/frappeClient";
import { toFrappe, toAppList } from "../config/fieldMap";

const DOCTYPE = "ATS Notification";

export type NotificationType = "info" | "success" | "warning" | "danger";

interface NotifyInput {
  title: string;
  description: string;
  type?: NotificationType;
  /** Omit to raise a studio-wide alert that only admins see. */
  userId?: string;
}

/**
 * Raise a notification.
 *
 * Callers used to build the Frappe payload inline with camelCase keys (`userId`,
 * `isRead`), which Frappe silently discarded — so targeted notifications reached
 * nobody. Routing every write through `toFrappe` keeps the fieldnames correct.
 *
 * Notifications are a side effect: a failure here must never fail the operation that
 * triggered it, so errors are logged and swallowed.
 */
export async function notify(input: NotifyInput): Promise<void> {
  try {
    const payload = toFrappe(DOCTYPE, {
      title: input.title,
      description: input.description,
      message: input.description,
      type: input.type || "info",
      userId: input.userId || "",
      isRead: 0,
    });
    await createFrappeDoc(DOCTYPE, payload);
  } catch (error: any) {
    console.error("[notify] Failed to raise notification:", error.message);
  }
}

/** Raise the same notification for every admin. */
export async function notifyAdmins(input: Omit<NotifyInput, "userId">): Promise<void> {
  try {
    const users = toAppList("ATS User", await getFrappeDocs("ATS User"));
    const admins = users.filter((u: any) => u.role === "Admin");
    await Promise.all(admins.map((admin: any) => notify({ ...input, userId: admin._id })));
  } catch (error: any) {
    console.error("[notify] Failed to notify admins:", error.message);
  }
}
