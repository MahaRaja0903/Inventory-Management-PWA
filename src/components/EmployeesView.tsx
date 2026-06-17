import { useState, useEffect } from "react";
import { AuthUser, User } from "../types";
import { apiFetch } from "../lib/api";
import { UserRoundCog, Search, Plus, Edit2, Trash2, X, Save, Shield, CheckCircle2, XCircle } from "lucide-react";

interface EmployeesViewProps {
  user: AuthUser;
}

export default function EmployeesView({ user }: EmployeesViewProps) {
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<User | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"Admin" | "Employee">("Employee");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"Active" | "Inactive">("Active");
  const [profileImage, setProfileImage] = useState("");

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<User[]>("/employees");
      setEmployees(data);
    } catch {
      setError("Failed to download active staff listings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const openAddModal = () => {
    setEditingEmployee(null);
    setName("");
    setEmail("");
    setPassword("");
    setRole("Employee");
    setPhone("");
    setStatus("Active");
    setProfileImage("");
    setIsModalOpen(true);
  };

  const openEditModal = (emp: User) => {
    setEditingEmployee(emp);
    setName(emp.name);
    setEmail(emp.email);
    setPassword(""); // Keep blank to not modify
    setRole(emp.role);
    setPhone(emp.phone);
    setStatus(emp.status);
    setProfileImage(emp.profileImage || "");
    setIsModalOpen(true);
  };

  const handleDelete = async (empId: string) => {
    if (empId === user.id) {
      alert("You are not allowed to delete your own logged-in admin account!");
      return;
    }
    if (!confirm("Are you sure you want to delete this staff member? This will clear all their linked record accounts.")) {
      return;
    }
    try {
      await apiFetch(`/employees/${empId}`, { method: "DELETE" });
      await fetchEmployees();
    } catch (err: any) {
      alert(err.message || "Failed to delete staff member.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      alert("Name and Email are required fields.");
      return;
    }

    const payload: any = {
      name,
      email,
      role,
      phone,
      status,
      profileImage: profileImage || `https://api.dicebear.com/7.x/adventurer/svg?seed=${name}`
    };

    if (password) {
      payload.password = password;
    }

    try {
      if (editingEmployee) {
        await apiFetch(`/employees/${editingEmployee._id}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
      } else {
        await apiFetch("/employees", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }
      setIsModalOpen(false);
      await fetchEmployees();
    } catch (err: any) {
      alert(err.message || "Operation failed.");
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.phone.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Staff Artist Management</h2>
          <p className="text-xs text-slate-400">Registers, edit, suspend or manage active accounts, contact profiles, and permission levels.</p>
        </div>

        <button
          onClick={openAddModal}
          className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-transform duration-105 active:scale-95 shadow-lg shadow-amber-500/10"
        >
          <Plus className="w-4 h-4 text-slate-950" />
          Add Studio Member
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex">
        <div className="relative w-full">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search team by name, email, phone coordinates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-705 rounded-lg text-xs text-white uppercase-wider placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Grid listing */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse text-xs text-slate-550 p-8 text-center bg-slate-905">
          Retrieving team rosters...
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl py-12 text-center">
          <UserRoundCog className="w-12 h-12 text-slate-700 mx-auto mb-2" />
          <h3 className="text-white text-sm font-bold">No Staff Members Registered</h3>
          <p className="text-slate-500 text-xs mt-1">Adjust search parameters or registers new staff sheets.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEmployees.map((emp) => {
            const isSelf = emp._id === user.id;
            const iaSec = emp.status === "Active";
            return (
              <div key={emp._id} className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition-colors">
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <img
                      src={emp.profileImage || `https://api.dicebear.com/7.x/adventurer/svg?seed=${emp.name}`}
                      alt={emp.name}
                      className="w-12 h-12 rounded-lg bg-slate-950 object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="overflow-hidden">
                      <h3 className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                        {emp.name}
                        {isSelf && <span className="text-[9px] bg-slate-800 text-amber-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Me</span>}
                      </h3>
                      <span className="text-[10px] text-slate-400 block truncate">{emp.email}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] py-2.5 px-3 bg-slate-950/50 rounded-lg border border-slate-950 border-dashed mb-4">
                    <div>
                      <span className="text-slate-500 block uppercase tracking-wide text-[9px] font-semibold">User Role</span>
                      <span className={`font-bold uppercase tracking-wider flex items-center gap-1 ${emp.role === "Admin" ? "text-amber-500" : "text-slate-300"}`}>
                        <Shield className="w-3 h-3" />
                        {emp.role}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block uppercase tracking-wide text-[9px] font-semibold">Status Badge</span>
                      <span className={`font-bold flex items-center gap-1.5 ${iaSec ? "text-emerald-400" : "text-red-400"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${iaSec ? "bg-emerald-400 animate-ping" : "bg-red-400"}`} />
                        {emp.status}
                      </span>
                    </div>
                  </div>

                  {emp.phone && (
                    <div className="text-xs text-slate-400 px-1 mb-2">
                       <span className="text-slate-500 text-[10px] font-semibold block">Contact Line:</span>
                       <span>{emp.phone}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-950 pt-4 mt-2">
                  <button
                    onClick={() => openEditModal(emp)}
                    className="p-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded text-xs px-3"
                  >
                    Edit File
                  </button>
                  <button
                    onClick={() => handleDelete(emp._id)}
                    disabled={isSelf}
                    className="p-1.5 bg-slate-950 border border-red-500/10 text-slate-450 hover:text-red-400 hover:border-red-500/20 rounded disabled:opacity-20 cursor-pointer text-xs"
                  >
                    Suspend / Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / AMEND STAFF DIALOG */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 z-40">
          <div className="bg-slate-900 border border-amber-500/15 rounded-xl w-full max-w-md overflow-hidden shadow-2xl relative select-none animate-fadeIn">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider">
                {editingEmployee ? `Amend profile of ${editingEmployee.name}` : "Registers New Studio Artist"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] text-slate-405 uppercase tracking-wide font-bold mb-1">Full Artist Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Damien Steel"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-405 uppercase tracking-wide font-bold mb-1">Email Coordinates</label>
                <input
                  type="email"
                  required
                  value={email}
                  disabled={!!editingEmployee}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. damien@aquariustattoo.com"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-450 uppercase tracking-wide font-bold mb-1">
                  {editingEmployee ? "Reset password (leave empty to skip)" : "Password Key"}
                </label>
                <input
                  type="password"
                  required={!editingEmployee}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editingEmployee ? "Unchanged" : "Test@123"}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-707 rounded-lg text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-450 uppercase tracking-wide font-bold mb-1">Studio Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-2 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                  >
                    <option value="Employee">Employee Artist</option>
                    <option value="Admin">Admin Workspace Manager</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-450 uppercase tracking-wide font-bold mb-1">Account Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-2 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                  >
                    <option value="Active">Active / Onboarded</option>
                    <option value="Inactive">Deactivated / Suspended</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-455 uppercase tracking-wide font-bold mb-1">Mobile Line</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 0199"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-455 uppercase tracking-wide font-bold mb-1">Avatar Image Path</label>
                  <input
                    type="text"
                    value={profileImage}
                    onChange={(e) => setProfileImage(e.target.value)}
                    placeholder="Auto-generated if empty"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end gap-2.5 bg-slate-900	">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-slate-905 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold px-4 py-2 rounded-lg text-xs cursor-pointer"
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
