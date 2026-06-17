import { useState } from "react";
import { Lock, Mail, Disc, ArrowRight, Eye, EyeOff } from "lucide-react";
import { saveAuthentication } from "../lib/api";

interface LoginViewProps {
  onLoginSuccess: () => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Quick fill indicators
  const handleQuickFill = (role: "admin" | "employee") => {
    if (role === "admin") {
      setEmail("admin@gmail.com");
      setPassword("Test@123");
    } else {
      setEmail("employee@gmail.com");
      setPassword("Test@123");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all credentials");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Invalid authentication credentials");
      }

      saveAuthentication(data.accessToken, data.refreshToken, data.user);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || "Authentication connection failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="login-container" className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans select-none">
      {/* Background Ambience and Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(212,175,55,0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(15,23,42,0.5),transparent_50%)]" />

      <div className="w-full max-w-md bg-slate-900 border border-amber-500/15 rounded-2xl shadow-2xl p-8 relative z-10 overflow-hidden">
        {/* Subtle decorative gold line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-700" />

        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-amber-500 to-yellow-500 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.2)] mb-4">
            <Disc className="w-8 h-8 text-slate-950 animate-spin-slow" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">AQUARIUS</h1>
          <p className="text-amber-500 text-xs tracking-[0.25em] font-medium uppercase mt-1">Tattoo Studio Management</p>
        </div>

        {error && (
          <div className="bg-red-950 border border-red-500/30 text-red-300 text-sm rounded-lg p-3 mb-6 flex items-start gap-2 animate-pulse">
            <span className="font-semibold">Error:</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2" htmlFor="login-email">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="artist@aquarius.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-slate-300 text-xs font-semibold uppercase tracking-wider" htmlFor="login-password">
                Password
              </label>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between py-1 text-xs">
            <label className="flex items-center gap-2 text-slate-400 cursor-pointer user-select-none">
              <input type="checkbox" defaultChecked className="rounded text-amber-500 bg-slate-950Accent border-slate-700 focus:ring-amber-500 focus:ring-offset-slate-900" />
              <span>Remember computer login</span>
            </label>
          </div>

          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-sm py-3 rounded-lg shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-transform cursor-pointer disabled:opacity-50"
          >
            {loading ? "Verifying Credentials..." : "Access Studio Workspace"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800">
          <p className="text-center text-xs text-slate-400 mb-3 uppercase tracking-wider font-semibold">Demo Quick Fill</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleQuickFill("admin")}
              className="text-xs bg-slate-950 border border-amber-500/20 text-amber-500 hover:bg-amber-500/5 hover:border-amber-500/50 rounded-lg py-2 font-medium cursor-pointer transition-colors"
            >
              Fill Admin Account
            </button>
            <button
              onClick={() => handleQuickFill("employee")}
              className="text-xs bg-slate-950 border border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-500 rounded-lg py-2 font-medium cursor-pointer transition-colors"
            >
              Fill Employee Account
            </button>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 text-center z-10">
        <p className="text-xs text-slate-500">© 2026 Aquarius Tattoo Studio. Encrypted Workspace Platform.</p>
      </div>
    </div>
  );
}
