import React, { useState } from "react";
import { Lock, Mail, ArrowRight, Eye, EyeOff } from "lucide-react";
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
    console.log("[LoginView] Login submit button clicked.");
    console.log("[LoginView] Current page URL:", window.location.href);
    console.log("[LoginView] Requesting endpoint:", window.location.origin + "/api/auth/login");
    console.log("[LoginView] Email payload (password omitted):", email);

    if (!email || !password) {
      console.warn("[LoginView] Login halted: missing email or password");
      setError("Please fill in all credentials");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("[LoginView] Executing fetch request...");
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      console.log(`[LoginView] HTTP response received. Status: ${response.status} (${response.statusText})`);

      const text = await response.text();
      console.log("[LoginView] Raw response text:", text);

      let data;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        console.error("[LoginView] Failed to parse response body as JSON. Raw body is printed above.");
        throw new Error("Invalid response format received from server");
      }

      if (!response.ok) {
        console.warn(`[LoginView] Login request failed with status: ${response.status}`, data);
        throw new Error(data.message || "Invalid authentication credentials");
      }

      console.log("[LoginView] Authentication successful. Writing credentials to local storage.");
      saveAuthentication(data.accessToken, data.refreshToken, data.user);
      onLoginSuccess();
    } catch (err: any) {
      console.error("[LoginView] Catch block error in login handler:", err);
      setError(err.message || "Authentication connection failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="login-container" className="min-h-screen bg-ui-dark flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans select-none">
      {/* Background Ambience and Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(212,175,55,0.05),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(5,5,5,0.5),transparent_50%)]" />

      <div className="w-full max-w-md bg-ui-card border border-brand-gold/10 rounded-2xl shadow-2xl p-8 relative z-10 overflow-hidden">
        {/* Subtle decorative brand gold line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-brand-gold-dark via-brand-gold to-brand-gold-light" />

        <div className="text-center mb-8">
          <img 
            src="/logo.jpeg" 
            alt="Aquarius Logo" 
            className="mx-auto w-24 h-24 rounded-2xl shadow-[0_0_20px_rgba(212,175,55,0.15)] mb-4 object-cover border border-brand-gold/20"
          />
          <h1 className="text-2xl font-bold tracking-tight text-white uppercase">Aquarius</h1>
          <p className="text-brand-gold text-xs tracking-[0.25em] font-bold uppercase mt-1">Tattoo Studio Management</p>
        </div>

        {error && (
          <div className="bg-red-950/30 border border-red-500/20 text-red-400 text-xs rounded-lg p-3 mb-6 flex items-start gap-2 animate-fadeIn">
            <span className="font-bold uppercase tracking-wider">Error:</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2" htmlFor="login-email">
              Identity Coordinates (Email)
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="artist@aquarius.com"
                className="w-full pl-10 pr-4 py-3 bg-ui-dark border border-ui-border rounded-lg text-white placeholder-slate-600 text-xs focus:outline-none focus:border-brand-gold transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-slate-400 text-[10px] font-bold uppercase tracking-widest" htmlFor="login-password">
                Secure Entry Key (Password)
              </label>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-3 bg-ui-dark border border-ui-border rounded-lg text-white placeholder-slate-600 text-xs focus:outline-none focus:border-brand-gold transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-slate-500 hover:text-brand-gold transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between py-1 text-[11px]">
            <label className="flex items-center gap-2 text-slate-500 cursor-pointer select-none group">
              <input type="checkbox" defaultChecked className="rounded text-brand-gold bg-ui-dark border-ui-border focus:ring-brand-gold focus:ring-offset-ui-dark" />
              <span className="group-hover:text-slate-300 transition-colors">Maintain active session</span>
            </label>
          </div>

          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-brand-gold-dark to-brand-gold hover:from-brand-gold hover:to-brand-gold-light text-ui-dark font-black uppercase tracking-widest text-[11px] py-4 rounded-lg shadow-xl shadow-brand-gold/5 flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? "Decrypting..." : "Initialize Workspace"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-ui-border">
          <p className="text-center text-[9px] text-slate-500 mb-4 uppercase tracking-[0.2em] font-black">Operator Quick-Fill</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleQuickFill("admin")}
              className="text-[10px] bg-ui-dark border border-brand-gold/10 text-brand-gold hover:bg-brand-gold/5 hover:border-brand-gold/30 rounded-lg py-2.5 font-bold uppercase tracking-wider cursor-pointer transition-all"
            >
              Master Admin
            </button>
            <button
              onClick={() => handleQuickFill("employee")}
              className="text-[10px] bg-ui-dark border border-ui-border text-slate-400 hover:bg-slate-900 hover:border-slate-700 rounded-lg py-2.5 font-bold uppercase tracking-wider cursor-pointer transition-all"
            >
              Studio Artist
            </button>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 text-center z-10">
        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.3em]">© 2026 Aquarius Tattoo • Encrypted Forge</p>
      </div>
    </div>
  );
}
