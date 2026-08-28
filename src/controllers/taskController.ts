import { Request, Response } from "express";
import { getFrappeDocs, getFrappeDoc, createFrappeDoc, updateFrappeDoc, deleteFrappeDoc } from "../config/frappeClient";

// Helper to auto-instantiate Daily Tasks for the current day
async function syncDailyTasks() {
  try {
    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    
    const allTasks = await getFrappeDocs("ATS Task");
    const allDailyTasks = allTasks.filter((t: any) => t.taskType === "Daily Task");
    if (allDailyTasks.length === 0) return;

    // Group by title and assignedTo to identify unique templates
    const templates: { [key: string]: any } = {};
    for (const t of allDailyTasks) {
      const key = `${(t.title || "").trim().toLowerCase()}_${t.assignedTo}`;
      if (!templates[key]) {
        templates[key] = t;
      } else {
        // Keep the oldest record as the source template
        const tTime = t.creation ? new Date(t.creation).getTime() : 0;
        const tmplTime = templates[key].creation ? new Date(templates[key].creation).getTime() : 0;
        if (tTime < tmplTime) {
          templates[key] = t;
        }
      }
    }

    // Ensure there is an instance for today for each template
    for (const key in templates) {
      const template = templates[key];
      const hasTodayInstance = allDailyTasks.find((t: any) => 
        t.title === template.title &&
        t.assignedTo === template.assignedTo &&
        t.dueDate === todayStr
      );

      if (!hasTodayInstance) {
        await createFrappeDoc("ATS Task", {
          title: template.title,
          description: template.description,
          assignedTo: template.assignedTo,
          assignedto: template.assignedTo,
          assignedBy: template.assignedBy,
          assignedby: template.assignedBy,
          priority: template.priority,
          taskType: "Daily Task",
          tasktype: "Daily Task",
          dueDate: todayStr,
          duedate: todayStr,
          status: "Pending",
          notes: template.notes || ""
        });

        // Notify employee
        await createFrappeDoc("ATS Notification", {
          userId: template.assignedTo,
          title: "New Daily Task Active",
          description: `Daily Task: "${template.title}" has been reactivated for today.`,
          message: `Daily Task: "${template.title}" has been reactivated for today.`,
          type: "info",
          isRead: 0
        });
      }
    }
  } catch (err) {
    console.error("Failed to sync daily tasks templates:", err);
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
    let list = await getFrappeDocs("ATS Task");
    
    list = list.map((doc: any) => ({ 
      ...doc, 
      _id: doc.name,
      assignedTo: doc.assignedto || doc.assignedTo,
      assignedBy: doc.assignedby || doc.assignedBy,
      taskType: doc.tasktype || doc.taskType,
      dueDate: doc.duedate || doc.dueDate 
    }));
    
    if (employee) list = list.filter((t: any) => t.assignedTo === employee);
    if (status) list = list.filter((t: any) => t.status === status);
    if (priority) list = list.filter((t: any) => t.priority === priority);
    if (date) list = list.filter((t: any) => t.dueDate === date);

    list.sort((a: any, b: any) => new Date(b.creation || 0).getTime() - new Date(a.creation || 0).getTime());
    
    res.status(200).json(list);
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
    let list = await getFrappeDocs("ATS Task");
    list = list.map((doc: any) => ({ 
      ...doc, 
      _id: doc.name,
      assignedTo: doc.assignedto || doc.assignedTo,
      assignedBy: doc.assignedby || doc.assignedBy,
      taskType: doc.tasktype || doc.taskType,
      dueDate: doc.duedate || doc.dueDate 
    }));
    list = list.filter((t: any) => t.assignedTo === reqUser.id);
    list.sort((a: any, b: any) => new Date(b.creation || 0).getTime() - new Date(a.creation || 0).getTime());
    
    res.status(200).json(list);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to retrieve employee tasks" });
  }
}

