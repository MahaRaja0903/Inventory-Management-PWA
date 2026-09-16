import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { getFrappeDocs, getFrappeDoc, createFrappeDoc, updateFrappeDoc, deleteFrappeDoc } from "../config/frappeClient";
import { toApp, toAppList, toFrappe } from "../config/fieldMap";

const DOCTYPE = "ATS User";
const FRAPPE_USER_DOCTYPE = "User";

/** Never let a password hash reach a client, whatever the caller's role. */
function publicView(employee: any): any {
  if (!employee) return employee;
  const { password, ...safe } = employee;
  return safe;
}

/**
 * `ATS User.email` is a Link to Frappe's built-in User doctype, so an ATS profile can
 * only exist for an email that is already a registered Frappe user. The app never
 * created that underlying user, so every "Add Employee" failed on link validation.
 *
 * This creates the Frappe user first when it's missing, then the ATS profile.
 */
async function ensureFrappeUser(email: string, fullName: string): Promise<void> {
  const existing = await getFrappeDoc(FRAPPE_USER_DOCTYPE, email);
  if (existing) return;

  const [firstName, ...rest] = fullName.trim().split(/\s+/);
  await createFrappeDoc(FRAPPE_USER_DOCTYPE, {
    email,
    first_name: firstName || email,
    last_name: rest.join(" ") || undefined,
    enabled: 1,
    send_welcome_email: 0,
    user_type: "Website User",
  });
}

export async function getEmployees(_req: Request, res: Response): Promise<void> {
  try {
    const list = toAppList(DOCTYPE, await getFrappeDocs(DOCTYPE));
    res.status(200).json(list.map(publicView));
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to load employees" });
  }
}

export async function getEmployee(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const employee = toApp(DOCTYPE, await getFrappeDoc(DOCTYPE, id));
    if (!employee) {
      res.status(404).json({ message: "Employee record not found" });
      return;
    }
    res.status(200).json(publicView(employee));
  } catch (error: any) {
    res.status(500).json({ message: "Error locating employee" });
  }
}

export async function createEmployee(req: Request, res: Response): Promise<void> {
  const { name, email, password, role, phone, status, profileImage } = req.body;

  if (!name || !email) {
    res.status(400).json({ message: "Name and email are required to register an employee" });
    return;
  }

  const normalisedEmail = String(email).trim().toLowerCase();

  try {
    const existing = toAppList(DOCTYPE, await getFrappeDocs(DOCTYPE)).find(
      (u: any) => String(u.email || "").toLowerCase() === normalisedEmail
    );

    if (existing) {
      res.status(409).json({ message: "An employee with this email already exists" });
      return;
    }

    try {
      await ensureFrappeUser(normalisedEmail, name);
    } catch (error: any) {
      res.status(400).json({
        message: `Could not create the underlying account for ${normalisedEmail}. ${error.message}`,
      });
      return;
    }

    const hashedPassword = bcrypt.hashSync(password || "Test@123", bcrypt.genSaltSync(10));

    const newEmployee = toApp<any>(
      DOCTYPE,
      await createFrappeDoc(
        DOCTYPE,
        toFrappe(DOCTYPE, {
          name,
          email: normalisedEmail,
          password: hashedPassword,
          role: role || "Employee",
          phone: phone || "",
          status: status || "Active",
          profileImage: profileImage || "",
        })
      )
    );

    res.status(201).json({
      message: "Employee registered successfully",
      employee: publicView(newEmployee),
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to register employee" });
  }
}

export async function updateEmployee(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { email, password } = req.body;

  try {
    const existing = await getFrappeDoc(DOCTYPE, id);
    if (!existing) {
      res.status(404).json({ message: "Employee not found" });
      return;
    }

    const updates = toFrappe(DOCTYPE, {
      ...req.body,
      email: email !== undefined ? String(email).trim().toLowerCase() : undefined,
    });

    // Only touch the password when a new one was actually supplied — the edit form
    // sends an empty string to mean "leave it alone".
    if (password) {
      updates.password = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
    } else {
      delete updates.password;
    }

    if (updates.email && updates.email !== existing.email) {
      await ensureFrappeUser(updates.email, req.body.name || existing.name1 || updates.email);
    }

    const updated = toApp(DOCTYPE, await updateFrappeDoc(DOCTYPE, id, updates));
    res.status(200).json({ message: "Employee updated successfully", employee: publicView(updated) });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update employee" });
  }
}

export async function deleteEmployee(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const requestingUser = (req as any).user;

  if (requestingUser && requestingUser.id === id) {
    res.status(400).json({ message: "Cannot delete your own active administrator account" });
    return;
  }

  try {
    const existing = await getFrappeDoc(DOCTYPE, id);
    if (!existing) {
      res.status(404).json({ message: "Employee not found" });
      return;
    }

    await deleteFrappeDoc(DOCTYPE, id);
    res.status(200).json({ message: "Employee deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete employee" });
  }
}
