import mongoose, { Schema } from "mongoose";
import { SystemSettings as SettingsType } from "../types";

const settingsSchema = new Schema<SettingsType>({
  theme: { type: String, enum: ["light", "dark"], default: "dark" },
  notificationEnabled: { type: Boolean, default: true },
  profileSettings: {
    studioName: { type: String, default: "Aquarius Tattoo Studio" },
    studioEmail: { type: String, default: "info@aquariustattoo.com" },
    studioPhone: { type: String, default: "+1 (234) 567-890" },
    studioAddress: { type: String, default: "77 Aquarius Way, Ink City, IC 90210" }
  }
});

settingsSchema.set('toJSON', { virtuals: true, versionKey: false, transform: (doc, ret) => { ret._id = ret._id.toString(); } });

const SettingsModel = mongoose.model<SettingsType>("Settings", settingsSchema);

export class Settings {
  static async get(): Promise<SettingsType> {
    let settings = await SettingsModel.findOne().lean();
    if (!settings) {
      const newSettings = new SettingsModel({});
      settings = await newSettings.save() as any;
    }
    return settings as SettingsType;
  }

  static async update(updates: Partial<SettingsType>): Promise<SettingsType> {
    const current = await this.get();
    return await SettingsModel.findByIdAndUpdate(
      current._id,
      { $set: updates },
      { new: true, upsert: true }
    ).lean() as SettingsType;
  }
}
