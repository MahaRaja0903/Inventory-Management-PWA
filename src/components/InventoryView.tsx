import React, { useState, useEffect } from "react";
import { AuthUser, InventoryItem } from "../types";
import { apiFetch } from "../lib/api";
import { PackageOpen, Search, Filter, Plus, Edit2, Trash2, X, AlertCircle, Save } from "lucide-react";

interface InventoryViewProps {
  user: AuthUser;
}

export default function InventoryView({ user }: InventoryViewProps) {
  const isAdmin = user.role === "Admin";
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter params
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Modal controls
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Form Fields
  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState("Inks");
  const [quantity, setQuantity] = useState("10");
  const [purchasePrice, setPurchasePrice] = useState("0");
  const [sellingPrice, setSellingPrice] = useState("0");
  const [supplier, setSupplier] = useState("");
  const [notes, setNotes] = useState("");

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<InventoryItem[]>("/inventory");
      setItems(data);
    } catch (err: any) {
      setError("Unable to retrieve stock catalog.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const openAddModal = () => {
    setEditingItem(null);
    setItemName("");
    setCategory("Inks");
    setQuantity("10");
    setPurchasePrice("0");
    setSellingPrice("0");
    setSupplier("");
    setNotes("");
    setIsModalOpen(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setItemName(item.itemName);
    setCategory(item.category);
    setQuantity(String(item.quantity));
    setPurchasePrice(String(item.purchasePrice));
    setSellingPrice(String(item.sellingPrice));
    setSupplier(item.supplier);
    setNotes(item.notes || "");
    setIsModalOpen(true);
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this inventory item? This action is irreversible.")) {
      return;
    }

    try {
      await apiFetch(`/inventory/${itemId}`, { method: "DELETE" });
      await fetchInventory();
    } catch (err: any) {
      alert(err.message || "Failed to delete item");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!itemName || !category) {
      alert("Please provide the Item Name and its category");
      return;
    }

    const payload = {
      itemName,
      category,
      quantity: Number(quantity),
      purchasePrice: Number(purchasePrice),
      sellingPrice: Number(sellingPrice),
      supplier: supplier || "Direct supplies",
      notes
    };

    try {
      if (editingItem) {
        // PUT
        await apiFetch(`/inventory/${editingItem._id}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
      } else {
        // POST
        await apiFetch("/inventory", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }
      setIsModalOpen(false);
      await fetchInventory();
    } catch (err: any) {
      alert(err.message || "Operation failed");
    }
  };

  // Compute filtering lists
  const filteredItems = items.filter(item => {
    const matchesSearch = item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          item.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Extract unique categories for filter dropdown
  const uniqueCategories = ["All", ...Array.from(new Set(items.map(i => i.category)))];

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Supplies Stock Catalog</h2>
          <p className="text-xs text-slate-400">Monitor consumables, needles, colors, sanitation gear and piercing stock levels.</p>
        </div>

        {isAdmin && (
          <button
            onClick={openAddModal}
            className="self-start sm:self-center bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-transform duration-100 active:scale-95 shadow-lg shadow-amber-500/10"
          >
            <Plus className="w-4 h-4 text-slate-950" />
            Add New Item
          </button>
        )}
      </div>

      {/* Inputs Filter Row */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center gap-4">
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search catalog by name, notes or supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full md:w-48 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
          >
            {uniqueCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid listing */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1,2,3].map(n => (
            <div key={n} className="bg-slate-900 border border-slate-800 h-36 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl py-12 px-4 text-center">
          <PackageOpen className="w-12 h-12 text-slate-600 mx-auto mb-2" />
          <h3 className="text-white text-sm font-bold">No supplies match</h3>
          <p className="text-slate-500 text-xs mt-1">Adjust search parameters or registers new stock quantities.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map(item => {
            const isLow = item.stockStatus === "Low Stock";
            const isOut = item.stockStatus === "Out of Stock";
            return (
              <div 
                key={item._id} 
                className={`bg-slate-900 border ${
                  isOut ? "border-red-500/20 shadow-red-500/2" : isLow ? "border-amber-500/20 shadow-amber-500/2" : "border-slate-800/80"
                } rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors relative`}
              >
                <div>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className="text-[10px] bg-slate-950 border border-slate-800 text-slate-300 font-bold px-2 py-0.5 rounded-full">
                      {item.category}
                    </span>

                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      isOut ? "bg-red-500/10 text-red-400 border border-red-500/10" :
                      isLow ? "bg-amber-500/10 text-amber-500 border border-amber-500/10" :
                      "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10"
                    }`}>
                      {item.stockStatus}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white mb-1 group-hover:text-amber-500">{item.itemName}</h3>
                  
                  {item.notes && (
                    <p className="text-slate-400 text-xs line-clamp-2 mb-3 font-sans leading-relaxed">{item.notes}</p>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs py-2 bg-slate-950/40 rounded-lg px-2 border border-slate-950 mb-3">
                    <div>
                      <span className="text-slate-500 text-[10px] block">Stock Qty</span>
                      <span className="font-bold text-white">{item.quantity} units</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block font-sans">Supplier</span>
                      <span className="font-semibold text-slate-300 truncate block">{item.supplier}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-950 pt-3 mt-1">
                  <div className="text-[11px]">
                    <span className="text-slate-500 font-sans block text-[9px] uppercase tracking-wide">Purchase Price</span>
                    <span className="text-slate-300 font-bold">${item.purchasePrice.toFixed(2)}</span>
                  </div>
                  
                  {item.sellingPrice > 0 && (
                    <div className="text-[11px] text-right">
                      <span className="text-slate-500 font-sans block text-[9px] uppercase tracking-wide">Retail Price</span>
                      <span className="text-amber-500 font-extrabold">${item.sellingPrice.toFixed(2)}</span>
                    </div>
                  )}

                  {isAdmin && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => openEditModal(item)}
                        className="p-1 px-1.5 bg-slate-950 border border-slate-800 text-slate-400 hover:text-white rounded cursor-pointer"
                        title="Edit Item"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(item._id)}
                        className="p-1 px-1.5 bg-slate-950 border border-red-500/10 text-slate-400 hover:text-red-400 rounded cursor-pointer"
                        title="Delete Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD / EDIT CONTROLS MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 z-40">
          <div className="bg-slate-900 border border-amber-500/10 rounded-xl w-full max-w-md overflow-hidden shadow-2xl relative select-none">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider">
                {editingItem ? "Amend Stock File" : "Catalog New Supply"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wide font-bold mb-1.5">Item Name</label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. Dynamic Color Co. Triple Black 240ml"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
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
                    <option value="Inks">Inks</option>
                    <option value="Needles">Needles</option>
                    <option value="Sanitation">Sanitation</option>
                    <option value="Piercing Supplies">Piercing Supplies</option>
                    <option value="Aftercare Products">Aftercare Products</option>
                    <option value="Anesthetics">Anesthetics</option>
                    <option value="Apparel & Merch">Apparel & Merch</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wide font-bold mb-1.5">Initial Qty</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wide font-bold mb-1.5">Cost Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wide font-bold mb-1.5">Retail Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    placeholder="0 if not for retail sell"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wide font-bold mb-1.5">Supplier Vendor</label>
                <input
                  type="text"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="Inkwell Distributors or direct brand"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wide font-bold mb-1.5 font-sans">Notes / Instructions</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Needle gauge size details, shelf warning labels..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold px-4 py-2 rounded-lg text-xs cursor-pointer"
                >
                  Discard Changes
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/5 cursor-pointer"
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
