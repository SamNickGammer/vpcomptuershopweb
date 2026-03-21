"use client";

import { useState } from "react";
import Link from "next/link";
import { Cpu, Mail, Lock, User, Phone, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils/helpers";
import { toast } from "sonner";

type Mode = "login" | "register" | "forgot";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");

  // Login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Register fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    setError("");
    // TODO: Integrate with Supabase Auth
    await new Promise((r) => setTimeout(r, 1500));
    toast.info("Customer login coming soon! Stay tuned.");
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    setError("");
    // TODO: Integrate with Supabase Auth
    await new Promise((r) => setTimeout(r, 1500));
    toast.info("Customer registration coming soon! Stay tuned.");
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email");
      return;
    }
    setLoading(true);
    setError("");
    await new Promise((r) => setTimeout(r, 1500));
    toast.info("Password reset coming soon! Stay tuned.");
    setLoading(false);
  };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setError("");
    setShowPassword(false);
  };

  const inputClasses = "w-full h-11 pl-10 pr-4 rounded-xl bg-white border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all text-sm";

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-16 relative bg-gray-50">
      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d97706] shadow-lg shadow-amber-500/20">
              <Cpu className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900">V&P Computer</span>
          </Link>
          <p className="text-sm text-gray-500">
            {mode === "login" && "Sign in to your account"}
            {mode === "register" && "Create a new account"}
            {mode === "forgot" && "Reset your password"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-lg">
          {/* Tab switcher (login/register) */}
          {mode !== "forgot" && (
            <div className="flex rounded-xl bg-gray-50 p-1 mb-6">
              <button
                onClick={() => switchMode("login")}
                className={cn(
                  "flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  mode === "login"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                )}
              >
                Sign In
              </button>
              <button
                onClick={() => switchMode("register")}
                className={cn(
                  "flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  mode === "register"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                )}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-500 text-sm">
              {error}
            </div>
          )}

          {/* -- Login Form -- */}
          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-900">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={inputClasses}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-900">Password</label>
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className="text-xs text-amber-600 hover:text-amber-700 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="--------"
                    className={cn(inputClasses, "pr-10")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-500 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-[#d97706] hover:bg-[#b45309] text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* -- Register Form -- */}
          {mode === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-900">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Rahul Sharma"
                    className={inputClasses}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-900">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={inputClasses}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-900">Phone <span className="text-gray-400">(optional)</span></label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98XXX XXXXX"
                    className={inputClasses}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-900">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="------"
                      className={inputClasses}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-900">Confirm</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="------"
                      className={inputClasses}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-gray-400 hover:text-gray-500 transition-colors flex items-center gap-1.5"
                >
                  {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  {showPassword ? "Hide" : "Show"} passwords
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-[#d97706] hover:bg-[#b45309] text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>

              <p className="text-[11px] text-gray-400 text-center">
                By creating an account, you agree to our Terms of Service and Privacy Policy.
              </p>
            </form>
          )}

          {/* -- Forgot Password Form -- */}
          {mode === "forgot" && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <p className="text-sm text-gray-500 mb-2">
                Enter your email and we&apos;ll send you a link to reset your password.
              </p>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-900">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={inputClasses}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-[#d97706] hover:bg-[#b45309] text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Send Reset Link
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => switchMode("login")}
                className="w-full text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                Back to Sign In
              </button>
            </form>
          )}
        </div>

        {/* Bottom text */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by V&P Computer Shop, Patna, Bihar
        </p>
      </div>
    </div>
  );
}
