import React, { useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { toast } from "sonner";
import { UserRegistrationSchema, sanitizeText } from "@/lib/validations";

export const PhoneAuthFlow: React.FC<{ onBack: () => void; onSuccess: () => void }> = ({ onBack, onSuccess }) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { loginWithPhoneLite } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      toast.error("Please fill in both name and phone number");
      return;
    }
    try {
      UserRegistrationSchema.parse({ name, phone });
    } catch (zodError: any) {
      toast.error(zodError.errors?.[0]?.message || "Invalid name or phone number");
      return;
    }
    try {
      setIsLoading(true);
      await loginWithPhoneLite?.(sanitizeText(name), phone);
      onSuccess();
    } catch (error) {
      toast.error("Failed to sign in. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="text-left">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-textMuted hover:text-textPrimary mb-4 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <h3 className="text-xl font-black text-textPrimary tracking-tight mb-2">
        What's your number?
      </h3>
      <p className="text-sm text-textMuted mb-6">
        We'll use this to create your lightweight account so you can chat right away.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-textMuted block mb-1">Full Name</label>
          <input 
            value={name} 
            onChange={e => setName(e.target.value)} 
            placeholder="John Doe" 
            className="w-full rounded-xl h-12 bg-muted/30 border-none px-4 text-sm focus:ring-2 focus:ring-primary"
            required
          />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-textMuted block mb-1">Phone Number</label>
          <input 
            value={phone} 
            onChange={e => setPhone(e.target.value)} 
            placeholder="08012345678" 
            type="tel"
            className="w-full rounded-xl h-12 bg-muted/30 border-none px-4 text-sm focus:ring-2 focus:ring-primary"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50 mt-2"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start Chatting"}
        </button>
      </form>
    </div>
  );
};
