import React, { useState, useEffect } from "react";
import { AuthUser, Customer } from "../types";
import { apiFetch } from "../lib/api";
import { Users, Search, Plus, Edit2, Trash2, X, Save, Calendar, Sparkles, FolderOpen, Tag, Phone } from "lucide-react";

interface CustomersViewProps {
  user: AuthUser;
}

export default function CustomersView({ user }: CustomersViewProps) {
  const isAdmin = user.role === "Admin";
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Details panel
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");

  // Add / Edit Modal Controls
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<Customer[]>("/customers");
      setCustomers(data);
    } catch {
      setError("Failed to coordinate customer sheets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const selectCustomer = async (cust: Customer) => {
    setLoadingDetails(true);
    setSelectedCustomer(null);
    try {
      const data = await apiFetch(`/customers/${cust._id}`);
      setSelectedCustomer(data);
    } catch (err: any) {
      alert("Failed to load layout portfolio for this customer.");
    } finally {
      setLoadingDetails(false);
    }
  };

  const openAddModal = () => {
    setEditingCustomer(null);
    setName("");
    setMobile("");
    setEmail("");
    setAddress("");
    setIsModalOpen(true);
  };

  const openEditModal = (cust: Customer, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering details panel click
    setEditingCustomer(cust);
    setName(cust.name);
    setMobile(cust.mobile);
    setEmail(cust.email);
    setAddress(cust.address || "");
    setIsModalOpen(true);
  };

  const handleDelete = async (custId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this customer profile? This will clear all their registered design histories as well.")) {
      return;
    }
    try {
      await apiFetch(`/customers/${custId}`, { method: "DELETE" });
      if (selectedCustomer && selectedCustomer._id === custId) {
        setSelectedCustomer(null);
      }
      await fetchCustomers();
    } catch (err: any) {
      alert(err.message || "Failed to delete customer");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !mobile) {
      alert("Name and Mobile are required fields");
      return;
    }

    const payload = { name, mobile, email, address };

    try {
      if (editingCustomer) {
        await apiFetch(`/customers/${editingCustomer._id}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
      } else {
        await apiFetch("/customers", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }
      setIsModalOpen(false);
      await fetchCustomers();
    } catch (err: any) {
      alert(err.message || "Operation failed.");
    }
  };

  const filteredCustomers = customers.filter(cust => 
    cust.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cust.mobile.includes(searchTerm) ||
    cust.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans select-none">
      {/* LEFT SECTION: LIST OF CUSTOMERS */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Client Portfolio Registry</h2>
            <p className="text-xs text-slate-400">Track client files, total spend mappings, visits cycles, and historical design portfolios.</p>
          </div>

          <button
            onClick={openAddModal}
            className="self-start sm:self-center bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-transform duration-100 active:scale-95 shadow-lg shadow-amber-500/10"
          >
            <Plus className="w-4 h-4 text-slate-950" />
            New Client File
          </button>
        </div>

        {/* Search */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-450" />
            <input
              type="text"
              placeholder="Search customers by name, phone dial or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-705 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-[#f59e0b]	"
            />
          </div>
        </div>

        {/* Customer Cards Stack */}
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-slate-900 border border-slate-800 rounded-xl animate-pulse">
            Coordinating subscriber records...
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl py-12 text-center select-none">
            <Users className="w-12 h-12 text-slate-705 mx-auto mb-2" />
            <p className="text-white text-sm font-bold">No Client Profiles Found</p>
            <p className="text-slate-500 text-xs mt-1">Create client files to attach design notes and sales invoices.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredCustomers.map(cust => {
              const isActive = selectedCustomer && selectedCustomer._id === cust._id;
              return (
                <div
                  key={cust._id}
                  onClick={() => selectCustomer(cust)}
                  className={`p-4 rounded-xl border border-slate-800 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
                    isActive 
                      ? "bg-amber-500/5 border-amber-500/35 shadow-[0_0_15px_rgba(245,158,11,0.03)]" 
                      : "bg-slate-900 hover:border-slate-750"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-950 flex items-center justify-center font-bold text-slate-400 text-sm border border-slate-800">
                      {cust.name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white tracking-snug leading-tight">{cust.name}</h4>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-550" /> {cust.mobile}</span>
                        {cust.email && <span className="text-slate-400 font-sans truncate max-w-[150px]">{cust.email}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 justify-between sm:justify-end border-t border-slate-950 sm:border-0 pt-3 sm:pt-0">
                    <div className="flex items-center gap-4 text-xs font-sans">
                      <div>
                        <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-bold leading-none mb-0.5">Visits Count</span>
                        <span className="text-white font-bold leading-none block">{cust.totalVisits || 0} times</span>
                      </div>
                      <div className="h-4 w-px bg-slate-850" />
                      <div>
                        <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-bold leading-none mb-0.5">Total Spendings</span>
                        <span className="text-amber-500 font-extrabold leading-none block">${(cust.totalSpending || 0).toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex gap-2.5">
                      <button
                        onClick={(e) => openEditModal(cust, e)}
                        className="p-1.5 bg-slate-905 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
                        title="Edit Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={(e) => handleDelete(cust._id, e)}
                          className="p-1.5 bg-slate-950 border border-red-500/10 text-slate-500 hover:text-red-400 hover:border-red-500/20 rounded transition-colors cursor-pointer"
                          title="Delete File"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RIGHT SECTION: ACTIVE CUSTOMER PORTFOLIO DETAILS */}
      <div className="space-y-4">
        {loadingDetails ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-xs animate-pulse text-slate-500">
            Rendering design histories...
          </div>
        ) : !selectedCustomer ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 py-12 text-center border-dashed border-slate-700/60 select-none">
            <FolderOpen className="w-12 h-12 text-slate-700 mx-auto mb-2" />
            <h4 className="text-slate-350 text-xs font-bold uppercase tracking-wider">No customer selected</h4>
            <p className="text-slate-500 text-[11px] mt-1 max-w-[200px] mx-auto">Select a client profile card to view historical portfolios and tattoo service drawings logs.</p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5 animate-fadeIn">
            {/* Header info */}
            <div className="pb-4 border-b border-slate-800 flex justify-between items-start">
              <div>
                <span className="text-[9px] bg-slate-950 border border-slate-800 text-amber-500 font-extrabold px-2 py-0.5 rounded uppercase tracking-wider block mb-1.5 self-start">
                  Selected File
                </span>
                <h3 className="text-base font-extrabold text-white tracking-snug">{selectedCustomer.name}</h3>
                <p className="text-[11px] text-slate-400 mt-1 font-sans">{selectedCustomer.address || "No address details on file"}</p>
              </div>
              <button 
                onClick={() => setSelectedCustomer(null)}
                className="text-slate-500 hover:text-white p-1 hover:bg-slate-800 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Design Portfolio / Customer History List */}
            <div>
              <div className="flex items-center gap-1.5 mb-3.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Historical Designs Catalog</h4>
              </div>

              {selectedCustomer.history.length === 0 ? (
                <div className="p-5 border border-dashed border-slate-800 rounded-xl text-center text-[11px] text-slate-500">
                  No sessions on record. Log a service sale under this customer name to populate portfolio directories.
                </div>
              ) : (
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {selectedCustomer.history.map((hist: any) => (
                    <div key={hist._id} className="p-3 bg-slate-950 border border-slate-850 rounded-xl space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] bg-slate-900 border border-slate-800 font-bold px-2 py-0.5 rounded text-amber-450 uppercase flex items-center gap-1">
                          <Tag className="w-3 h-3 text-amber-500" />
                          {hist.serviceType}
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 font-sans">
                          <Calendar className="w-3 h-3" />
                          {new Date(hist.serviceDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}
                        </span>
                      </div>

                      {hist.serviceType === "Tattoo" && hist.tattooDetails && (
                        <p className="text-slate-300 text-xs font-sans leading-relaxed pt-1 select-text">{hist.tattooDetails}</p>
                      )}

                      {hist.serviceType === "Piercing" && hist.piercingDetails && (
                        <p className="text-slate-305 text-xs font-sans leading-relaxed pt-1 select-text">{hist.piercingDetails}</p>
                      )}

                      <div className="border-t border-slate-900 pt-2 flex justify-between items-center text-[10px] text-slate-500">
                        <span>Artist: <strong className="text-slate-400">{hist.employeeName}</strong></span>
                        <span className="font-extrabold text-amber-500 text-xs">${hist.amount.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CREATE / AMEND CLIENT DIALOG */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 z-40">
          <div className="bg-slate-900 border border-amber-500/15 rounded-xl w-full max-w-md overflow-hidden shadow-2xl relative select-none animate-fadeIn">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider">
                {editingCustomer ? `Amend Profile of ${editingCustomer.name}` : "Create New Client File"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wide font-bold mb-1.5">Client Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Marianne Vance"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white uppercase-wider placeholder-slate-600 focus:outline-[#f59e0b]	"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-405 uppercase tracking-wide font-bold mb-1.5">Mobile Number</label>
                <input
                  type="text"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="e.g. 555-0155"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-[#f59e0b]	"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-405 uppercase tracking-wide font-bold mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. marianne@vance.com"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-[#f59e0b]	"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-405 uppercase tracking-wide font-bold mb-1.5">Postal Address</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  placeholder="e.g. 42 Ocean Drive, Ink City"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-slate-950 hover:bg-slate-850 border border-slate-700 text-slate-300 font-bold px-4 py-2 rounded-lg text-xs cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
