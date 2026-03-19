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
import { Button } from "@/components/ui/button";
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
    "w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors";

  return (
    <Dialog open={authModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="border-border bg-background sm:max-w-md"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          handleAutoFocus();
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">
            {tab === "login" ? "Welcome Back" : "Create Account"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {tab === "login"
              ? "Sign in to your V&P Computer account"
              : "Join V&P Computer to start shopping"}
          </DialogDescription>
        </DialogHeader>

        {/* Tab Switcher */}
        <div className="flex rounded-lg border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => switchTab("login")}
            className={cn(
              "flex-1 rounded-md py-2 text-sm font-medium transition-all",
              tab === "login"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
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
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Create Account
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Login Form */}
        {tab === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
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
                <label className="text-sm font-medium text-muted-foreground">
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-primary hover:text-primary/80 transition-colors"
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showLoginPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-11 text-sm font-semibold"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        )}

        {/* Register Form */}
        {tab === "register" && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                Full Name <span className="text-red-400">*</span>
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
              <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                Email <span className="text-red-400">*</span>
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
              <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                Phone{" "}
                <span className="text-muted-foreground/60">(optional)</span>
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
              <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                Password <span className="text-red-400">*</span>
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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
              <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                Confirm Password <span className="text-red-400">*</span>
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showRegConfirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-11 text-sm font-semibold"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
