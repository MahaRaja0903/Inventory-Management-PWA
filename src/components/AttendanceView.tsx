import { useState, useEffect } from "react";
import { AuthUser, Attendance } from "../types";
import { apiFetch } from "../lib/api";
import { CalendarClock, MapPin, Search, LogIn, LogOut, CheckCircle, Clock } from "lucide-react";

interface AttendanceViewProps {
  user: AuthUser;
}

export default function AttendanceView({ user }: AttendanceViewProps) {
  const isAdmin = user.role === "Admin";
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPunching, setIsPunching] = useState(false);

  // Search filter
  const [nameSearch, setNameSearch] = useState("");
  const [dateSearch, setDateSearch] = useState("");

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<any[]>("/attendance/history");
      setLogs(data);
    } catch {
      console.error("Failed to load historical rosters.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleAction = async (type: "check-in" | "check-out") => {
    setIsPunching(true);
    try {
      await apiFetch(`/attendance/${type}`, {
        method: "POST",
        body: JSON.stringify({ gpsLocation: "34.0522, -118.2437" }) // Mock Beverly Hills GPS block coordinates
      });
      await fetchLogs();
    } catch (err: any) {
      alert(err.message || "Attendance submission failed.");
    } finally {
      setIsPunching(false);
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const myTodayStatus = logs.find(item => item.employeeId === user.id && item.date === todayStr);

  const filteredLogs = logs.filter(item => {
    const name = item.employeeName || "";
    const matchesName = name.toLowerCase().includes(nameSearch.toLowerCase());
    const matchesDate = !dateSearch || item.date === dateSearch;
    return matchesName && matchesDate;
  });

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Staff Attendance Rosters</h2>
          <p className="text-xs text-slate-400">Log checking times, gps locations, total shift hours and track active daily artist worksheets.</p>
        </div>

        {/* Dynamic Punch Clock widget for employees */}
        {!isAdmin && (
          <div className="bg-slate-900 border border-slate-850 rounded-xl p-3 flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold leading-none mb-1">My Status Today</span>
              {myTodayStatus ? (
                <div className="flex items-center gap-1.5 text-xs font-bold text-white leading-none">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>{myTodayStatus.status} At {new Date(myTodayStatus.checkInTime).toLocaleTimeString(undefined, {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
              ) : (
                <span className="text-xs font-bold text-red-400 leading-none">Not Checked In</span>
              )}
            </div>

            <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
              {!myTodayStatus ? (
                <button
                  onClick={() => handleAction("check-in")}
                  disabled={isPunching}
                  className="bg-emerald-600 hover:bg-emerald-700 text-slate-950 font-extrabold text-[10px] uppercase px-3 py-1.5 rounded cursor-pointer transition-transform active:scale-95 disabled:opacity-40"
                >
                  Punch In
                </button>
              ) : myTodayStatus.status === "Checked In" ? (
                <button
                  onClick={() => handleAction("check-out")}
                  disabled={isPunching}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-[10px] uppercase px-3 py-1.5 rounded cursor-pointer transition-transform active:scale-95 disabled:opacity-40"
                >
                  Punch Out
                </button>
              ) : (
                <span className="text-[10px] font-bold text-emerald-400">Shift Logged</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Filters Form for Admin */}
      {isAdmin && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1.5">Filter by Employee Name</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-450" />
              <input
                type="text"
                placeholder="Search staff lists..."
                value={nameSearch}
                onChange={(e) => setNameSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-707 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-[#f59e0b]	"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1.5">Filter by Specific Date</label>
            <input
              type="date"
              value={dateSearch}
              onChange={(e) => setDateSearch(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-707 rounded-lg text-xs text-white"
            />
          </div>
        </div>
      )}

      {/* Punch Table Log */}
      {loading ? (
        <div className="bg-slate-900 border border-slate-805 p-12 text-center text-xs text-slate-500 animate-pulse rounded-xl">
          Harvesting clock entries...
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl py-12 text-center">
          <CalendarClock className="w-12 h-12 text-slate-700 mx-auto mb-2" />
          <h3 className="text-white text-sm font-bold">No Attendance Logs Mapped</h3>
          <p className="text-slate-500 text-xs mt-1">Punch logs show up once checked-in.</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 uppercase font-bold tracking-wider select-none">
                  <th className="p-4">Artist Staff</th>
                  <th className="p-4">Shift Date</th>
                  <th className="p-4">Check-In Time</th>
                  <th className="p-4">Check-Out Time</th>
                  <th className="p-4">GPS Location</th>
                  <th className="p-4">Hours Logged</th>
                  <th className="p-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredLogs.map((log) => {
                  const outTime = log.checkOutTime;
                  return (
                    <tr key={log._id} className="hover:bg-slate-950/20 transition-colors">
                      <td className="p-4">
                        <span className="font-bold text-white block">{log.employeeName}</span>
                        <span className="text-[10px] text-slate-500 font-mono block">Artist ID: {log.employeeId}</span>
                      </td>
                      <td className="p-4 text-slate-350">{log.date}</td>
                      <td className="p-4 font-mono text-slate-400">
                        {new Date(log.checkInTime).toLocaleTimeString(undefined, {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                      </td>
                      <td className="p-4 font-mono text-slate-400">
                        {outTime 
                          ? new Date(outTime).toLocaleTimeString(undefined, {hour: '2-digit', minute:'2-digit', second:'2-digit'})
                          : "—"
                        }
                      </td>
                      <td className="p-4 font-sans text-slate-400 italic flex items-center gap-1.5 mt-2.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>{log.gpsLocation}</span>
                      </td>
                      <td className="p-4 font-bold text-amber-500">
                        {log.workingHours !== undefined ? `${log.workingHours} hrs` : "—"}
                      </td>
                      <td className="p-4 text-right">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          log.status === "Checked Out" ? "bg-slate-800 text-slate-400" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse"
                        }`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
