import { useState, useEffect } from "react";
import { clearAuthentication, getRememberedUser, apiFetch } from "./lib/api";
import { AuthUser, NotificationItem, ToastState, ToastType } from "./types";
import { Bell, X, RefreshCw, CheckCircle2, ShieldAlert, CheckCircle, Info, AlertTriangle, AlertOctagon } from "lucide-react";

// Views
import LoginView from "./components/LoginView";
import Sidebar, { TabName } from "./components/Sidebar";
import DashboardView from "./components/DashboardView";
import SalesView from "./components/SalesView";
import CustomersView from "./components/CustomersView";
import AttendanceView from "./components/AttendanceView";
import ExpensesView from "./components/ExpensesView";
import InventoryView from "./components/InventoryView";
import EmployeesView from "./components/EmployeesView";
import ReportsView from "./components/ReportsView";
import SettingsView from "./components/SettingsView";
import TasksView from "./components/TasksView";

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeTab, setActiveTab] = useState<TabName>("dashboard");
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return (localStorage.getItem("theme") as "light" | "dark") || "dark";
  });

  // Toast System
  const [toast, setToast] = useState<ToastState>({ message: "", type: "success", visible: false });

  const showToast = (message: string, type: ToastType = "success") => {
    setToast({ message, type, visible: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  const syncSelfUser = () => {
    const active = getRememberedUser();
    setUser(active);
  };

  const fetchNotifications = async () => {
    if (!getRememberedUser()) return;
    setLoadingNotifications(true);
    try {
      const data = await apiFetch<NotificationItem[]>("/notifications");
      setNotifications(data);
    } catch (err) {
      console.warn("Unable to sync notifications.");
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: "PUT" });
      await fetchNotifications();
    } catch {
      console.warn("Could not mark notification as read.");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const unreadList = notifications.filter(n => !n.isRead);
      for (const item of unreadList) {
        await apiFetch(`/notifications/${item._id}/read`, { method: "PUT" });
      }
      await fetchNotifications();
    } catch {
      console.warn("Could not mark notifications as read.");
    }
  };

  useEffect(() => {
    syncSelfUser();

    // Listen for auth expiration events from fetch helper
    const handleExpired = () => {
      setUser(null);
      alert("Your session has expired. Please sign in again.");
    };

    window.addEventListener("auth-expired", handleExpired);
    return () => {
      window.removeEventListener("auth-expired", handleExpired);
    };
  }, []);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Auto-poll notifications every 30 seconds
      const timer = setInterval(fetchNotifications, 30000);
      return () => clearInterval(timer);
    }
  }, [user]);

  const handleLogout = () => {
    clearAuthentication();
    setUser(null);
    setActiveTab("dashboard");
  };

  // Unread badge details
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Render correct view block
  const renderActiveView = () => {
    if (!user) return null;

    switch (activeTab) {
      case "dashboard":
        return (
          <DashboardView 
            user={user} 
            setActiveTab={setActiveTab} 
            triggerNotificationRefresh={fetchNotifications} 
          />
        );
      case "tasks":
      case "my-tasks":
        return <TasksView user={user} showToast={showToast} />;
      case "sales":
        return <SalesView user={user} showToast={showToast} />;
      case "customers":
        return <CustomersView user={user} showToast={showToast} />;
      case "attendance":
        return <AttendanceView user={user} showToast={showToast} />;
      case "expenses":
        return <ExpensesView user={user} showToast={showToast} />;
      case "inventory":
        return <InventoryView user={user} showToast={showToast} />;
      case "employees":
        return <EmployeesView user={user} showToast={showToast} />;
      case "reports":
        return <ReportsView user={user} />;
      case "settings":
        return <SettingsView user={user} showToast={showToast} />;
      default:
        return (
          <div className="text-slate-400 text-xs text-center py-12">
            No active segment matched.
          </div>
        );
    }
  };

  if (!user) {
    return <LoginView onLoginSuccess={syncSelfUser} />;
  }

  return (
    <div className={`min-h-screen ${theme === "dark" ? "bg-ui-dark text-slate-100" : "bg-slate-50 text-slate-900"} flex flex-col md:flex-row relative transition-colors duration-300`}>
      {/* Left panel sidebar or mobile navigator */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={handleLogout}
        notificationsCount={unreadCount}
        toggleNotifications={() => setIsNotificationsOpen(!isNotificationsOpen)}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      {/* Main workspace scrolling canvas */}
      <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-24 md:pb-12 max-w-7xl mx-auto w-full relative">
        <div className="absolute top-6 right-8 hidden md:flex items-center gap-4 z-10">
          <button 
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className={`relative p-2 ${theme === "dark" ? "text-slate-400 bg-ui-card border-ui-border hover:text-brand-gold" : "text-slate-600 bg-white border-slate-200 hover:text-slate-900"} rounded-full border cursor-pointer transition-colors`}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-brand-gold text-ui-dark font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        <div className="mt-2 md:mt-6">
          {renderActiveView()}
        </div>
      </main>

      {/* FLOATING NOTIFICATIONS OVERLAY PANEL */}
      {isNotificationsOpen && (
        <div className={`fixed inset-0 ${theme === "dark" ? "bg-ui-dark/80" : "bg-slate-900/40"} z-50 flex justify-end transition-opacity`}>
          {/* Dismiss overlay background */}
          <div className="absolute inset-0" onClick={() => setIsNotificationsOpen(false)} />

          <div className={`relative w-full max-w-md ${theme === "dark" ? "bg-ui-card border-ui-border" : "bg-white border-slate-200"} border-l h-full p-6 flex flex-col justify-between shadow-2xl animate-slideLeft select-none transition-colors`}>
            <div>
              <div className={`flex justify-between items-center pb-4 border-b ${theme === "dark" ? "border-ui-border" : "border-slate-100"}`}>
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-brand-gold" />
                  <h3 className={`font-bold ${theme === "dark" ? "text-white" : "text-slate-900"} text-sm uppercase tracking-wider`}>Studio Action Alerts</h3>
                </div>
                <button 
                  onClick={() => setIsNotificationsOpen(false)}
                  className={`${theme === "dark" ? "text-slate-400 hover:text-brand-gold hover:bg-ui-dark" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"} p-1 rounded cursor-pointer transition-colors`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {unreadCount > 0 && (
                <div className={`${theme === "dark" ? "bg-brand-gold/5 border-brand-gold/10" : "bg-amber-50/50 border-amber-500/20"} py-2.5 px-3 rounded-lg flex items-center justify-between text-[11px] mt-4`}>
                  <span className={`font-semibold ${theme === "dark" ? "text-brand-gold" : "text-amber-600"}`}>{unreadCount} unread system notifications</span>
                  <button 
                    onClick={handleMarkAllRead}
                    className="text-brand-gold hover:text-brand-gold-light font-bold uppercase tracking-wider cursor-pointer text-[10px]"
                  >
                    Clear All
                  </button>
                </div>
              )}

              {/* Alerts listing stack */}
              <div className="mt-4 space-y-2.5 overflow-y-auto max-h-[70vh] pr-1">
                {loadingNotifications ? (
                  <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
                    <span>Syncing logs...</span>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className={`py-12 text-center ${theme === "dark" ? "text-slate-500" : "text-slate-400"} text-xs text-sans`}>
                    No active notifications registered on this session.
                  </div>
                ) : (
                  notifications.map((item) => {
                    const isWarn = item.type === "warning" || item.type === "danger";
                    return (
                      <div 
                        key={item._id} 
                        onClick={() => !item.isRead && handleMarkAsRead(item._id)}
                        className={`p-3.5 rounded-lg border text-xs flex items-start gap-2.5 relative leading-relaxed transition-colors cursor-pointer ${
                          item.isRead 
                            ? (theme === "dark" ? "bg-slate-950/40 border-slate-850/80 opacity-70" : "bg-slate-50/50 border-slate-100 opacity-60") 
                            : (theme === "dark" ? "bg-slate-950 border-slate-800 hover:border-brand-gold/30" : "bg-slate-50 border-slate-200 hover:border-amber-500/30")
                        }`}
                      >
                        {isWarn ? (
                          <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        )}

                        <div className="space-y-0.5">
                          <strong className={`${theme === "dark" ? "text-white" : "text-slate-900"} block font-bold`}>{item.title}</strong>
                          <p className={`${theme === "dark" ? "text-slate-400" : "text-slate-600"} font-sans leading-normal`}>{item.description}</p>
                          <span className={`text-[9px] ${theme === "dark" ? "text-slate-500" : "text-slate-400"} block font-mono`}>
                            {new Date(item.createdAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </span>
                        </div>

                        {!item.isRead && (
                          <span className="absolute top-3.5 right-3 w-1.5 h-1.5 rounded-full bg-amber-500" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className={`border-t ${theme === "dark" ? "border-slate-800" : "border-slate-100"} pt-4 text-center`}>
              <button 
                onClick={() => setIsNotificationsOpen(false)}
                className={`w-full ${theme === "dark" ? "bg-slate-950 hover:bg-slate-850 border-slate-800 text-slate-300" : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"} border font-bold py-2.5 rounded-lg text-xs cursor-pointer transition-colors`}
              >
                Close Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE FRIENDLY TOAST SYSTEM */}
      {toast.visible && (
        <div className="fixed bottom-20 md:bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-fadeIn select-none pointer-events-none">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border ${
            toast.type === "success" ? "bg-emerald-950/90 border-emerald-500/30 text-emerald-400" :
            toast.type === "error" ? "bg-red-950/90 border-red-500/30 text-red-400" :
            toast.type === "warning" ? "bg-amber-950/90 border-amber-500/30 text-amber-400" :
            "bg-slate-900/90 border-slate-700/50 text-slate-300"
          } backdrop-blur-md min-w-[280px] max-w-[90vw]`}>
            {toast.type === "success" && <CheckCircle className="w-5 h-5 shrink-0" />}
            {toast.type === "error" && <AlertOctagon className="w-5 h-5 shrink-0" />}
            {toast.type === "warning" && <AlertTriangle className="w-5 h-5 shrink-0" />}
            {toast.type === "info" && <Info className="w-5 h-5 shrink-0" />}
            
            <span className="text-xs font-bold tracking-tight">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
