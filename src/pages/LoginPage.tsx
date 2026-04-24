import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Bot, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTradingApi, isNativePlatform } from "@/hooks/useTradingApi";

type AuthView = "login" | "signup" | "forgot";

const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const api = useTradingApi();
  const [view, setView] = useState<AuthView>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  const redirect = searchParams.get("redirect") || "/?tab=trading";
  const native = isNativePlatform();

  // After successful auth, leave login screen.
  useEffect(() => {
    if (!api.isCheckingSession && api.isAuthenticated) {
      navigate(redirect, { replace: true });
    }
  }, [api.isCheckingSession, api.isAuthenticated, navigate, redirect]);

  const inputClass =
    "w-full h-12 rounded-xl bg-secondary/50 border border-border/40 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

  const switchView = (v: AuthView) => {
    setView(v);
    setPassword("");
    setReferralCode("");
    setForgotSent(false);
    setForgotError(null);
  };

  const handleLogin = () => api.authenticate(email, password);
  const handleSignup = () => api.register(email, password, referralCode || undefined);
  const handleForgot = async () => {
    setForgotLoading(true);
    setForgotError(null);
    try {
      await api.forgotPassword(email);
      setForgotSent(true);
    } catch (e: any) {
      setForgotError(e.message || "Failed to send reset email");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-background flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border/40">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl bg-card/80 border border-border/40 flex items-center justify-center active:scale-95 transition-transform"
          aria-label="Back"
        >
          <ChevronLeft className="w-4 h-4 text-foreground" />
        </button>
        <h1 className="text-[15px] font-bold text-foreground tracking-tight">Account</h1>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-8 pb-16">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
          <Bot className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-1">
          {view === "login" ? "Welcome back" : view === "signup" ? "Create Account" : "Reset Password"}
        </h2>
        <p className="text-sm text-muted-foreground mb-6 text-center max-w-[420px]">
          {view === "login"
            ? "Sign in to access your AI trading dashboard"
            : view === "signup"
            ? "Create a new account to get started"
            : "Enter your email to receive a reset link"}
        </p>

        {(api.authError || forgotError) && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 mb-4 w-full max-w-[420px]">
            <p className="text-xs text-destructive text-center">{api.authError || forgotError}</p>
          </div>
        )}

        {view === "forgot" && forgotSent ? (
          <div className="w-full max-w-[420px] space-y-4">
            <div className="bg-success/10 border border-success/20 rounded-xl px-4 py-4">
              <p className="text-xs text-success text-center">
                Password reset link sent to your email. Please check your inbox.
              </p>
            </div>
            <Button
              onClick={() => switchView("login")}
              variant="outline"
              className="w-full h-12 rounded-xl text-sm font-semibold"
            >
              Back to Sign In
            </Button>
          </div>
        ) : (
          <>
            {/* Google button — web only. Hidden on native to avoid the broken in-app browser flow. */}
            {view !== "forgot" && !native && (
              <div className="w-full max-w-[420px] mb-4">
                <button
                  type="button"
                  onClick={() => api.authenticateWithGoogle()}
                  disabled={api.isAuthenticating}
                  className="w-full h-12 rounded-xl bg-card border border-border/60 flex items-center justify-center gap-3 text-sm font-semibold text-foreground active:bg-secondary/60 disabled:opacity-60"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.43.34-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.93l3.66-2.83z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.65l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/>
                  </svg>
                  Continue with Google
                </button>
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-border/50" />
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">or</span>
                  <div className="flex-1 h-px bg-border/50" />
                </div>
              </div>
            )}

            <div className="w-full max-w-[420px] space-y-4 mb-5">
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </div>

              {view !== "forgot" && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-semibold text-foreground">Password</label>
                    {view === "login" && (
                      <button
                        onClick={() => switchView("forgot")}
                        className="text-xs text-primary font-medium"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && (view === "login" ? handleLogin() : handleSignup())
                    }
                    className={inputClass}
                  />
                </div>
              )}

              {view === "signup" && (
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">
                    Referral Code{" "}
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter referral code"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                    className={inputClass}
                  />
                </div>
              )}
            </div>

            <Button
              onClick={view === "login" ? handleLogin : view === "signup" ? handleSignup : handleForgot}
              disabled={
                (view === "forgot" ? forgotLoading : api.isAuthenticating) ||
                !email ||
                (view !== "forgot" && !password)
              }
              className="w-full max-w-[420px] h-12 rounded-xl font-semibold text-sm"
            >
              {(view === "forgot" ? forgotLoading : api.isAuthenticating) ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {view === "forgot"
                    ? "Sending..."
                    : view === "login"
                    ? "Signing in..."
                    : "Creating account..."}
                </>
              ) : view === "login" ? (
                "Sign In"
              ) : view === "signup" ? (
                "Create Account"
              ) : (
                "Send Reset Link"
              )}
            </Button>

            <p className="mt-4 text-sm text-muted-foreground">
              {view === "login" ? (
                <>
                  Don't have an account?{" "}
                  <button onClick={() => switchView("signup")} className="text-primary font-medium">
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button onClick={() => switchView("login")} className="text-primary font-medium">
                    Sign in
                  </button>
                </>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default LoginPage;