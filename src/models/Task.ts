import mongoose, { Schema } from "mongoose";
import { Task as TaskType } from "../types";

const taskSchema = new Schema<TaskType>({
  title: { type: String, required: true },
  description: { type: String, default: "" },
  assignedTo: { type: String, required: true },
  assignedToName: { type: String, default: "" },
  assignedBy: { type: String, required: true },
  assignedByName: { type: String, default: "" },
  priority: { type: String, enum: ["Low", "Medium", "High"], default: "Medium" },
  taskType: { type: String, enum: ["Daily Task", "One Time Task"], default: "One Time Task" },
  dueDate: { type: String, required: true },
  status: { type: String, enum: ["Pending", "In Progress", "Completed"], default: "Pending" },
  notes: { type: String, default: "" },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() }
});

taskSchema.set('toJSON', { virtuals: true, versionKey: false, transform: (doc, ret) => { ret._id = ret._id.toString(); } });

const TaskModel = mongoose.model<TaskType>("Task", taskSchema);

export class Task {
  private static async populateNames(task: any) {
    if (!task) return null;
    try {
      const UserModel = mongoose.model("User");
      if (task.assignedTo) {
        const u = await UserModel.findById(task.assignedTo).lean();
        if (u) {
          task.assignedToName = (u as any).name;
        }
      }
      if (task.assignedBy) {
        const u = await UserModel.findById(task.assignedBy).lean();
        if (u) {
          task.assignedByName = (u as any).name;
        }
      }
    } catch (e) {
      console.warn("Could not populate task names:", e);
    }
    return task;
  }

  static async find(query: any = {}): Promise<TaskType[]> {
    const list = await TaskModel.find(query).lean();
    for (const t of list) {
      await this.populateNames(t);
    }
    return list as TaskType[];
  }

  static async findById(id: string): Promise<TaskType | null> {
    const task = await TaskModel.findById(id).lean();
    if (task) {
      await this.populateNames(task);
    }
    return task as TaskType | null;
  }

  static async create(data: Partial<TaskType>): Promise<TaskType> {
    const newTask = new TaskModel(data);
    const saved = await newTask.save();
    const result = saved.toJSON();
    await this.populateNames(result);
    return result as TaskType;
  }

  static async findByIdAndUpdate(id: string, updates: Partial<TaskType>): Promise<TaskType | null> {
    const task = await TaskModel.findByIdAndUpdate(
      id,
      { $set: { ...updates, updatedAt: new Date().toISOString() } },
      { new: true }
    ).lean();
    if (task) {
      await this.populateNames(task);
    }
    return task as TaskType | null;
  }

  static async findByIdAndDelete(id: string): Promise<boolean> {
    const result = await TaskModel.findByIdAndDelete(id);
    return !!result;
  }

  static async countDocuments(query: any = {}): Promise<number> {
    return await TaskModel.countDocuments(query);
  }
}
