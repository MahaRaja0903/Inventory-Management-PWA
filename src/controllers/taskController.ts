import { Request, Response } from "express";
import mongoose from "mongoose";
import { Task } from "../models/Task";
import { Notification } from "../models/Notification";

const TaskModel = mongoose.model("Task");
const UserModel = mongoose.model("User");

// Helper to auto-instantiate Daily Tasks for the current day
async function syncDailyTasks() {
  try {
    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    
    // Find all Daily Tasks (we treat existing daily tasks as templates)
    const allDailyTasks = await TaskModel.find({ taskType: "Daily Task" }).lean() as any[];
    if (allDailyTasks.length === 0) return;

    // Group by title and assignedTo to identify unique templates
    const templates: { [key: string]: any } = {};
    for (const t of allDailyTasks) {
      const key = `${t.title.trim().toLowerCase()}_${t.assignedTo}`;
      if (!templates[key]) {
        templates[key] = t;
      } else {
        // Keep the oldest record as the source template
        if (new Date(t.createdAt).getTime() < new Date(templates[key].createdAt).getTime()) {
          templates[key] = t;
        }
      }
    }

    // Ensure there is an instance for today for each template
    for (const key in templates) {
      const template = templates[key];
      const hasTodayInstance = await TaskModel.findOne({
        title: template.title,
        assignedTo: template.assignedTo,
        taskType: "Daily Task",
        dueDate: todayStr
      }).lean();

      if (!hasTodayInstance) {
        const created = await TaskModel.create({
          title: template.title,
          description: template.description,
          assignedTo: template.assignedTo,
          assignedBy: template.assignedBy,
          priority: template.priority,
          taskType: "Daily Task",
          dueDate: todayStr,
          status: "Pending",
          notes: template.notes || "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        // Notify employee
        await Notification.create({
          userId: template.assignedTo,
          title: "New Daily Task Active",
          description: `Daily Task: "${template.title}" has been reactivated for today.`,
          message: `Daily Task: "${template.title}" has been reactivated for today.`,
          type: "info",
          isRead: false,
          createdAt: new Date().toISOString()
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
  const filter: any = {};

  if (employee) filter.assignedTo = employee;
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (date) filter.dueDate = date;

  try {
    const list = await Task.find(filter);
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
    const list = await Task.find({ assignedTo: reqUser.id });
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
    const created = await Task.create({
      title,
      description: description || "",
      assignedTo,
      assignedBy: reqUser.id,
      priority: priority || "Medium",
      taskType: taskType || "One Time Task",
      dueDate,
      status: "Pending",
      notes: notes || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Notify the assigned employee
    await Notification.create({
      userId: assignedTo,
      title: "New Task Assigned",
      description: `New Task Assigned: ${title}`,
      message: `New Task Assigned: ${title}`,
      type: "info",
      isRead: false,
      createdAt: new Date().toISOString()
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
    const taskObj = await Task.findById(id);
    if (!taskObj) {
      res.status(404).json({ message: "Task not found" });
      return;
    }

    // Verify employee updates their own task, admins can update any
    if (reqUser.role !== "Admin" && taskObj.assignedTo !== reqUser.id) {
      res.status(403).json({ message: "Access denied. You can only update your own assigned tasks." });
      return;
    }

    const updated = await Task.findByIdAndUpdate(id, { status });

    // Notify Admin of employee's status progress update
    const updaterName = reqUser.name;
    const adminNotification = {
      title: "Task Status Updated",
      description: `${updaterName} marked "${taskObj.title}" as ${status}`,
      message: `${updaterName} marked "${taskObj.title}" as ${status}`,
      type: (status === "Completed" ? "success" : "info") as "success" | "info" | "warning" | "danger",
      isRead: false,
      createdAt: new Date().toISOString()
    };

    // Find Admins to notify
    const admins = await UserModel.find({ role: "Admin" }).lean();
    for (const admin of admins) {
      await Notification.create({
        ...adminNotification,
        userId: admin._id.toString()
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
  const updates = req.body;

  try {
    const updated = await Task.findByIdAndUpdate(id, updates);
    if (!updated) {
      res.status(404).json({ message: "Task not found" });
      return;
    }
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
    const success = await Task.findByIdAndDelete(id);
    if (!success) {
      res.status(404).json({ message: "Task not found" });
      return;
    }
    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete task" });
  }
}
