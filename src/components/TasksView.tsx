import React, { useState, useEffect } from "react";
import { AuthUser, Task, User } from "../types";
import { apiFetch } from "../lib/api";
import { ClipboardList, Plus, Trash2, Edit3, X, Save, AlertTriangle, CheckCircle, Info, Calendar, User as UserIcon, Filter, RefreshCw, CheckCircle2 } from "lucide-react";

interface TasksViewProps {
  user: AuthUser;
  showToast: (message: string, type?: "success" | "error" | "info" | "warning") => void;
}

export default function TasksView({ user, showToast }: TasksViewProps) {
  const isAdmin = user.role === "Admin";
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [employeeFilter, setEmployeeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");

  // Create/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Form Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] = useState<"Low" | "Medium" | "High">("Medium");
  const [taskType, setTaskType] = useState<"Daily Task" | "One Time Task">("One Time Task");
  const [dueDate, setDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"Pending" | "In Progress" | "Completed">("Pending");

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError("");
      const endpoint = isAdmin ? "/tasks" : "/tasks/my";
      
      // Build query string for admin filters
      let queryParams = [];
      if (isAdmin) {
        if (employeeFilter !== "All") queryParams.push(`employee=${employeeFilter}`);
        if (statusFilter !== "All") queryParams.push(`status=${statusFilter}`);
        if (priorityFilter !== "All") queryParams.push(`priority=${priorityFilter}`);
        if (dateFilter) queryParams.push(`date=${dateFilter}`);
      }
      
      const queryString = queryParams.length > 0 ? `?${queryParams.join("&")}` : "";
      const data = await apiFetch<Task[]>(`${endpoint}${queryString}`);
      setTasks(data);
    } catch (err: any) {
      setError("Failed to fetch studio tasks.");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    if (!isAdmin) return;
    try {
      const data = await apiFetch<User[]>("/employees");
      setEmployees(data.filter(emp => emp.status === "Active"));
    } catch (err) {
      console.warn("Failed to load staff roster.");
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchEmployees();
  }, [employeeFilter, statusFilter, priorityFilter, dateFilter]);

  const handleOpenCreateModal = () => {
    setEditingTask(null);
    setTitle("");
    setDescription("");
    setAssignedTo(employees[0]?._id || "");
    setPriority("Medium");
    setTaskType("One Time Task");
    setDueDate(new Date().toISOString().split("T")[0]);
    setStatus("Pending");
    setNotes("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description);
    setAssignedTo(task.assignedTo);
    setPriority(task.priority);
    setTaskType(task.taskType);
    setDueDate(task.dueDate);
    setStatus(task.status);
    setNotes(task.notes || "");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    const payload = {
      title,
      description,
      assignedTo,
      priority,
      taskType,
      dueDate,
      status,
      notes
    };

    try {
      if (editingTask) {
        await apiFetch(`/tasks/${editingTask._id}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        showToast("Task updated successfully", "success");
      } else {
        await apiFetch("/tasks", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        showToast("Task created and assigned", "success");
      }
      setIsModalOpen(false);
      fetchTasks();
    } catch (err: any) {
      showToast(err.message || "Failed to save task details", "error");
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await apiFetch(`/tasks/${id}`, { method: "DELETE" });
      showToast("Task deleted successfully", "success");
      fetchTasks();
    } catch (err: any) {
      showToast("Failed to delete task", "error");
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: "Pending" | "In Progress" | "Completed") => {
    try {
      await apiFetch(`/tasks/${taskId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus })
      });
      showToast(`Task status updated to ${newStatus}`, "success");
      fetchTasks();
    } catch (err: any) {
      showToast(err.message || "Failed to update task status", "error");
    }
  };

  // --- STATS COMPUTATIONS ---
  const todayStr = new Date().toISOString().split("T")[0];
  const totalCount = tasks.length;
  const pendingCount = tasks.filter(t => t.status === "Pending").length;
  const inProgressCount = tasks.filter(t => t.status === "In Progress").length;
  const completedCount = tasks.filter(t => t.status === "Completed").length;
  const overdueCount = tasks.filter(t => t.status !== "Completed" && t.dueDate < todayStr).length;

  return (
    <div id="tasks-view" className="space-y-6 font-sans select-none">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            {isAdmin ? "Studio Task Workspace" : "My Assigned Tasks"}
          </h2>
          <p className="text-xs text-slate-400">
            {isAdmin 
              ? "Create, delegate, and audit operational tasks and workflows across artists." 
              : "Review your duties, log task progress, and review checklists for today."}
          </p>
        </div>
        
        {isAdmin && (
          <button
            onClick={handleOpenCreateModal}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-transform active:scale-95 shadow-md shadow-amber-500/10 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Assign New Task
          </button>
        )}
      </div>

      {/* Admin Task Dashboard Widgets */}
      {isAdmin && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Total Tasks</span>
            <p className="text-xl sm:text-2xl font-extrabold text-white">{totalCount}</p>
          </div>
          
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Pending</span>
            <p className="text-xl sm:text-2xl font-extrabold text-amber-500">{pendingCount}</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">In Progress</span>
            <p className="text-xl sm:text-2xl font-extrabold text-sky-400">{inProgressCount}</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Completed</span>
            <p className="text-xl sm:text-2xl font-extrabold text-emerald-400">{completedCount}</p>
          </div>

          <div className={`border rounded-xl p-4 transition-colors ${overdueCount > 0 ? "bg-red-500/5 border-red-500/20 text-red-300" : "bg-slate-900 border-slate-800"}`}>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Overdue</span>
            <p className={`text-xl sm:text-2xl font-extrabold ${overdueCount > 0 ? "text-red-400" : "text-slate-500"}`}>{overdueCount}</p>
          </div>
        </div>
      )}

      {/* Admin Task Filters */}
      {isAdmin && (
        <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl space-y-3.5">
          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
            <Filter className="w-4 h-4 text-amber-500" />
            <span>Workspace Filters</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] text-slate-500 uppercase tracking-wide font-bold mb-1.5">Assignee</label>
              <select
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none"
              >
                <option value="All">All Staff</option>
                {employees.map(emp => (
                  <option key={emp._id} value={emp._id}>{emp.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 uppercase tracking-wide font-bold mb-1.5">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 uppercase tracking-wide font-bold mb-1.5">Priority</label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none"
              >
                <option value="All">All Priorities</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 uppercase tracking-wide font-bold mb-1.5">Due Date</label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none text-left"
              />
            </div>
          </div>
        </div>
      )}

      {/* Task List Grid */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
          <span>Synchronizing tasks stack...</span>
        </div>
      ) : error ? (
        <div className="bg-red-950/20 border border-red-500/10 text-red-400 p-4 rounded-xl text-center text-xs">
          {error}
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 p-12 text-center text-xs text-slate-500 rounded-xl border-dashed">
          No tasks logged or matching search parameters on this workspace.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tasks.map((task) => {
            const isOverdue = task.status !== "Completed" && task.dueDate < todayStr;
            return (
              <div 
                key={task._id} 
                className={`bg-slate-900 border rounded-xl p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors relative ${
                  task.status === "Completed" ? "border-emerald-500/20 opacity-80" : isOverdue ? "border-red-500/20" : "border-slate-800"
                }`}
              >
                <div>
                  {/* Card Header Row */}
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      task.priority === "High" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                      task.priority === "Medium" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                      "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    }`}>
                      {task.priority} Priority
                    </span>

                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider bg-slate-950 px-2 py-0.5 border border-slate-800 rounded">
                      {task.taskType}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className={`text-sm font-extrabold tracking-tight ${task.status === "Completed" ? "text-slate-400 line-through" : "text-white"}`}>
                    {task.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-sans min-h-[40px]">
                    {task.description || "No description provided."}
                  </p>

                  {/* Date details */}
                  <div className="mt-4 flex items-center gap-1.5 text-[10px] text-slate-500">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Due: </span>
                    <strong className={isOverdue ? "text-red-400" : "text-slate-300"}>
                      {task.dueDate} {isOverdue && "(Overdue)"}
                    </strong>
                  </div>

                  {/* Assigner & Assignee Details */}
                  <div className="mt-2.5 pt-2.5 border-t border-slate-850 flex flex-col gap-1.5 text-[10px]">
                    {isAdmin && (
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                        <span>Assignee: <strong>{task.assignedToName || "Unassigned"}</strong></span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-slate-500 font-sans">
                      <span>Owner: <strong>{task.assignedByName || "System"}</strong></span>
                    </div>
                  </div>

                  {/* Admin notes display */}
                  {task.notes && (
                    <div className="mt-3 bg-slate-950 p-2.5 rounded-lg border border-slate-850 text-[10px] text-slate-400 leading-normal">
                      <span className="font-semibold block text-slate-500 uppercase tracking-wider text-[8px] mb-1 font-sans">Notes:</span>
                      {task.notes}
                    </div>
                  )}
                </div>

                {/* Status Selector & Admin Actions footer */}
                <div className="pt-3 border-t border-slate-850 flex justify-between items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-[8px] text-slate-500 font-bold uppercase tracking-wider mb-1 font-sans">Update Status</label>
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(task._id, e.target.value as any)}
                      className={`w-full px-2 py-1.5 rounded-lg bg-slate-950 border text-[11px] font-semibold focus:outline-none ${
                        task.status === "Completed" ? "border-emerald-500/20 text-emerald-400" :
                        task.status === "In Progress" ? "border-sky-500/20 text-sky-400" :
                        "border-slate-800 text-slate-300"
                      }`}
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1.5 self-end py-1">
                      <button
                        onClick={() => handleOpenEditModal(task)}
                        className="p-2 bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/35 text-slate-400 hover:text-amber-500 rounded-lg cursor-pointer transition-colors"
                        title="Edit Task"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task._id)}
                        className="p-2 bg-slate-950 hover:bg-red-950/20 border border-slate-800 hover:border-red-500/35 text-slate-400 hover:text-red-400 rounded-lg cursor-pointer transition-colors"
                        title="Delete Task"
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

      {/* Task Creation & Modification Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl relative select-none">
            
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-850">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ClipboardList className="w-4.5 h-4.5 text-amber-500" />
                {editingTask ? "Amend Task Parameters" : "Assign Operational Duty"}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-amber-500 cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wide font-bold mb-1.5">Task Title / Label</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Sterilize Tattoo Equipment"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wide font-bold mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide precise execution details..."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wide font-bold mb-1.5">Assign to Artist</label>
                  <select
                    required
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none"
                  >
                    <option value="" disabled>Select Staff</option>
                    {employees.map(emp => (
                      <option key={emp._id} value={emp._id}>{emp.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wide font-bold mb-1.5">Task Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wide font-bold mb-1.5">Task Interval Type</label>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none"
                  >
                    <option value="One Time Task">One Time Task</option>
                    <option value="Daily Task">Daily Task (Auto-recurring)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wide font-bold mb-1.5">Due Date</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none text-left"
                  />
                </div>
              </div>

              {editingTask && (
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wide font-bold mb-1.5">Audit Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wide font-bold mb-1.5 font-sans">Notes / Clarifications (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Administrative feedback, logs references..."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500 font-sans"
                />
              </div>

              <div className="pt-3 border-t border-slate-850 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-transform active:scale-95 shadow-md shadow-amber-500/10"
                >
                  <Save className="w-4 h-4" />
                  {editingTask ? "Apply Modifications" : "Delegate Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
