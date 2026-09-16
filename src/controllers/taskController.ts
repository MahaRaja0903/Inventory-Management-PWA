import { Request, Response } from "express";
import { getFrappeDocs, getFrappeDoc, createFrappeDoc, updateFrappeDoc, deleteFrappeDoc } from "../config/frappeClient";
import { toApp, toAppList, toFrappe } from "../config/fieldMap";
import { notify, notifyAdmins } from "../lib/notify";

const DOCTYPE = "ATS Task";
const USER_DOCTYPE = "ATS User";

const VALID_STATUSES = ["Pending", "In Progress", "Completed"];

/** Attach assignee/assigner display names so the UI never has to fall back to "Unassigned". */
async function withNames(tasks: any[]): Promise<any[]> {
  if (tasks.length === 0) return tasks;
  const users = toAppList(USER_DOCTYPE, await getFrappeDocs(USER_DOCTYPE));
  const byId = new Map(users.map((u: any) => [u._id, u]));

  return tasks.map((task: any) => ({
    ...task,
    assignedToName: byId.get(task.assignedTo)?.name || "Unassigned",
    assignedByName: byId.get(task.assignedBy)?.name || "System",
  }));
}

/**
 * Recreate today's instance of each recurring task.
 *
 * This filtered raw Frappe documents on `taskType` while the stored field is
 * `tasktype`, so the template list was always empty and daily tasks never recurred.
 * Reading through `toAppList` first is what makes the filter work.
 */
async function syncDailyTasks(): Promise<void> {
  try {
    const todayStr = new Date().toISOString().split("T")[0];
    const allTasks = toAppList(DOCTYPE, await getFrappeDocs(DOCTYPE));
    const dailyTasks = allTasks.filter((t: any) => t.taskType === "Daily Task");
    if (dailyTasks.length === 0) return;

    // The oldest record for a given title+assignee is the template the rest derive from.
    const templates = new Map<string, any>();
    for (const task of dailyTasks) {
      const key = `${(task.title || "").trim().toLowerCase()}_${task.assignedTo}`;
      const existing = templates.get(key);
      if (!existing) {
        templates.set(key, task);
        continue;
      }
      const taskTime = new Date(task.createdAt || 0).getTime();
      const existingTime = new Date(existing.createdAt || 0).getTime();
      if (taskTime < existingTime) templates.set(key, task);
    }

    for (const template of templates.values()) {
      const hasTodayInstance = dailyTasks.some(
        (t: any) =>
          t.title === template.title &&
          t.assignedTo === template.assignedTo &&
          t.dueDate === todayStr
      );
      if (hasTodayInstance) continue;

      await createFrappeDoc(
        DOCTYPE,
        toFrappe(DOCTYPE, {
          title: template.title,
          description: template.description,
          assignedTo: template.assignedTo,
          assignedBy: template.assignedBy,
          priority: template.priority,
          taskType: "Daily Task",
          dueDate: todayStr,
          status: "Pending",
          notes: template.notes || "",
        })
      );

      await notify({
        userId: template.assignedTo,
        title: "New Daily Task Active",
        description: `Daily Task: "${template.title}" has been reactivated for today.`,
        type: "info",
      });
    }
  } catch (error: any) {
    console.error("Failed to sync daily tasks templates:", error.message);
  }
}

