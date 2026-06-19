import mongoose, { Schema } from "mongoose";
import { NotificationItem as NotificationType } from "../types";

const notificationSchema = new Schema<NotificationType>({
  userId: { type: String, default: null },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  message: { type: String, default: "" },
  type: { type: String, enum: ["info", "success", "warning", "danger"], default: "info" },
  isRead: { type: Boolean, default: false },
  createdAt: { type: String, default: () => new Date().toISOString() }
});

notificationSchema.set('toJSON', { virtuals: true, versionKey: false, transform: (doc, ret) => { ret._id = ret._id.toString(); } });

const NotificationModel = mongoose.model<NotificationType>("Notification", notificationSchema);

export class Notification {
  static async find(query: Partial<NotificationType> = {}): Promise<NotificationType[]> {
    return await NotificationModel.find(query).lean();
  }

  static async create(data: Partial<NotificationType>): Promise<NotificationType> {
    const newItem = new NotificationModel(data);
    return await newItem.save();
  }

  static async markAsRead(id: string): Promise<NotificationType | null> {
    return await NotificationModel.findByIdAndUpdate(id, { isRead: true }, { new: true }).lean();
  }

  static async delete(id: string): Promise<boolean> {
    const result = await NotificationModel.findByIdAndDelete(id);
    return !!result;
  }
}
