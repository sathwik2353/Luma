
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "signin" | "signup" | "reset";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function clearMessages() {
    setMessage("");
    setError("");
  }

 function callbackUrl(next = "/") {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;

  const baseUrl =
    process.env.NODE_ENV === "production" && configuredUrl
      ? configuredUrl
      : window.location.origin;

  const url = new URL("/auth/callback", baseUrl);
  url.searchParams.set("next", next);

  return url.toString();
}

  function changeMode(nextMode: AuthMode) {
    clearMessages();
    setPassword("");
    setShowPassword(false);
    setMode(nextMode);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    clearMessages();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Enter your email address.");
      return;
    }

    if (mode !== "reset" && !password) {
      setError("Enter your password.");
      return;
    }

    if (mode === "signup" && password.length < 8) {
      setError("Choose a password with at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      if (mode === "reset") {
        const { error: resetError } =
          await supabase.auth.resetPasswordForEmail(normalizedEmail, {
            redirectTo: callbackUrl("/app/login"),
          });

        if (resetError) throw resetError;

        setMessage(
          "If password recovery is available for this account, check your email for the reset link."
        );
        return;
      }

      if (mode === "signup") {
        const { data, error: signupError } =
          await supabase.auth.signUp({
            email: normalizedEmail,
            password,
            options: {
              emailRedirectTo: callbackUrl("/"),
            },
          });

        if (signupError) throw signupError;

        if (data.session) {
          router.replace("/");
          router.refresh();
          return;
        }

        setMessage(
          "Your account request was received. Check your email for a confirmation link if email confirmation is enabled."
        );
        return;
      }

      const { error: signinError } =
        await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

      if (signinError) throw signinError;

      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const title =
    mode === "signin"
      ? "Welcome back."
      : mode === "signup"
        ? "Make room for clarity."
        : "Reset your password.";

  const description =
    mode === "signin"
      ? "Your financial picture, right where you left it."
      : mode === "signup"
        ? "A clearer relationship with your money starts here."
        : "We'll help you get back into your account.";

  return (
    <main className="luma-auth relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-8 sm:px-8 sm:py-12">
      <div aria-hidden="true" className="auth-glow auth-glow-one" />
      <div aria-hidden="true" className="auth-glow auth-glow-two" />
      <div aria-hidden="true" className="auth-grid" />

      <div className="auth-shell relative z-10 grid w-full max-w-6xl overflow-hidden md:grid-cols-[1fr_0.88fr]">
        {/* Brand and visual panel */}
        <section className="auth-showcase hidden flex-col justify-between md:flex">
          <Link href="/" aria-label="Luma home" className="auth-brand">
            <span className="auth-brand-icon">
              <Wallet size={21} strokeWidth={1.8} />
            </span>
            <span className="auth-brand-name">
              luma<span>.</span>
            </span>
          </Link>

          <div className="auth-showcase-content">
            <div className="auth-eyebrow">
              <span className="auth-live-dot" />
              YOUR FINANCIAL SPACE
            </div>

            <h1 className="auth-display">
              Money feels
              <br />
              different when
              <br />
              <span>it makes sense.</span>
            </h1>

            <p className="auth-description">
              Understand your habits. See the bigger picture. Make your next
              financial decision with confidence.
            </p>

            <div className="auth-visual-card">
              <div className="auth-visual-top">
                <div>
                  <p className="auth-muted-label">Your money, in perspective</p>
                  <p className="auth-visual-title">Clarity over complexity.</p>
                </div>
                <span className="auth-visual-icon">
                  <ShieldCheck size={19} />
                </span>
              </div>

              <div className="auth-chart" aria-label="Decorative chart">
                {[28, 43, 34, 57, 45, 69, 53, 82, 62, 94, 73, 86].map(
                  (height, index) => (
                    <span
                      key={index}
                      className={index === 9 ? "auth-bar auth-bar-active" : "auth-bar"}
                      style={{ height: `${height}%` }}
                    />
                  )
                )}
              </div>

              <div className="auth-visual-bottom">
                <span>Built around your life</span>
                <span className="auth-visual-status">
                  <span className="auth-live-dot" />
                  YOUR SPACE
                </span>
              </div>
            </div>
          </div>

          <div className="auth-footer">
            <span>Your money. Your clarity.</span>
            <span>PERSONAL FINANCE / 01</span>
          </div>
        </section>

        {/* Authentication panel */}
        <section className="auth-form-panel">
          <Link href="/" aria-label="Luma home" className="auth-brand auth-mobile-brand">
            <span className="auth-brand-icon">
              <Wallet size={20} strokeWidth={1.8} />
            </span>
            <span className="auth-brand-name">
              luma<span>.</span>
            </span>
          </Link>

          <div className="auth-form-content">
            <div className="auth-heading">
              <p className="auth-section-label">
                {mode === "signin"
                  ? "YOUR SPACE AWAITS"
                  : mode === "signup"
                    ? "A FRESH START"
                    : "ACCOUNT RECOVERY"}
              </p>

              <h2>{title}</h2>
              <p>{description}</p>
            </div>

            <div className="auth-divider">
              <span />
              <span>EMAIL AUTHENTICATION</span>
              <span />
            </div>

            <form onSubmit={handleSubmit} className="auth-fields">
              <div className="auth-field">
                <label htmlFor="email">Email address</label>
                <div className="auth-input-wrap">
                  <Mail size={17} aria-hidden="true" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={254}
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      clearMessages();
                    }}
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {mode !== "reset" && (
                <div className="auth-field">
                  <div className="auth-label-row">
                    <label htmlFor="password">Password</label>
                    {mode === "signin" && (
                      <button
                        type="button"
                        className="auth-text-button"
                        onClick={() => changeMode("reset")}
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>

                  <div className="auth-input-wrap">
                    <LockKeyhole size={17} aria-hidden="true" />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete={
                        mode === "signup" ? "new-password" : "current-password"
                      }
                      required
                      minLength={mode === "signup" ? 8 : 1}
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        clearMessages();
                      }}
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword((value) => !value)}
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>

                  {mode === "signup" && (
                    <p className="auth-hint">Use at least 8 characters.</p>
                  )}
                </div>
              )}

              {error && (
                <div role="alert" className="auth-alert auth-alert-error">
                  {error}
                </div>
              )}

              {message && (
                <div role="status" className="auth-alert auth-alert-success">
                  {message}
                </div>
              )}

              <button type="submit" disabled={loading} className="auth-submit">
                <span>
                  {loading
                    ? "Please wait…"
                    : mode === "signin"
                      ? "Sign in"
                      : mode === "signup"
                        ? "Create account"
                        : "Send recovery link"}
                </span>
                {!loading && <ArrowRight size={18} />}
              </button>
            </form>

            <div className="auth-switch">
              {mode === "signin" && (
                <>
                  New to Luma?{" "}
                  <button type="button" onClick={() => changeMode("signup")}>
                    Create an account
                  </button>
                </>
              )}

              {mode === "signup" && (
                <>
                  Already have an account?{" "}
                  <button type="button" onClick={() => changeMode("signin")}>
                    Sign in
                  </button>
                </>
              )}

              {mode === "reset" && (
                <button type="button" onClick={() => changeMode("signin")}>
                  Back to sign in
                </button>
              )}
            </div>

            <div className="auth-security-note">
              <ShieldCheck size={15} />
              <span>Your account credentials stay private.</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