export async function getTasks(req: Request, res: Response): Promise<void> {
  const reqUser = (req as any).user;
  if (!reqUser || reqUser.role !== "Admin") {
    res.status(403).json({ message: "Access denied. Admin privileges required." });
    return;
  }

  await syncDailyTasks();

  const { employee, status, priority, date } = req.query;

  try {
    let list = toAppList(DOCTYPE, await getFrappeDocs(DOCTYPE));

    if (employee) list = list.filter((t: any) => t.assignedTo === employee);
    if (status) list = list.filter((t: any) => t.status === status);
    if (priority) list = list.filter((t: any) => t.priority === priority);
    if (date) list = list.filter((t: any) => t.dueDate === date);

    list.sort(
      (a: any, b: any) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    res.status(200).json(await withNames(list));
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to retrieve tasks" });
  }
}

export async function getMyTasks(req: Request, res: Response): Promise<void> {
  const reqUser = (req as any).user;
  if (!reqUser) {
    res.status(401).json({ message: "Unauthorized credentials" });
    return;
  }

  await syncDailyTasks();

  try {
    const list = toAppList(DOCTYPE, await getFrappeDocs(DOCTYPE)).filter(
      (t: any) => t.assignedTo === reqUser.id
    );

    list.sort(
      (a: any, b: any) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    res.status(200).json(await withNames(list));
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to retrieve employee tasks" });
  }
}

export async function createTask(req: Request, res: Response): Promise<void> {
  const reqUser = (req as any).user;
  const { title, description, assignedTo, priority, taskType, dueDate, notes } = req.body;

  if (!title || !assignedTo || !dueDate) {
    res.status(400).json({ message: "Title, Assigned Employee, and Due Date are required fields." });
    return;
  }

  try {
    const created = toApp<any>(
      DOCTYPE,
      await createFrappeDoc(
        DOCTYPE,
        toFrappe(DOCTYPE, {
          title,
          description: description || "",
          assignedTo,
          assignedBy: reqUser.id,
          priority: priority || "Medium",
          taskType: taskType || "One Time Task",
          dueDate,
          status: "Pending",
          notes: notes || "",
        })
      )
    );

    await notify({
      userId: assignedTo,
      title: "New Task Assigned",
      description: `New Task Assigned: ${title}`,
      type: "info",
    });

    const [enriched] = await withNames([created]);
    res.status(201).json({ message: "Task created successfully", task: enriched });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to create task" });
  }
}

export async function updateTaskStatus(req: Request, res: Response): Promise<void> {
  const reqUser = (req as any).user;
  if (!reqUser) {
    res.status(401).json({ message: "Unauthorized credentials" });
    return;
  }

  const { id } = req.params;
  const { status } = req.body;

  if (!status || !VALID_STATUSES.includes(status)) {
    res.status(400).json({ message: "Valid status (Pending, In Progress, Completed) is required." });
    return;
  }

  try {
    // Read through `toApp` — comparing against the raw document's `assignedTo` read
    // `undefined` and refused every employee updating their own task.
    const taskObj = toApp<any>(DOCTYPE, await getFrappeDoc(DOCTYPE, id));
    if (!taskObj) {
      res.status(404).json({ message: "Task not found" });
      return;
    }

    if (reqUser.role !== "Admin" && taskObj.assignedTo !== reqUser.id) {
      res.status(403).json({ message: "Access denied. You can only update your own assigned tasks." });
      return;
    }

    const updated = toApp<any>(
      DOCTYPE,
      await updateFrappeDoc(DOCTYPE, id, toFrappe(DOCTYPE, { status }))
    );

    const updaterName = reqUser.name || "User";
    await notifyAdmins({
      title: "Task Status Updated",
      description: `${updaterName} marked "${taskObj.title}" as ${status}`,
      type: status === "Completed" ? "success" : "info",
    });

    const [enriched] = await withNames([updated]);
    res.status(200).json({ message: "Task status updated successfully", task: enriched });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update task status" });
  }
}

export async function updateTask(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const existing = await getFrappeDoc(DOCTYPE, id);
    if (!existing) {
      res.status(404).json({ message: "Task not found" });
      return;
    }

    const updated = toApp<any>(
      DOCTYPE,
      await updateFrappeDoc(DOCTYPE, id, toFrappe(DOCTYPE, req.body))
    );

    const [enriched] = await withNames([updated]);
    res.status(200).json({ message: "Task details updated successfully", task: enriched });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update task details" });
  }
}

export async function deleteTask(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const existing = await getFrappeDoc(DOCTYPE, id);
    if (!existing) {
      res.status(404).json({ message: "Task not found" });
      return;
    }

    await deleteFrappeDoc(DOCTYPE, id);
    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete task" });
  }
}
