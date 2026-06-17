import React, { useState, useEffect } from "react";
import { AuthUser, Expense } from "../types";
import { apiFetch } from "../lib/api";
import { Coins, Search, FileDown, Plus, CheckCircle, XCircle, Trash2, X, AlertCircle } from "lucide-react";

interface ExpensesViewProps {
  user: AuthUser;
}

export default function ExpensesView({ user }: ExpensesViewProps) {
  const isAdmin = user.role === "Admin";
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Create Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Rent/Facilities");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [receiptImage, setReceiptImage] = useState("");

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<Expense[]>("/expenses");
      setExpenses(data);
    } catch {
      setError("Failed to fetch studio expenses list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const openSubmitModal = () => {
    setTitle("");
    setCategory("Rent/Facilities");
    setAmount("");
    setDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setReceiptImage("");
    setIsModalOpen(true);
  };

  const handleApprove = async (id: string) => {
    try {
      await apiFetch(`/expenses/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: "Approved" })
      });
      await fetchExpenses();
    } catch (err: any) {
      alert("Status change failed.");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await apiFetch(`/expenses/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: "Rejected" })
      });
      await fetchExpenses();
    } catch (err: any) {
      alert("Status change failed.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense request?")) return;
    try {
      await apiFetch(`/expenses/${id}`, { method: "DELETE" });
      await fetchExpenses();
    } catch (err: any) {
      alert(err.message || "Failed to delete");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount) {
      alert("Please fill in Title and Amount fields");
      return;
    }

    const payload = {
      title,
      category,
      amount: Number(amount),
      date,
      notes,
      receiptImage: receiptImage || "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=300"
    };

    try {
      await apiFetch("/expenses", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      setIsModalOpen(false);
      await fetchExpenses();
    } catch (err: any) {
      alert(err.message || "Request failed");
    }
  };

  // Filter listings
  const filteredExpenses = expenses.filter(exp => {
    const matchesCategory = categoryFilter === "All" || exp.category === categoryFilter;
    const matchesStatus = statusFilter === "All" || exp.status === statusFilter;
    return matchesCategory && matchesStatus;
  });

  const RentCategory = "Rent/Facilities";
  const uniqueCategories = ["All", RentCategory, "Sanitation", "Aftercare Promo", "Design Equipment", "Studio Upkeep", "General Supplies"];

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Studio Business Expenses</h2>
          <p className="text-xs text-slate-400">
            {isAdmin 
              ? "Oversee operating invoices, material expenses, rent and bills approvals requested by studio staff." 
              : "Review your submitted expense history and register new billing statements."}
          </p>
        </div>

        <button
          onClick={openSubmitModal}
          className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-transform duration-100 active:scale-95 shadow-lg shadow-amber-500/10"
        >
          <Plus className="w-4 h-4" />
          Log Statement
        </button>
      </div>

      {/* Inputs Filter Row */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1.5">Category Filter</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-705 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
          >
            <option value="All">All Categories</option>
            <option value="Rent/Facilities">Rent & Facilities</option>
            <option value="Sanitation">Sanitation Materials</option>
            <option value="Aftercare Promo">Aftercare Promo/Trading Goods</option>
            <option value="Design Equipment">Design Equipment & Needle Cartridge</option>
            <option value="Studio Upkeep">Studio Upkeep & Refreshments</option>
            <option value="General Supplies">General Supplies</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1.5">Approval Status Filter</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-705 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
          >
            <option value="All">All Statuses</option>
            <option value="Approved">Approved</option>
            <option value="Pending">Pending Approval</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Table Section */}
      {loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 animate-pulse text-center text-xs text-slate-500">
          Syncing expense sheets...
        </div>
      ) : filteredExpenses.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl py-12 text-center select-none">
          <Coins className="w-12 h-12 text-slate-600 mx-auto mb-2" />
          <h3 className="text-white text-sm font-bold">No Expense Records</h3>
          <p className="text-slate-500 text-xs mt-1">Submit records or select a different filter query.</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950 text-slate-450 uppercase font-bold tracking-wider">
                  <th className="p-4">Invoice / Description</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Billing Date</th>
                  <th className="p-4">Approval Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/65">
                {filteredExpenses.map((exp) => {
                  const isApp = exp.status === "Approved";
                  const isPen = exp.status === "Pending";
                  const isRej = exp.status === "Rejected";

                  return (
                    <tr key={exp._id} className="hover:bg-slate-900/60 transition-colors">
                      <td className="p-4">
                        <span className="font-bold text-white block leading-tight">{exp.title}</span>
                        {exp.notes && (
                          <span className="text-slate-400 font-sans text-[11px] block mt-0.5 max-w-xs truncate">{exp.notes}</span>
                        )}
                        <span className="text-[10px] text-slate-500 font-mono block mt-1">SubmitBy ID: {exp.employeeId}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-slate-300 font-medium">{exp.category}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm font-bold text-white block">${exp.amount.toFixed(2)}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-slate-400">{exp.date}</span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isApp ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                          isPen ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                          "bg-red-500/10 text-red-00 border border-red-500/20"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isApp ? "bg-emerald-400" : isPen ? "bg-amber-500" : "bg-red-400"}`} />
                          {exp.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {isAdmin && isPen ? (
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleApprove(exp._id)}
                              className="p-1 px-2 bg-emerald-500 text-slate-950 hover:bg-emerald-600 font-bold text-[10px] rounded flex items-center gap-1.5 cursor-pointer"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(exp._id)}
                              className="p-1 px-2 bg-red-600 text-white hover:bg-red-700 font-bold text-[10px] rounded flex items-center gap-1.5 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end">
                            {(!isApp || isAdmin) && (
                              <button
                                onClick={() => handleDelete(exp._id)}
                                className="p-1.5 text-slate-500 hover:text-red-400 bg-slate-950 border border-slate-800 rounded cursor-pointer"
                                title="Delete Statement"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBMIT RECORD MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 z-40">
          <div className="bg-slate-900 border border-amber-500/15 rounded-xl w-full max-w-md overflow-hidden shadow-2xl select-none">
            <div className="p-4 border-b border-slate-800 bg-slate-900 flex justify-between items-center">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider">Log Billing / Studio Expense</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wide font-bold mb-1.5">Invoice Title / Description</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 5 boxes disposables latex gloves purchase"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wide font-bold mb-1.5">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-2 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                  >
                    <option value="Rent/Facilities">Rent & Facilities</option>
                    <option value="Sanitation">Sanitation Materials</option>
                    <option value="Aftercare Promo">Aftercare Trading</option>
                    <option value="Design Equipment">Design Equipment</option>
                    <option value="Studio Upkeep">Studio Upkeep</option>
                    <option value="General Supplies">General Supplies</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wide font-bold mb-1.5">Billing Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 85.50"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wide font-bold mb-1.5">Date Paid</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wide font-bold mb-1.5 font-sans">Receipt URL mock</label>
                  <input
                    type="text"
                    value={receiptImage}
                    onChange={(e) => setReceiptImage(e.target.value)}
                    placeholder="Optional receipt path"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wide font-bold mb-1.5">Additional Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Bought via cash, recipient details..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold px-4 py-2 rounded-lg text-xs cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs cursor-pointer shadow-md shadow-amber-500/10"
                >
                  Submit Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
