import { LayoutDashboard, Receipt, Users, CalendarClock, Coins, PackageOpen, UserRoundCog, BarChart3, Settings, LogOut, Menu, X, Bell, Moon, Sun, ClipboardList, ClipboardCheck } from "lucide-react";
import { AuthUser } from "../types";

export type TabName = "dashboard" | "tasks" | "my-tasks" | "sales" | "customers" | "attendance" | "expenses" | "inventory" | "employees" | "reports" | "settings";

interface SidebarProps {
  activeTab: TabName;
  setActiveTab: (tab: TabName) => void;
  user: AuthUser;
  onLogout: () => void;
  notificationsCount: number;
  toggleNotifications: () => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, user, onLogout, notificationsCount, toggleNotifications, theme, toggleTheme }: SidebarProps) {
  const isAdmin = user.role === "Admin";

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, role: "Both" },
    { id: "tasks", label: "Tasks", icon: ClipboardList, role: "Admin" },
    { id: "my-tasks", label: "My Tasks", icon: ClipboardCheck, role: "Employee" },
    { id: "sales", label: "Sales Log", icon: Receipt, role: "Both" },
    { id: "customers", label: "Client Portfolio", icon: Users, role: "Both" },
    { id: "attendance", label: "Attendance", icon: CalendarClock, role: "Both" },
    { id: "expenses", label: "Studio Expenses", icon: Coins, role: "Both" },
    { id: "inventory", label: "Supplies Stock", icon: PackageOpen, role: "Both" },
    { id: "employees", label: "Staff Members", icon: UserRoundCog, role: "Admin" },
    { id: "reports", label: "Analytics Reports", icon: BarChart3, role: "Admin" },
    { id: "settings", label: "Studio Settings", icon: Settings, role: "Admin" }
  ] as const;

  const visibleItems = menuItems.filter(item => {
    if (item.role === "Both") return true;
    if (item.role === "Admin" && isAdmin) return true;
    if (item.role === "Employee" && !isAdmin) return true;
    return false;
  });

  // Determine standard bottom navigation shortcuts on mobile
  const mobileShortcutsRaw = [
    { id: "dashboard", label: "Dash", icon: LayoutDashboard, role: "Both" },
    { id: "tasks", label: "Tasks", icon: ClipboardList, role: "Admin" },
    { id: "my-tasks", label: "My Tasks", icon: ClipboardCheck, role: "Employee" },
    { id: "sales", label: "Sales", icon: Receipt, role: "Admin" },
    { id: "customers", label: "Clients", icon: Users, role: "Both" },
    { id: "attendance", label: "Shift", icon: CalendarClock, role: "Both" },
    { id: "expenses", label: "Bills", icon: Coins, role: "Employee" }
  ] as const;

  const mobileShortcuts = mobileShortcutsRaw.filter(
    item => item.role === "Both" || (item.role === "Admin" && isAdmin) || (item.role === "Employee" && !isAdmin)
  );

  return (
    <>
      {/* HEADER / NAVIGATION BAR (For Mobiles) */}
      <div id="mobile-topbar" className={`md:hidden w-full ${theme === "dark" ? "bg-ui-dark border-ui-border" : "bg-white border-slate-200"} border-b h-16 px-4 flex items-center justify-between sticky top-0 z-30 select-none transition-colors`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden border border-brand-gold/20 shadow-lg shadow-brand-gold/10 relative shrink-0">
            <img 
              src="/logo.jpeg" 
              alt="Aquarius Logo" 
              className="w-full h-full object-cover scale-[1.25]"
            />
          </div>
          <div>
            <h1 className={`text-sm font-bold ${theme === "dark" ? "text-white" : "text-slate-900"} uppercase tracking-tight`}>Aquarius</h1>
            <span className="text-[9px] text-brand-gold tracking-wider block -mt-1 font-semibold">TATTOO WORKSPACE</span>
          </div>
        </div>
 
        <div className="flex items-center gap-3">
          {/* Theme Toggle Mobile */}
          <button 
            onClick={toggleTheme}
            className={`p-1.5 rounded-full border cursor-pointer transition-colors ${
              theme === "dark" ? "text-slate-400 bg-ui-card border-ui-border hover:text-brand-gold" : "text-slate-600 bg-slate-50 border-slate-200 hover:text-slate-900"
            }`}
          >
            {theme === "dark" ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
          </button>
 
          {/* Notifications Notification */}
          <button onClick={toggleNotifications} className={`relative p-1.5 rounded-full border cursor-pointer transition-colors ${
            theme === "dark" ? "text-slate-400 bg-ui-card border-ui-border" : "text-slate-600 bg-slate-50 border-slate-200"
          }`}>
            <Bell className="w-5 h-5" />
            {notificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-brand-gold text-ui-dark font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
                {notificationsCount}
              </span>
            )}
          </button>
 
          <button onClick={onLogout} className={`p-1.5 rounded-full border cursor-pointer transition-colors ${
            theme === "dark" ? "text-slate-400 bg-ui-card border-ui-border hover:text-red-400" : "text-slate-600 bg-slate-50 border-slate-200 hover:text-red-500"
          }`} title="Log Out">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
 
      {/* DESKTOP SIDEBAR: Fixed left side */}
      <aside id="desktop-sidebar" className={`hidden md:flex flex-col w-64 ${theme === "dark" ? "bg-ui-card border-ui-border" : "bg-white border-slate-200"} border-r h-screen sticky top-0 z-20 select-none transition-colors`}>
        {/* Brand Header */}
        <div className={`p-6 border-b ${theme === "dark" ? "border-ui-border" : "border-slate-100"} flex items-center gap-4`}>
          <div className="w-12 h-12 rounded-xl overflow-hidden border border-brand-gold/20 shadow-lg shadow-brand-gold/15 relative shrink-0">
            <img 
              src="/logo.jpeg" 
              alt="Aquarius Logo" 
              className="w-full h-full object-cover scale-[1.25]"
            />
          </div>
          <div>
            <h1 className={`text-base font-bold ${theme === "dark" ? "text-white" : "text-slate-900"} tracking-wide uppercase leading-tight`}>Aquarius</h1>
            <p className="text-brand-gold text-[10px] tracking-[0.2em] font-bold uppercase -mt-0.5">Tattoo Studio</p>
          </div>
        </div>
 
        {/* User Badge Profile Section */}
        <div className={`p-4 mx-4 my-4 ${theme === "dark" ? "bg-ui-dark border-ui-border" : "bg-slate-50 border-slate-100"} border rounded-xl flex items-center gap-3`}>
          <img
            src={user.profileImage || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.name}`}
            alt={user.name}
            className={`w-10 h-10 rounded-lg object-cover shrink-0 ${theme === "dark" ? "bg-slate-850" : "bg-white"}`}
            referrerPolicy="no-referrer"
          />
          <div className="overflow-hidden">
            <h4 className={`text-xs font-semibold ${theme === "dark" ? "text-white" : "text-slate-900"} truncate leading-snug`}>{user.name}</h4>
            <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full mt-1 ${
              isAdmin 
                ? "bg-brand-gold/10 text-brand-gold border border-brand-gold/20" 
                : (theme === "dark" ? "bg-slate-800 text-slate-400" : "bg-slate-200 text-slate-600")
            }`}>
              {user.role}
            </span>
          </div>
        </div>

        {/* Navigation Actions List */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => {
            const IconComponent = item.icon;
            const isSelected = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as TabName)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-medium cursor-pointer transition-colors group ${
                  isSelected
                    ? "bg-brand-gold text-ui-dark font-bold"
                    : (theme === "dark" ? "text-slate-400 hover:bg-ui-dark hover:text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900")
                }`}
              >
                <IconComponent className={`w-4 h-4 ${isSelected ? "text-ui-dark" : (theme === "dark" ? "text-slate-400 group-hover:text-brand-gold" : "text-slate-500 group-hover:text-brand-gold-dark")} transition-colors`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Floating actions, Notifications notification counter + Logout */}
        <div className={`p-4 border-t ${theme === "dark" ? "border-ui-border bg-ui-dark/50" : "border-slate-100 bg-slate-50/30"} space-y-1.5`}>
          {/* Theme Toggle Desktop */}
          <button
            onClick={toggleTheme}
            className={`w-full ${theme === "dark" ? "text-slate-400 hover:bg-ui-dark hover:text-brand-gold" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"} text-xs font-medium py-2 px-4 rounded-lg flex items-center gap-3 cursor-pointer transition-colors`}
          >
            {theme === "dark" ? (
              <><Sun className="w-4 h-4" /> <span>Light Mode</span></>
            ) : (
              <><Moon className="w-4 h-4" /> <span>Dark Mode</span></>
            )}
          </button>

          {/* Action to show alerts */}
          <button
            onClick={toggleNotifications}
            className={`relative w-full ${theme === "dark" ? "text-slate-400 hover:bg-ui-dark hover:text-brand-gold" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"} text-xs font-medium py-2 px-4 rounded-lg flex items-center justify-between cursor-pointer transition-colors`}
          >
            <span className="flex items-center gap-3">
              <Bell className="w-4 h-4" />
              <span>Studio Alerts</span>
            </span>
            {notificationsCount > 0 && (
              <span className="bg-brand-gold text-ui-dark hover:bg-brand-gold-dark font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow-lg shadow-brand-gold/5">
                {notificationsCount}
              </span>
            )}
          </button>

          <button
            onClick={onLogout}
            className={`w-full ${theme === "dark" ? "text-slate-500 hover:bg-red-500/10 hover:text-red-400" : "text-slate-500 hover:bg-red-50 hover:text-red-600"} text-xs font-medium py-2 px-3 rounded-lg flex items-center gap-3 cursor-pointer transition-colors`}
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Session</span>
          </button>
        </div>
      </aside>

      {/* MOBILE BOTTOM NAVIGATION BAR: Sticky footer for portable screens */}
      <div id="mobile-navigation" className={`md:hidden fixed bottom-0 left-0 right-0 h-20 ${theme === "dark" ? "bg-ui-dark border-ui-border" : "bg-white border-slate-200"} border-t grid grid-cols-5 items-center z-30 select-none px-2 shadow-2xl transition-colors`}>
        {mobileShortcuts.map((item) => {
          const IconComponent = item.icon;
          const isSelected = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as TabName)}
              className="flex flex-col items-center justify-center gap-1.5 h-full cursor-pointer transition-transform duration-100 active:scale-95"
            >
              <div className={`p-2 rounded-lg ${isSelected ? "bg-brand-gold text-ui-dark" : (theme === "dark" ? "text-slate-400" : "text-slate-500")}`}>
                <IconComponent className="w-5.5 h-5.5" />
              </div>
              <span className={`text-[10px] font-bold tracking-wide ${isSelected ? "text-brand-gold" : (theme === "dark" ? "text-slate-400" : "text-slate-500")}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
