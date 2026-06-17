import React, { useState, useEffect } from "react";
import { AuthUser, SystemSettings } from "../types";
import { apiFetch } from "../lib/api";
import { Settings, Save, ShieldAlert, CheckCircle } from "lucide-react";

interface SettingsViewProps {
  user: AuthUser;
}

export default function SettingsView({ user }: SettingsViewProps) {
  const isAdmin = user.role === "Admin";
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState("");

  // Form Fields
  const [studioName, setStudioName] = useState("");
  const [studioEmail, setStudioEmail] = useState("");
  const [studioPhone, setStudioPhone] = useState("");
  const [studioAddress, setStudioAddress] = useState("");
  const [notificationEnabled, setNotificationEnabled] = useState(true);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<SystemSettings>("/settings");
      setSettings(data);
      setStudioName(data.profileSettings.studioName);
      setStudioEmail(data.profileSettings.studioEmail);
      setStudioPhone(data.profileSettings.studioPhone);
      setStudioAddress(data.profileSettings.studioAddress);
      setNotificationEnabled(data.notificationEnabled);
    } catch {
      console.error("Failed to load setup files.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    const payload = {
      notificationEnabled,
      profileSettings: {
        studioName,
        studioEmail,
        studioPhone,
        studioAddress
      }
    };

    try {
      setSuccess("");
      await apiFetch("/settings", {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      setSuccess("Studio settings adjusted successfully!");
      // Clear alert after some time
      setTimeout(() => setSuccess(""), 4000);
      await fetchSettings();
    } catch (err: any) {
      alert("Failed to modify settings.");
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-8 text-center text-xs animate-pulse text-slate-500 rounded-xl">
        Syncing system directories...
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6 font-sans select-none">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Studio Configuration Settings</h2>
        <p className="text-xs text-slate-400">Manage business details, email pipelines, support lines and active coordinates.</p>
      </div>

      {success && (
        <div className="bg-emerald-950 border border-emerald-500/20 text-emerald-400 text-xs p-3.5 rounded-xl flex items-center gap-2 animate-pulse font-semibold">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Settings className="w-4 h-4 text-amber-500" />
          Studio Profile Coordinates
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] text-slate-400 uppercase tracking-wide font-bold mb-1.5">Tattoo Studio Brand Name</label>
            <input
              type="text"
              required
              disabled={!isAdmin}
              value={studioName}
              onChange={(e) => setStudioName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500 disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-slate-400 uppercase tracking-wide font-bold mb-1.5">Administrative Support Email</label>
              <input
                type="email"
                required
                disabled={!isAdmin}
                value={studioEmail}
                onChange={(e) => setStudioEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 uppercase tracking-wide font-bold mb-1.5">Studio Phone Line</label>
              <input
                type="text"
                required
                disabled={!isAdmin}
                value={studioPhone}
                onChange={(e) => setStudioPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 uppercase tracking-wide font-bold mb-1.5 font-sans">Business Physical Address</label>
            <textarea
              required
              disabled={!isAdmin}
              value={studioAddress}
              onChange={(e) => setStudioAddress(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none disabled:opacity-50"
            />
          </div>

          <div className="py-2.5 flex items-center justify-between border-t border-slate-850">
            <div>
              <span className="block text-xs font-semibold text-white">Enable Push Alerts</span>
              <span className="text-[10px] text-slate-500 font-sans block">Notify employees upon low items, approvals, and logs registers.</span>
            </div>
            <input
              type="checkbox"
              disabled={!isAdmin}
              checked={notificationEnabled}
              onChange={(e) => setNotificationEnabled(e.target.checked)}
              className="w-5 h-5 text-amber-500 bg-slate-950 border-slate-800 rounded focus:ring-amber-500 disabled:opacity-50 cursor-pointer"
            />
          </div>
        </div>

        {isAdmin ? (
          <div className="border-t border-slate-850 pt-4 text-right">
            <button
              type="submit"
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 inline-flex transition-transform active:scale-95 shadow-md shadow-amber-500/10 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Save Configuration Settings
            </button>
          </div>
        ) : (
          <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl flex items-start gap-2.5 text-[11px] text-slate-500">
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Profile settings are restricted. Contact Aquarius Workspace Admin if amendments are needed.</span>
          </div>
        )}
      </form>
    </div>
  );
}
