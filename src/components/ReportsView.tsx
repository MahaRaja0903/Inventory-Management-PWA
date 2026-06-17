import { useState, useEffect } from "react";
import { AuthUser } from "../types";
import { apiFetch } from "../lib/api";
import { BarChart3, TrendingUp, DollarSign, PackageOpen, Award, ListChecks, CalendarRange, Sparkles, Loader } from "lucide-react";

interface ReportsViewProps {
  user: AuthUser;
}

type ReportSubTab = "revenue" | "expenses" | "attendance" | "inventory";

export default function ReportsView({ user }: ReportsViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<ReportSubTab>("revenue");
  const [loading, setLoading] = useState(true);

  // States
  const [dailySales, setDailySales] = useState<any[]>([]);
  const [monthlySales, setMonthlySales] = useState<any[]>([]);
  const [expensesReport, setExpensesReport] = useState<any | null>(null);
  const [attendanceReport, setAttendanceReport] = useState<any | null>(null);
  const [inventoryReport, setInventoryReport] = useState<any | null>(null);
  const [netProfit, setNetProfit] = useState<any | null>(null);

  const fetchAllReports = async () => {
    try {
      setLoading(true);
      const [daily, monthly, exp, att, inv, profit] = await Promise.all([
        apiFetch<any[]>("/reports/daily-sales"),
        apiFetch<any[]>("/reports/monthly-sales"),
        apiFetch<any>("/reports/expenses"),
        apiFetch<any>("/reports/attendance"),
        apiFetch<any>("/reports/inventory"),
        apiFetch<any>("/reports/net-profit")
      ]);

      setDailySales(daily);
      setMonthlySales(monthly);
      setExpensesReport(exp);
      setAttendanceReport(att);
      setInventoryReport(inv);
      setNetProfit(profit);
    } catch (err) {
      console.error("Failed to load reporting aggregators.", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllReports();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
        <Loader className="w-8 h-8 animate-spin text-amber-500 mb-2" />
        <p className="text-xs uppercase font-extrabold tracking-wider">Compiling analytical metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans select-none">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Studio Performance Analytics</h2>
        <p className="text-xs text-slate-400 font-sans">Query financial trends, operational bill breakdowns, personnel shift allocations, and stock assets valuations.</p>
      </div>

      {/* Overview Cards */}
      {netProfit && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-slate-800/60 pb-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Sales Revenue</span>
              <p className="text-xl font-black text-white mt-1">${netProfit.sales?.toFixed(2)}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Approved Expenses</span>
              <p className="text-xl font-black text-white mt-1">${netProfit.approvedExpenses?.toFixed(2)}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-red-400" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Net Studio Margin</span>
              <p className={`text-xl font-black mt-1 ${netProfit.netProfit >= 0 ? "text-cyan-400" : "text-red-400"}`}>
                ${netProfit.netProfit?.toFixed(2)}
              </p>
            </div>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${netProfit.netProfit >= 0 ? "bg-cyan-500/10" : "bg-red-500/10"}`}>
              <BarChart3 className={`w-5 h-5 ${netProfit.netProfit >= 0 ? "text-cyan-400" : "text-red-400"}`} />
            </div>
          </div>
        </div>
      )}

      {/* Sub Tabs control switcher */}
      <div className="flex border-b border-slate-800/80 gap-1.5 p-1 bg-slate-950/40 rounded-xl max-w-lg">
        {[
          { id: "revenue", label: "Monthly Income", icon: TrendingUp },
          { id: "expenses", label: "Bills & Spends", icon: DollarSign },
          { id: "attendance", label: "Artist Hours", icon: ListChecks },
          { id: "inventory", label: "Supply Assets", icon: PackageOpen }
        ].map(sub => {
          const isAct = activeSubTab === sub.id;
          const SubIcon = sub.icon;
          return (
            <button
              key={sub.id}
              onClick={() => setActiveSubTab(sub.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg border cursor-pointer transition-colors ${
                isAct 
                  ? "bg-amber-500 text-slate-950 border-amber-500" 
                  : "bg-slate-900 border-slate-800/40 text-slate-400 hover:text-white"
              }`}
            >
              <SubIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">{sub.label}</span>
            </button>
          );
        })}
      </div>

      {/* ACTIVE ANALYTICAL WIDGET */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        {activeSubTab === "revenue" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Monthly Revenues streams</h3>
              <p className="text-xs text-slate-500 font-sans mt-0.5">Aggregated visual trends over the standard financial calendar months.</p>
            </div>

            {monthlySales.length === 0 ? (
              <div className="py-12 text-center text-slate-550 text-xs">No monthly data mapped.</div>
            ) : (
              <div className="space-y-5">
                {/* Custom responsive bar diagram using pure Tailwind and divs */}
                <div className="pt-4 space-y-4 max-w-2xl">
                  {monthlySales.map(m => {
                    const maxVal = Math.max(...monthlySales.map(item => item.revenue), 500);
                    const percent = Math.min(100, Math.max(8, (m.revenue / maxVal) * 100));

                    return (
                      <div key={m.month} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-300 font-bold">{m.name}</span>
                          <span className="text-amber-500 font-mono font-bold">${m.revenue.toFixed(2)}</span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-4 overflow-hidden border border-slate-850">
                          <div 
                            style={{ width: `${percent}%` }} 
                            className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 h-full rounded-full flex items-center justify-end px-2"
                          >
                            {percent > 20 && (
                              <span className="text-[9px] text-slate-950 font-black leading-none uppercase">
                                {m.count} sells
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeSubTab === "expenses" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Business Cost allocations</h3>
              <p className="text-xs text-slate-500 font-sans mt-0.5 font-sans">Operating cost structures categorized by budget centers.</p>
            </div>

            {expensesReport && expensesReport.breakdown.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">No bill categories registered yet.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="space-y-3.5">
                  {expensesReport && expensesReport.breakdown.map((item: any) => {
                    const total = expensesReport.totalExpense || 1;
                    const pct = ((item.value / total) * 100).toFixed(1);
                    return (
                      <div key={item.name} className="space-y-1">
                        <div className="flex justify-between text-xs font-sans">
                          <span className="text-slate-300 font-semibold">{item.name}</span>
                          <span className="text-slate-400 font-bold">${item.value.toFixed(2)} <strong className="text-amber-505 font-medium ml-1">({pct}%)</strong></span>
                        </div>
                        <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-850">
                          <div style={{ width: `${pct}%` }} className="bg-red-500/80 h-full rounded-full" />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-slate-950 border border-slate-850 rounded-xl p-5 space-y-4">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Cost Accounting Summary</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-505 font-sans">Pending Approvals Amount</span>
                      <span className="text-amber-50 font-semibold">${expensesReport?.pendingExpense?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-505 font-sans">Cleared operating bills</span>
                      <span className="text-emerald-400 font-bold">${expensesReport?.approvedExpense?.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-slate-900 pt-2 flex justify-between font-bold">
                      <span className="text-slate-300 font-sans uppercase text-[10px]">Total cost logged</span>
                      <span className="text-white">${expensesReport?.totalExpense?.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSubTab === "attendance" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Artist Shift summaries</h3>
              <p className="text-xs text-slate-500 font-sans mt-0.5">Calculated shift counts and cumulative hours worked by each team artist.</p>
            </div>

            {attendanceReport && attendanceReport.employeeBreakdown.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">No artist check-ins on record.</div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl text-center">
                    <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wide">Average staff shift Duration</span>
                    <p className="text-2xl font-black text-white mt-1">{attendanceReport?.averageShiftDuration} hours</p>
                  </div>
                  <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl text-center">
                    <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wide">Team roster registrations</span>
                    <p className="text-2xl font-black text-white mt-1">{attendanceReport?.totalRegisteredEmployees} active creators</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {attendanceReport && attendanceReport.employeeBreakdown.map((emp: any) => (
                    <div key={emp.employeeEmail} className="p-3 bg-slate-950 rounded-xl border border-slate-850 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <strong className="text-white block">{emp.employeeName}</strong>
                        <span className="text-[10px] text-slate-500 italic block">{emp.employeeEmail}</span>
                      </div>
                      
                      <div className="text-right flex items-center gap-6">
                        <div>
                          <span className="text-slate-550 text-[10px] uppercase tracking-wider block font-bold leading-none mb-1">Present cycles</span>
                          <span className="font-semibold text-slate-200 block text-right leading-none">{emp.totalPresentDays} days</span>
                        </div>
                        <div>
                          <span className="text-slate-550 text-[10px] uppercase tracking-wider block font-bold leading-none mb-1">Shift length average</span>
                          <span className="font-bold text-amber-500 block text-right leading-none">{emp.averageShiftHours} hrs</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeSubTab === "inventory" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Asset evaluations</h3>
              <p className="text-xs text-slate-500 font-sans mt-0.5">Evaluated inventory value in stock based on original supply cost purchase price.</p>
            </div>

            {inventoryReport && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                  <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl">
                    <span className="text-slate-500 text-[9px] uppercase font-bold tracking-wider block">Supplies stock value</span>
                    <p className="text-xl font-extrabold text-amber-500 mt-1">${inventoryReport.totalAssetValue?.toFixed(2)}</p>
                  </div>
                  <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl">
                    <span className="text-slate-500 text-[9px] uppercase font-bold tracking-wider block">Physical stock count</span>
                    <p className="text-xl font-extrabold text-white mt-1">{inventoryReport.totalStockUnits} units</p>
                  </div>
                  <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl">
                    <span className="text-slate-500 text-[9px] uppercase font-bold tracking-wider block">Low Stock alarms</span>
                    <p className="text-xl font-extrabold text-white mt-1">{inventoryReport.lowStockCount} items</p>
                  </div>
                  <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl">
                    <span className="text-slate-500 text-[9px] uppercase font-bold tracking-wider block">Stock-out Warnings</span>
                    <p className="text-xl font-extrabold text-red-400 mt-1">{inventoryReport.outOfStockCount} items</p>
                  </div>
                </div>

                {/* Listing of alert items */}
                {inventoryReport.lowStockItems.length > 0 && (
                  <div className="space-y-3 pt-3">
                    <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider">Stock depletion Warnings</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {inventoryReport.lowStockItems.map((item: any) => (
                        <div key={item._id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-white block">{item.itemName}</span>
                            <span className="text-[10px] text-slate-500 mt-0.5 block">Supplier: {item.supplier}</span>
                          </div>
                          <span className="font-extrabold text-red-400 bg-red-400/5 px-2 py-1 border border-red-500/10 rounded">
                            {item.quantity} Left
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
