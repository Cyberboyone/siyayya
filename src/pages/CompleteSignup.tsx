import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { isBusinessNameTaken } from "@/lib/validation";
import { isAdmin } from "@/lib/config";
import { toast } from "sonner";
import { Check, ShieldCheck, Loader2 } from "lucide-react";

const CompleteSignup = () => {
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [isCheckingUniqueness, setIsCheckingUniqueness] = useState(false);
  const [isUnique, setIsUnique] = useState<boolean | null>(null);
   const [isLoading, setIsLoading] = useState(false);
  const checkCount = useRef(0);
  
  const { user, updateProfile, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();


  // If already has business name, redirect away
  useEffect(() => {
    if (user?.businessName && user.businessName !== "" && user.businessName !== "Unknown User") {
        const isWhitelisted = isAdmin(user.email);
        const redirectPath = isWhitelisted ? "/admin" : "/";
        console.log(`[AuthRedirect CompleteSignup Effect] User: ${user?.email}, Admin: ${isWhitelisted}, Redirecting to: ${redirectPath}`);
        navigate(redirectPath, { replace: true });
    }
  }, [user, navigate]);

  // If not authenticated, redirect to signin
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/signin");
    }
  }, [isAuthenticated, navigate]);

  const handleBusinessNameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setBusinessName(val);
    
    const trimmed = val.trim();
    if (trimmed.length < 3) {
      setIsUnique(null);
      setIsCheckingUniqueness(false);
      return;
    }

    const currentCheck = ++checkCount.current;
    setIsCheckingUniqueness(true);
    
    try {
      // Small delay to debounce if needed, but the current async logic is fine
      const taken = await isBusinessNameTaken(trimmed, user?.id);
      
      // Only update state if this is still the most recent request
      if (currentCheck === checkCount.current) {
        setIsUnique(!taken);
        setIsCheckingUniqueness(false);
      }
    } catch (error) {
      console.error("Uniqueness check error:", error);
      if (currentCheck === checkCount.current) {
        setIsCheckingUniqueness(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!businessName || !phone) {
      toast.error("Please fill in all mandatory fields.");
      return;
    }

    if (isUnique === false) {
      toast.error("This Business Name is already taken. Please choose another.");
      return;
    }

    setIsLoading(true);

    try {
      await updateProfile({
        businessName: businessName.trim(),
        phone,
        // Since Google users are already verified, we just ensure the profile is marked finished
      });

      toast.success("Registration complete! Welcome to Siyayya.");
      const isWhitelisted = isAdmin(user?.email);
      const redirectPath = isWhitelisted ? "/admin" : "/";
      console.log(`[AuthRedirect CompleteSignup Submit] User: ${user?.email}, Admin: ${isWhitelisted}, Redirecting to: ${redirectPath}`);
      navigate(redirectPath, { replace: true });
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to save your profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center justify-center gap-2 mb-4 group">
            <Logo textClassName="text-3xl" />
          </Link>
          <h1 className="text-2xl font-black text-foreground mb-2">Final Step: Your Identity</h1>
          <p className="text-sm text-muted-foreground font-semibold px-4 italic">
             Every trader on Siyayya needs a unique <span className="text-primary">Business Name</span> to be identified on the marketplace.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-10 space-y-8 shadow-2xl border-white/5 backdrop-blur-3xl">
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1 mb-1">
                <label className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground">Choose Business Name <span className="text-primary italic">*</span></label>
                {isCheckingUniqueness && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                {!isCheckingUniqueness && isUnique === true && <span className="text-[10px] font-bold text-green-500 uppercase flex items-center gap-1"><Check className="h-3 w-3" /> Available</span>}
                {!isCheckingUniqueness && isUnique === false && <span className="text-[10px] font-bold text-red-500 uppercase">Already Taken</span>}
              </div>
              <div className="relative group">
                <Input
                  type="text"
                  placeholder="e.g. AbuTech or Siyayya Stores"
                  className={`h-14 rounded-2xl bg-secondary/20 border-2 transition-all font-bold px-6 ${
                    isUnique === true ? 'border-green-500/50 shadow-lg shadow-green-500/5' : 
                    isUnique === false ? 'border-red-500/50 shadow-lg shadow-red-500/5' : 
                    'border-white/10 group-hover:border-primary/50'
                  }`}
                  value={businessName}
                  onChange={handleBusinessNameChange}
                  required
                />
              </div>
              <p className="text-[10px] text-muted-foreground ml-1 italic">This is how other students will see you in the marketplace.</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground ml-1 mb-1 block">Phone Number <span className="text-primary italic">*</span></label>
              <div className="relative group">
                <Input
                  type="tel"
                  placeholder="+234..."
                  className="h-14 rounded-2xl bg-secondary/20 border-2 border-white/10 group-hover:border-primary/50 transition-all font-bold px-6"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <p className="text-[10px] text-muted-foreground ml-1 italic">Used for direct buyer-seller contact on campus.</p>
            </div>
          </div>

          <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 flex items-start gap-3">
             <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
             <p className="text-[10px] text-muted-foreground leading-relaxed italic">
               By completing signup, you agree to the Siyayya <span className="text-foreground font-bold">Safety Guidelines</span>. Your email is verified via Google.
             </p>
          </div>

          <Button
            type="submit"
            className="w-full h-16 mt-4 gap-2 rounded-2xl btn-premium text-white font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
            disabled={isLoading || isUnique === false || businessName.length < 3}
          >
            {isLoading ? "Finalizing..." : "Complete Registration"}
          </Button>
        </form>

        <div className="mt-10 text-center">
           <p className="text-xs text-muted-foreground font-bold italic">
             Signed in as <span className="text-foreground">{user?.email}</span>
           </p>
           <button onClick={() => logout()} className="mt-2 text-[10px] text-primary/50 hover:text-primary transition-colors uppercase font-black tracking-widest underline underline-offset-4">Sign out</button>
        </div>
      </div>
    </div>
  );
};

export default CompleteSignup;
