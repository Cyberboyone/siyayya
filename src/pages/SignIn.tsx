import { Link, useNavigate, useLocation } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, LayoutDashboard } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import AuthRedirect from "@/components/AuthRedirect";

const SignIn = () => {
  useSEO({
    title: "Sign In | Siyayya Marketplace",
    description: "Sign in to Siyayya, the Federal University of Kashere's exclusive verified trading community.",
    noindex: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const { user, loginWithGoogle, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // 🔴 Manual redirect removed. Handled by PublicRoute in App.tsx.

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      await loginWithGoogle();
      // Note: Page will redirect to Google, code below won't execute on success.
    } catch (error: any) {
      console.error("[SignIn Error]", error);
      toast.error("Google sign-in initiation failed. Please try again.");
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center justify-center gap-2 mb-4 group">
            <Logo textClassName="text-3xl" />
          </Link>
          <h1 className="text-2xl font-black text-foreground mb-2">Welcome to Kashere's Marketplace</h1>
          <p className="text-sm text-muted-foreground font-medium px-4">
            Join the Federal University of Kashere's exclusive verified trading community.
          </p>
        </div>

        <div className="glass-card p-10 space-y-8 shadow-2xl border-white/10">
          <div className="space-y-2 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4">Secure Authentication</p>
            <p className="text-sm text-muted-foreground font-semibold">
              Currently, we only support official Google accounts for safe campus trading.
            </p>
          </div>

          <Button
            variant="outline"
            type="button"
            className="w-full h-16 gap-4 rounded-2xl border-2 hover:bg-secondary/50 font-bold transition-all shadow-lg active:scale-95 group overflow-hidden relative"
            onClick={handleGoogleSignIn}
            disabled={isLoading || authLoading}
          >
            <div className="absolute inset-0 bg-primary/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            {isLoading || authLoading ? (
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin relative z-10" />
            ) : (
              <svg viewBox="0 0 24 24" className="h-6 w-6 relative z-10" aria-hidden="true">
                <path
                  d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                  fill="currentColor"
                />
              </svg>
            )}
            <span className="relative z-10 text-lg">
              {isLoading || authLoading ? "Signing in..." : "Continue with Google"}
            </span>
          </Button>

          <div className="pt-4 space-y-4">
            <div className="bg-secondary/30 p-4 rounded-xl border border-white/5 space-y-2">
              <div className="flex items-start gap-3">
                <LayoutDashboard className="h-4 w-4 text-primary mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  <span className="font-bold text-foreground">Note:</span> First-time users will be asked to choose a unique <span className="text-primary italic">Business Name</span> before accessing the marketplace.
                </p>
              </div>
            </div>
            
            <div className="text-center space-y-2">
              <p className="text-[10px] text-muted-foreground">
                If login fails or gets stuck, try opening this page in <span className="text-primary font-bold">Chrome</span> or <span className="text-primary font-bold">Safari</span>.
              </p>
              {(isLoading || authLoading) && (
                <button 
                  onClick={() => window.location.reload()}
                  className="text-[10px] text-primary underline font-bold"
                >
                  Stuck? Click here to refresh
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
            <Link to="/" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors italic">
              <ArrowRight className="h-4 w-4 rotate-180" /> Back to Homepage
            </Link>
        </div>
      </div>

      {/* 🔴 5. USE REDIRECT HANDLER ONLY ON LOGIN PAGE */}
      <AuthRedirect />
    </div>
  );
};

export default SignIn;
