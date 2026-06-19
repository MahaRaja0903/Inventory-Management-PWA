import { useState, useEffect } from "react";
import { AuthUser, Sale, Expense, InventoryItem, Attendance, Task } from "../types";
import { apiFetch } from "../lib/api";
import { TrendingUp, Coins, ClipboardList, AlertTriangle, UserCheck, CalendarDays, ShoppingBag, Plus, Sparkles, LogIn, LogOut, Loader, CheckCircle2, ClipboardCheck } from "lucide-react";

interface DashboardViewProps {
  user: AuthUser;
  setActiveTab: (tab: any) => void;
  triggerNotificationRefresh: () => void;
}

export default function DashboardView({ user, setActiveTab, triggerNotificationRefresh }: DashboardViewProps) {
  const isAdmin = user.role === "Admin";
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Attendance states for employee
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [salesData, expensesData, inventoryData, attendanceData, tasksData] = await Promise.all([
        apiFetch<Sale[]>("/sales"),
        apiFetch<Expense[]>("/expenses"),
        apiFetch<InventoryItem[]>("/inventory"),
        apiFetch<Attendance[]>("/attendance"),
        apiFetch<Task[]>(isAdmin ? "/tasks" : "/tasks/my")
      ]);

      setSales(salesData);
      setExpenses(expensesData);
      setInventory(inventoryData);
      setAttendance(attendanceData);
      setTasks(tasksData);

      // Extract today's attendance for employee
      if (!isAdmin) {
        const todayStr = new Date().toISOString().split("T")[0];
        const todayRec = attendanceData.find(a => a.employeeId === user.id && a.date === todayStr);
        setTodayAttendance(todayRec || null);
      }
    } catch (err: any) {
      setError("Failed to synchronize dashboard metrics.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Attendance helpers for employee
  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    try {
      const response = await apiFetch("/attendance/check-in", {
        method: "POST"
      });
      // Refresh
      await fetchData();
      triggerNotificationRefresh();
    } catch (err: any) {
      alert(err.message || "Attendance check-in failed");
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    setIsCheckingIn(true);
    try {
      const response = await apiFetch("/attendance/check-out", {
        method: "POST"
      });
      await fetchData();
      triggerNotificationRefresh();
    } catch (err: any) {
      alert(err.message || "Attendance check-out failed");
    } finally {
      setIsCheckingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 select-none">
        <Loader className="w-8 h-8 animate-spin text-amber-500 mb-2" />
        <p className="text-xs font-semibold uppercase tracking-wider">Synchronizing studio board...</p>
      </div>
    );
  }

  // --- STATS COMPUTATIONS ---
  // Sales computations
  const totalSalesCount = sales.length;
  const totalSalesRevenue = sales.reduce((sum, item) => sum + item.finalAmount, 0);

  const todayStr = new Date().toISOString().split("T")[0];
  const todaySales = sales.filter(s => s.createdAt?.startsWith(todayStr));
  const todayRevenue = todaySales.reduce((sum, s) => sum + s.finalAmount, 0);

  // Filter to active month scope
  const currentYearMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const monthlySales = sales.filter(s => s.createdAt?.startsWith(currentYearMonth));
  const monthlyRevenue = monthlySales.reduce((sum, s) => sum + s.finalAmount, 0);

  // Expense computations
  const approvedExpenses = expenses.filter(e => e.status === "Approved");
  const totalApprovedExpensesAmount = approvedExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netEarnings = totalSalesRevenue - totalApprovedExpensesAmount;

  // Inventory stats
  const totalSkuCount = inventory.length;
  const lowStockCount = inventory.filter(i => i.stockStatus === "Low Stock" || i.stockStatus === "Out of Stock").length;

  // Employee-specific computations
  const mySales = sales.filter(s => s.employeeId === user.id);
  const myMonthlySales = mySales.filter(s => s.createdAt?.startsWith(currentYearMonth));
  const myMonthlySalesRevenue = myMonthlySales.reduce((sum, s) => sum + s.finalAmount, 0);
  const myLoggedExpenses = expenses.filter(e => e.employeeId === user.id);
  const mySubmittedPendingCount = myLoggedExpenses.filter(e => e.status === "Pending").length;

  // Task computations for Admin
  const pendingTasksCount = tasks.filter(t => t.status === "Pending").length;
  const inProgressTasksCount = tasks.filter(t => t.status === "In Progress").length;
  const completedTodayCount = tasks.filter(t => t.status === "Completed" && t.updatedAt?.startsWith(todayStr)).length;

  // Task computations for Employee
  const myPendingTasksCount = tasks.filter(t => t.status === "Pending").length;
  const myCompletedTasksCount = tasks.filter(t => t.status === "Completed").length;
  const todayTasksCount = tasks.filter(t => t.dueDate === todayStr).length;

  return (
    <div id="dashboard-view-wrapper" className="space-y-8 select-none">
      {/* Intro Greetings Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-amber-500/5 to-transparent pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-amber-500 text-xs font-bold uppercase tracking-wider">Aquarius Management Platform</span>
              <Sparkles className="w-4.5 h-4.5 text-amber-500 animate-pulse" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Welcome back, {user.name}
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-lg">
              {isAdmin 
                ? "Here is the operational overview for Aquarius Tattoo Studio today. Monitor sales performance, approved expenses, and stock catalogs." 
                : "Manage your shift status, view your sales performance logs, or submit expense requests recursively."}
            </p>
          </div>

          <div className="flex gap-3">
            {!isAdmin ? (
              // Employee shift toggles
              <div className="flex gap-2.5">
                {!todayAttendance ? (
                  <button
                    onClick={handleCheckIn}
                    disabled={isCheckingIn}
                    className="bg-emerald-600 hover:bg-emerald-700 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-700/10 transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <LogIn className="w-4 h-4 text-slate-950" />
                    Check In Shift
                  </button>
                ) : todayAttendance.status === "Checked In" ? (
                  <button
                    onClick={handleCheckOut}
                    disabled={isCheckingIn}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/10 transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <LogOut className="w-4 h-4" />
                    Check Out Shift
                  </button>
                ) : (
                  <div className="bg-slate-950 border border-emerald-500/20 text-emerald-400 font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Shift Logged: Worked {todayAttendance.workingHours || 0} hrs
                  </div>
                )}
              </div>
            ) : (
              // Admin quick action toggling
              <button
                onClick={() => setActiveTab("sales")}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-transform active:scale-95 shadow-md shadow-amber-500/10 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Record New Sale
              </button>
            )}
          </div>
        </div>
      </div>

      {isAdmin ? (
        // ================= ADMIN DASHBOARD =================
        <>
          {/* Bento Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition-colors">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-slate-400 font-medium">Today's Sales</span>
                <div className="p-1 px-1.5 h-6 rounded bg-emerald-500/10 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                </div>
              </div>
              <p className="text-lg sm:text-2xl font-bold text-white">₹{todayRevenue.toFixed(2)}</p>
              <span className="text-[10px] text-slate-500 mt-1 block">{todaySales.length} services today</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition-colors">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-slate-400 font-medium">Monthly Revenue</span>
                <div className="p-1 px-1.5 h-6 rounded bg-amber-500/10 flex items-center justify-center">
                  <Coins className="w-3.5 h-3.5 text-amber-500" />
                </div>
              </div>
              <p className="text-lg sm:text-2xl font-bold text-white">₹{monthlyRevenue.toFixed(2)}</p>
              <span className="text-[10px] text-slate-500 mt-1 block">{monthlySales.length} items registered</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition-colors">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-slate-400 font-medium font-sans">Total Expenses</span>
                <div className="p-1 px-1.5 h-6 rounded bg-red-500/10 flex items-center justify-center">
                  <ClipboardList className="w-3.5 h-3.5 text-red-400" />
                </div>
              </div>
              <p className="text-lg sm:text-2xl font-bold text-white">₹{totalApprovedExpensesAmount.toFixed(2)}</p>
              <span className="text-[10px] text-slate-500 mt-1 block">Approved operating bills</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition-colors">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-slate-400 font-medium">Net Studio profit</span>
                <div className="p-1 px-1.5 h-6 rounded bg-cyan-500/10 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                </div>
              </div>
              <p className={`text-lg sm:text-2xl font-bold ${netEarnings >= 0 ? "text-cyan-400" : "text-red-400"}`}>
                ₹{netEarnings.toFixed(2)}
              </p>
              <span className="text-[10px] text-slate-500 mt-1 block">Net margin index</span>
            </div>
          </div>

          {/* Secondary stats overview for Admin regarding stock */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-4 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-amber-500 uppercase tracking-tight mb-0.5">Supply stock counts</h4>
                <p className="text-2xl font-extrabold text-white">{totalSkuCount} SKU Items</p>
                <span className="text-[10px] text-slate-400">Total cataloged studio items</span>
              </div>
              <ShoppingBag className="w-8 h-8 text-amber-500 opacity-60" />
            </div>

            <div className={`border rounded-xl p-4 flex items-center justify-between transition-colors ${
              lowStockCount > 0 
                ? "bg-red-500/5 border-red-500/20 text-red-300"
                : "bg-slate-900 border-slate-800 text-slate-300"
            }`}>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-tight mb-0.5">Low stock alarms</h4>
                <p className="text-2xl font-extrabold text-white">{lowStockCount} Products</p>
                <span className="text-[10px] text-slate-400">Needs instant replenishment</span>
              </div>
              <AlertTriangle className={`w-8 h-8 ${lowStockCount > 0 ? "text-red-400 animate-bounce" : "text-slate-500"}`} />
            </div>
          </div>

          {/* Tasks Management widgets */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition-colors cursor-pointer" onClick={() => setActiveTab("tasks")}>
              <span className="text-xs text-slate-400 font-medium block mb-1">Tasks Pending</span>
              <p className="text-lg sm:text-2xl font-bold text-amber-500">{pendingTasksCount}</p>
              <span className="text-[10px] text-slate-500 block">Awaiting assignment / start</span>
            </div>
            
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition-colors cursor-pointer" onClick={() => setActiveTab("tasks")}>
              <span className="text-xs text-slate-400 font-medium block mb-1">Tasks In Progress</span>
              <p className="text-lg sm:text-2xl font-bold text-sky-400">{inProgressTasksCount}</p>
              <span className="text-[10px] text-slate-500 block">Currently being executed</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition-colors cursor-pointer" onClick={() => setActiveTab("tasks")}>
              <span className="text-xs text-slate-400 font-medium block mb-1">Tasks Completed Today</span>
              <p className="text-lg sm:text-2xl font-bold text-emerald-400">{completedTodayCount}</p>
              <span className="text-[10px] text-slate-500 block">Finished operational objectives today</span>
            </div>
          </div>

          {/* Quick Analytics & Charts Preview with High-craft SVG representations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Trends Chart (Custom highly aligned SVG layout) */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Revenue Stream Trends</h4>
                  <p className="text-[10px] text-slate-400">Visualized revenue over recent logged services</p>
                </div>
                <div className="text-xs font-semibold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded">
                  Live Feed
                </div>
              </div>

              {sales.length === 0 ? (
                <div className="h-44 flex items-center justify-center text-slate-500 text-xs text-center border border-dashed border-slate-800 rounded">
                  No sales streams mapped yet.
                </div>
              ) : (
                <div id="revenue-chart" className="space-y-4">
                  {/* List recent 5 sales as horizontal aesthetic bars */}
                  {[...sales].sort((a,b)=> new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 4).map((item, idx) => {
                    const pct = Math.min(100, Math.max(15, (item.finalAmount / 500) * 100));
                    return (
                      <div key={item._id} className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-300 font-medium">{item.serviceType} (₹{item.finalAmount})</span>
                          <span className="text-slate-500 text-[10px]">
                            {new Date(item.createdAt).toLocaleDateString(undefined, {month: "short", day: "numeric"})}
                          </span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800/55">
                          <div 
                            style={{ width: `${pct}%` }} 
                            className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-300"
                          />
                        </div>
                      </div>
                    );
                  })}
                  <div className="text-center pt-2">
                    <button onClick={() => setActiveTab("reports")} className="text-amber-500 hover:text-amber-400 text-xs font-semibold cursor-pointer">
                      View Analytical Reports →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Attendance & Shift overview for Admins */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Checked-In Staff members Today</h4>
              <div className="space-y-3.5">
                {attendance.filter(a => a.date === todayStr).length === 0 ? (
                  <div className="py-8 flex flex-col items-center justify-center text-slate-500 text-xs border border-dashed border-slate-800 rounded">
                    <CalendarDays className="w-6 h-6 text-slate-700 mb-1" />
                    <span>No employee check-ins mapped today.</span>
                  </div>
                ) : (
                  attendance.filter(a => a.date === todayStr).map((shift) => (
                    <div key={shift._id} className="flex justify-between items-center p-2 rounded bg-slate-950 border border-slate-800/60">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                        <div>
                          <span className="text-xs font-semibold text-white block">Artist ID: {shift.employeeId}</span>
                          <span className="text-[10px] text-slate-400">GPS Loc: {shift.gpsLocation}</span>
                        </div>
                      </div>
                      <div className="text-right text-[11px]">
                        <span className="text-emerald-400 font-bold block">{shift.status}</span>
                        <span className="text-slate-500 text-[9px]">Check-In: {new Date(shift.checkInTime).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        // ================= EMPLOYEE PERFORMANCE VIEW =================
        <>
          {/* Quick Stats Bento for employee */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <span className="text-xs text-slate-400 font-medium block mb-2">My Sales Revenue (This month)</span>
              <p className="text-2xl font-extrabold text-amber-500">₹{myMonthlySalesRevenue.toFixed(2)}</p>
              <span className="text-[10px] text-slate-500 mt-1 block">{myMonthlySales.length} items sold</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <span className="text-xs text-slate-400 font-medium block mb-2">Pending ExpensesSubmitted</span>
              <p className="text-2xl font-extrabold text-white">{mySubmittedPendingCount} Request(s)</p>
              <span className="text-[10px] text-slate-500 mt-1 block">Awaiting admin review</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <span className="text-xs text-slate-400 font-medium block mb-2">Attendance Check-In Today</span>
              <div className="flex items-center gap-2 mt-1">
                {todayAttendance ? (
                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                    todayAttendance.status === "Checked In" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-slate-800 text-slate-400"
                  }`}>
                    {todayAttendance.status}
                  </span>
                ) : (
                  <span className="text-xs text-red-400 bg-red-400/5 border border-red-500/10 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                    Absent / Off
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-500 mt-2 block">
                {todayAttendance?.checkInTime 
                  ? `Logged in today at ${new Date(todayAttendance.checkInTime).toLocaleTimeString(undefined, {hour: '2-digit', minute: '2-digit'})}`
                  : "Submit check-in at shift beginning"
                }
              </span>
            </div>
          </div>

          {/* Employee Tasks Widgets */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition-colors cursor-pointer" onClick={() => setActiveTab("my-tasks")}>
              <span className="text-xs text-slate-400 font-medium block mb-1">My Pending Tasks</span>
              <p className="text-lg sm:text-2xl font-bold text-amber-500">{myPendingTasksCount}</p>
              <span className="text-[10px] text-slate-500 block">Awaiting execution</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition-colors cursor-pointer" onClick={() => setActiveTab("my-tasks")}>
              <span className="text-xs text-slate-400 font-medium block mb-1">My Completed Tasks</span>
              <p className="text-lg sm:text-2xl font-bold text-emerald-400">{myCompletedTasksCount}</p>
              <span className="text-[10px] text-slate-500 block font-sans">Total tasks resolved</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition-colors cursor-pointer" onClick={() => setActiveTab("my-tasks")}>
              <span className="text-xs text-slate-400 font-medium block mb-1">Today's Tasks</span>
              <p className="text-lg sm:text-2xl font-bold text-sky-400">{todayTasksCount}</p>
              <span className="text-[10px] text-slate-500 block">Due today</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* My Recent Works/Sales */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">My Recent Sales Transactions</h4>
              <div className="space-y-3">
                {mySales.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded">
                    You have not logged any sales transactions yet.
                  </div>
                ) : (
                  mySales.slice(0, 4).map((sale) => (
                    <div key={sale._id} className="flex justify-between items-center p-3 rounded bg-slate-950 border border-slate-800/50">
                      <div>
                        <span className="text-xs font-semibold text-white block">{sale.serviceType}</span>
                        <span className="text-[10px] text-slate-500">Method: {sale.paymentMethod}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-amber-500 block">₹{sale.finalAmount}</span>
                        <span className="text-[9px] text-slate-400">
                          {new Date(sale.createdAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Attendance summary statistics */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Attendance History (Current Month)</h4>
              <p className="text-xs text-slate-400 mb-4">Review your present check-in logs and gps coordinates.</p>
              
              <div className="space-y-3">
                {attendance.filter(a => a.employeeId === user.id).slice(0,3).map((item) => (
                  <div key={item._id} className="flex justify-between items-center text-xs p-2.5 rounded bg-slate-950 border border-slate-850">
                    <div>
                      <span className="font-semibold text-white block">{item.date}</span>
                      <span className="text-[9px] text-slate-500">Loc: {item.gpsLocation}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-emerald-400 block">{item.status}</span>
                      {item.workingHours && (
                        <span className="text-[9px] text-slate-400">{item.workingHours} Hours worked</span>
                      )}
                    </div>
                  </div>
                ))}
                <div className="text-center pt-2">
                  <button onClick={() => setActiveTab("attendance")} className="text-xs text-amber-500 hover:text-amber-400 font-semibold cursor-pointer">
                    View Complete Shifts Log →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