export async function createTask(req: Request, res: Response): Promise<void> {
  const reqUser = (req as any).user;
  if (!reqUser || reqUser.role !== "Admin") {
    res.status(403).json({ message: "Access denied. Admin authorization required." });
    return;
  }

  const { title, description, assignedTo, priority, taskType, dueDate, notes } = req.body;

  if (!title || !assignedTo || !dueDate) {
    res.status(400).json({ message: "Title, Assigned Employee, and Due Date are required fields." });
    return;
  }

  try {
    const created = await createFrappeDoc("ATS Task", {
      title,
      description: description || "",
      assignedTo,
      assignedto: assignedTo,
      assignedBy: reqUser.id,
      assignedby: reqUser.id,
      priority: priority || "Medium",
      taskType: taskType || "One Time Task",
      tasktype: taskType || "One Time Task",
      dueDate,
      duedate: dueDate,
      status: "Pending",
      notes: notes || ""
    });
    created._id = created.name;

    // Notify the assigned employee
    await createFrappeDoc("ATS Notification", {
      userId: assignedTo,
      title: "New Task Assigned",
      description: `New Task Assigned: ${title}`,
      message: `New Task Assigned: ${title}`,
      type: "info",
      isRead: 0
    });

    res.status(201).json({ message: "Task created successfully", task: created });
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

  if (!status || !["Pending", "In Progress", "Completed"].includes(status)) {
    res.status(400).json({ message: "Valid status (Pending, In Progress, Completed) is required." });
    return;
  }

  try {
    const taskObj = await getFrappeDoc("ATS Task", id);
    if (!taskObj) {
      res.status(404).json({ message: "Task not found" });
      return;
    }

    // Verify employee updates their own task, admins can update any
    if (reqUser.role !== "Admin" && taskObj.assignedTo !== reqUser.id) {
      res.status(403).json({ message: "Access denied. You can only update your own assigned tasks." });
      return;
    }

    const updated = await updateFrappeDoc("ATS Task", id, { status });
    updated._id = updated.name;

    // Notify Admin of employee's status progress update
    const updaterName = reqUser.name || reqUser.fullName || "User";
    const adminNotification = {
      title: "Task Status Updated",
      description: `${updaterName} marked "${taskObj.title}" as ${status}`,
      message: `${updaterName} marked "${taskObj.title}" as ${status}`,
      type: (status === "Completed" ? "success" : "info"),
      isRead: 0
    };

    // Find Admins to notify
    const allUsers = await getFrappeDocs("ATS User");
    const admins = allUsers.filter((u: any) => u.role === "Admin");
    
    for (const admin of admins) {
      await createFrappeDoc("ATS Notification", {
        ...adminNotification,
        userId: admin.name
      });
    }

    res.status(200).json({ message: "Task status updated successfully", task: updated });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update task status" });
  }
}

export async function updateTask(req: Request, res: Response): Promise<void> {
  const reqUser = (req as any).user;
  if (!reqUser || reqUser.role !== "Admin") {
    res.status(403).json({ message: "Access denied. Admin authorization required." });
    return;
  }

  const { id } = req.params;
  const updates: any = { ...req.body };
  if (updates.assignedTo !== undefined) updates.assignedto = updates.assignedTo;
  if (updates.assignedBy !== undefined) updates.assignedby = updates.assignedBy;
  if (updates.taskType !== undefined) updates.tasktype = updates.taskType;
  if (updates.dueDate !== undefined) updates.duedate = updates.dueDate;

  try {
    const updated = await updateFrappeDoc("ATS Task", id, updates);
    if (!updated) {
      res.status(404).json({ message: "Task not found" });
      return;
    }
    updated._id = updated.name;
    res.status(200).json({ message: "Task details updated successfully", task: updated });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update task details" });
  }
}

export async function deleteTask(req: Request, res: Response): Promise<void> {
  const reqUser = (req as any).user;
  if (!reqUser || reqUser.role !== "Admin") {
    res.status(403).json({ message: "Access denied. Admin authorization required." });
    return;
  }

  const { id } = req.params;

  try {
    await deleteFrappeDoc("ATS Task", id);
    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete task" });
  }
}
