import mongoose, { Schema } from "mongoose";
import { Attendance as AttendanceType } from "../types";

const attendanceSchema = new Schema<AttendanceType>({
  employeeId: { type: String, required: true },
  checkInTime: { type: String, required: true },
  checkOutTime: { type: String },
  workingHours: { type: Number },
  gpsLocation: { type: String, default: "34.0522, -118.2437" },
  date: { type: String, required: true },
  status: { type: String, enum: ["Checked In", "Checked Out", "Absent"], default: "Checked In" }
});

attendanceSchema.set('toJSON', { virtuals: true, versionKey: false, transform: (doc, ret) => { ret._id = ret._id.toString(); } });

const AttendanceModel = mongoose.model<AttendanceType>("Attendance", attendanceSchema);

export class Attendance {
  static async find(query: Partial<AttendanceType> = {}): Promise<AttendanceType[]> {
    return await AttendanceModel.find(query).lean();
  }

  static async findOne(query: Partial<AttendanceType>): Promise<AttendanceType | null> {
    return await AttendanceModel.findOne(query).lean();
  }

  static async create(data: Partial<AttendanceType>): Promise<AttendanceType> {
    const checkIn = data.checkInTime || new Date().toISOString();
    const todayStr = checkIn.split("T")[0];

    const newAttendance = new AttendanceModel({
      ...data,
      checkInTime: checkIn,
      date: data.date || todayStr
    });
    return await newAttendance.save();
  }

  static async findByIdAndUpdate(id: string, updates: Partial<AttendanceType>): Promise<AttendanceType | null> {
    if (updates.checkOutTime) {
      const doc = await AttendanceModel.findById(id);
      if (doc && !updates.workingHours) {
        const inTime = new Date(doc.checkInTime).getTime();
        const outTime = new Date(updates.checkOutTime).getTime();
        updates.workingHours = Number(((outTime - inTime) / (1000 * 60 * 60)).toFixed(2));
      }
    }
    return await AttendanceModel.findByIdAndUpdate(id, updates, { new: true }).lean();
  }
}
