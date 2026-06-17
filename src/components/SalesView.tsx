import { useState, useEffect } from "react";
import { AuthUser, Customer, Sale, User } from "../types";
import { apiFetch } from "../lib/api";
import { Receipt, Search, Plus, Trash2, X, Sparkles, Check, CheckCircle2, UserCheck, DollarSign } from "lucide-react";

interface SalesViewProps {
  user: AuthUser;
}

export default function SalesView({ user }: SalesViewProps) {
  const isAdmin = user.role === "Admin";
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Form Fields
  const [customerId, setCustomerId] = useState("");
  const [employeeId, setEmployeeId] = useState(user.id); // Default to current employee logging
  const [serviceType, setServiceType] = useState<any>("Tattoo");
  const [amount, setAmount] = useState("");
  const [discount, setDiscount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<any>("UPI");

  // Custom portfolio details fields if linked to client
  const [tattooDetails, setTattooDetails] = useState("");
  const [piercingDetails, setPiercingDetails] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [salesData, customerData, staffData] = await Promise.all([
        apiFetch<Sale[]>("/sales"),
        apiFetch<Customer[]>("/customers"),
        apiFetch<User[]>("/employees")
      ]);
      setSales(salesData);
      setCustomers(customerData);
      // Filter active employees list
      setStaff(staffData.filter(s => s.role === "Employee" || s.role === "Admin"));
    } catch {
      console.error("Failed to load sales coordinates.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceType || !amount || Number(amount) <= 0) {
      alert("Please provide the Service Type and a valid active amount.");
      return;
    }

    const payload = {
      customerId: customerId || undefined,
      employeeId,
      serviceType,
      amount: Number(amount),
      discount: Number(discount),
      paymentMethod,
      tattooDetails: serviceType === "Tattoo" ? tattooDetails : undefined,
      piercingDetails: serviceType === "Piercing" ? piercingDetails : undefined
    };

    try {
      await apiFetch("/sales", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      // Clear states
      setCustomerId("");
      setAmount("");
      setDiscount("0");
      setTattooDetails("");
      setPiercingDetails("");
      setPaymentMethod("UPI");

      alert("Sales transaction logged successfully!");
      await fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to registers sale.");
    }
  };

  const handleDeleteSale = async (id: string) => {
    if (!confirm("Are you sure you want to delete this sales transaction record? This will adjust related client metrics, and cannot be undone.")) {
      return;
    }

    try {
      await apiFetch(`/sales/${id}`, { method: "DELETE" });
      await fetchData();
    } catch {
      alert("Error deleting record.");
    }
  };

  // Calculations
  const finalPrice = Math.max(0, Number(amount || 0) - Number(discount || 0));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 font-sans select-none">
      {/* LEFT SECTION: LOGGER PANEL (3 cols) */}
      <div className="lg:col-span-3 space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-amber-500/5 to-transparent pointer-events-none" />
          
          <div className="mb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <Receipt className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white uppercase tracking-wider">Log Service Sale</h2>
              <p className="text-[11px] text-slate-400">Record a payment transaction matching booking styles and link to client files.</p>
            </div>
          </div>

          <form onSubmit={handleCreateSale} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1.5">Link Customer Profile (Optional)</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-705 rounded-lg text-xs text-white"
                >
                  <option value="">Walk-In Client (Anonymous)</option>
                  {customers.map(c => (
                    <option key={c._id} value={c._id}>{c.name} — Phone: {c.mobile}</option>
                  ))}
                </select>
              </div>

              {isAdmin ? (
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1.5">Artist Attributed</label>
                  <select
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-705 rounded-lg text-xs text-white"
                  >
                    {staff.map(emp => (
                      <option key={emp._id} value={emp._id}>{emp.name} ({emp.role})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1.5">Attributed Artist</label>
                  <div className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-400">
                    {user.name} (Self)
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1.5">Service Type</label>
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-705 rounded-lg text-xs text-white"
                >
                  <option value="Tattoo">Tattoo Session</option>
                  <option value="Piercing">Piercing</option>
                  <option value="Aftercare Product">Aftercare Product</option>
                  <option value="Other">Other Sales</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1.5">Sales Amount ($)</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 350.00"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1.5">Amount Discount ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>
            </div>

            {/* Custom service description sheets */}
            {serviceType === "Tattoo" && customerId && (
              <div className="space-y-1 animate-fadeIn">
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1.5">Tattoo Design Details (Historical portfolio record)</label>
                <textarea
                  value={tattooDetails}
                  onChange={(e) => setTattooDetails(e.target.value)}
                  rows={2}
                  placeholder="e.g. Custom anchor black-and-grey sleeve segment, 3 hours session."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none"
                />
              </div>
            )}

            {serviceType === "Piercing" && customerId && (
              <div className="space-y-1 animate-fadeIn">
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1.5">Piercing Placement Details</label>
                <textarea
                  value={piercingDetails}
                  onChange={(e) => setPiercingDetails(e.target.value)}
                  rows={2}
                  placeholder="e.g. Septum piercing on fore septum with 1.2mm titanium loop."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1.5">Payment Method Channels</label>
                <div className="grid grid-cols-4 gap-2">
                  {["UPI", "Card", "Cash", "Bank Transfer"].map((method) => {
                    const isSel = paymentMethod === method;
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method as any)}
                        className={`py-2 text-[10px] font-bold uppercase rounded-lg border text-center cursor-pointer transition-colors ${
                          isSel 
                            ? "bg-amber-500 text-slate-950 border-amber-500 font-extrabold" 
                            : "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-850"
                        }`}
                      >
                        {method}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ledger Summary Widget */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span>Gross Cost:</span>
                  <span>${Number(amount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-500 border-b border-slate-900 pb-1.5">
                  <span>Discount Adjusted:</span>
                  <span>-${Number(discount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm pt-2">
                  <span className="font-bold text-white uppercase text-[10px] tracking-wider">Final Billing Cost:</span>
                  <span className="font-extrabold text-amber-500 text-base">${finalPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-850 pt-4 text-right">
              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 inline-flex shadow-lg shadow-amber-500/10 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Commit / Registers Sale
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* RIGHT SECTION: CHRONOLOGICAL TRANSACTIONS RECENTS (2 cols) */}
      <div className="lg:col-span-2 space-y-4">
        <div>
          <h2 className="text-base font-bold text-white uppercase tracking-wider">Recent Transactions</h2>
          <p className="text-[11px] text-slate-400">Daily chronological sales stream from employees.</p>
        </div>

        {loading ? (
          <div className="bg-slate-900 border border-slate-805 h-40 animate-pulse text-xs text-slate-500 rounded-xl p-6" />
        ) : sales.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl py-12 text-center select-none">
            <DollarSign className="w-12 h-12 text-slate-700 mx-auto mb-2" />
            <h4 className="text-white text-xs font-bold uppercase tracking-wider">No Sales Registered</h4>
            <p className="text-slate-500 text-[10px] mt-1 max-w-[200px] mx-auto">Fill out the log form above to record transaction flows.</p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {[...sales].sort((a,b)=> new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((sale: any) => (
              <div key={sale._id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-3 relative">
                <div>
                  <span className="text-[9px] bg-slate-950 border border-slate-850 text-slate-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                    {sale.serviceType}
                  </span>
                  <h4 className="text-xs font-bold text-white mt-1.5">{sale.customerName || "Walk-In Client"}</h4>
                  <div className="text-[10px] text-slate-400 space-y-0.5 font-sans mt-0.5">
                    <span>Artist: <strong className="text-slate-300">{sale.employeeName}</strong></span>
                    <span className="block text-[9px] text-slate-500 font-mono">Channel: {sale.paymentMethod}</span>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end gap-1">
                  <span className="text-xs text-slate-400 line-through text-[11px]">
                    {sale.discount > 0 ? `$${sale.amount}` : ""}
                  </span>
                  <span className="text-sm font-bold text-amber-500">${sale.finalAmount}</span>
                  <span className="text-[9px] text-slate-550 font-mono">
                    {new Date(sale.createdAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                  </span>
                  
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteSale(sale._id)}
                      className="p-1 hover:text-red-400 rounded transition-colors text-slate-600 border border-transparent hover:border-red-500/10 hover:bg-red-500/5 mt-1"
                      title="Delete Transaction"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
