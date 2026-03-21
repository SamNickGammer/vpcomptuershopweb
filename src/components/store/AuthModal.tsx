"use client";

import { useState } from "react";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils/helpers";

export default function AuthModal() {
  const {
    authModalOpen,
    authModalMode,
    openAuthModal,
    closeAuthModal,
    login,
    register,
  } = useAuth();

  const [tab, setTab] = useState<"login" | "register">(authModalMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register fields
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);

  // Sync tab with modal mode when it opens
  function handleOpenChange(open: boolean) {
    if (!open) {
      closeAuthModal();
      return;
    }
  }

  // Reset when modal mode changes
  function switchTab(newTab: "login" | "register") {
    setTab(newTab);
    setError(null);
  }

  // When modal opens, sync tab to mode
  // We use onOpenAutoFocus to reset
  function handleAutoFocus() {
    setTab(authModalMode);
    setError(null);
    setSubmitting(false);
    // Clear login fields
    setLoginEmail("");
    setLoginPassword("");
    // Clear register fields
    setRegName("");
    setRegEmail("");
    setRegPhone("");
    setRegPassword("");
    setRegConfirmPassword("");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setSubmitting(true);
    try {
      await login(loginEmail.trim(), loginPassword);
      closeAuthModal();
      toast.success(`Welcome back!`, {
        description: "You have been signed in successfully.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (
      !regName.trim() ||
      !regEmail.trim() ||
      !regPassword.trim() ||
      !regConfirmPassword.trim()
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (regPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    try {
      await register(
        regName.trim(),
        regEmail.trim(),
        regPassword,
        regPhone.trim() || undefined
      );
      closeAuthModal();
      toast.success(`Welcome, ${regName.trim()}!`, {
        description: "Your account has been created successfully.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  function handleForgotPassword() {
    toast.info("Coming soon", {
      description: "Password reset will be available shortly.",
    });
  }

  const inputClasses =
    "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-colors";

  return (
    <Dialog open={authModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="border-gray-200 bg-white sm:max-w-md"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          handleAutoFocus();
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">
            {tab === "login" ? "Welcome Back" : "Create Account"}
          </DialogTitle>
          <DialogDescription className="text-gray-500">
            {tab === "login"
              ? "Sign in to your V&P Computer account"
              : "Join V&P Computer to start shopping"}
          </DialogDescription>
        </DialogHeader>

        {/* Tab Switcher */}
        <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1">
          <button
            type="button"
            onClick={() => switchTab("login")}
            className={cn(
              "flex-1 rounded-md py-2 text-sm font-medium transition-all",
              tab === "login"
                ? "bg-[#d97706] text-white shadow-sm"
                : "text-gray-500 hover:text-gray-900"
            )}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchTab("register")}
            className={cn(
              "flex-1 rounded-md py-2 text-sm font-medium transition-all",
              tab === "register"
                ? "bg-[#d97706] text-white shadow-sm"
                : "text-gray-500 hover:text-gray-900"
            )}
          >
            Create Account
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">
            {error}
          </div>
        )}

        {/* Login Form */}
        {tab === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-500">
                Email
              </label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClasses}
                autoComplete="email"
                disabled={submitting}
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-500">
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-amber-600 hover:text-amber-700 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showLoginPassword ? "text" : "password"}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter your password"
                  className={cn(inputClasses, "pr-10")}
                  autoComplete="current-password"
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 transition-colors"
                >
                  {showLoginPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 text-sm font-semibold rounded-lg bg-[#d97706] hover:bg-[#b45309] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        )}

        {/* Register Form */}
        {tab === "register" && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-500">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Your full name"
                className={inputClasses}
                autoComplete="name"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-500">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClasses}
                autoComplete="email"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-500">
                Phone{" "}
                <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="tel"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                placeholder="+91 XXXXXXXXXX"
                className={inputClasses}
                autoComplete="tel"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-500">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showRegPassword ? "text" : "password"}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className={cn(inputClasses, "pr-10")}
                  autoComplete="new-password"
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 transition-colors"
                >
                  {showRegPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-500">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showRegConfirm ? "text" : "password"}
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className={cn(inputClasses, "pr-10")}
                  autoComplete="new-password"
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowRegConfirm(!showRegConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 transition-colors"
                >
                  {showRegConfirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 text-sm font-semibold rounded-lg bg-[#d97706] hover:bg-[#b45309] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
