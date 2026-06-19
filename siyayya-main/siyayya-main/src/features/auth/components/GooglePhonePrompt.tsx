import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { toast } from "sonner";
import { ProfileUpdateSchema } from "@/lib/validations";

export const GooglePhonePrompt: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { addPhoneToGoogleAccount } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      toast.error("Please enter your phone number");
      return;
    }
    try {
      ProfileUpdateSchema.parse({ phone });
    } catch (zodError: any) {
      toast.error(zodError.errors?.[0]?.message || "Invalid phone number");
      return;
    }
    try {
      setIsLoading(true);
      await addPhoneToGoogleAccount(phone);
      onSuccess();
    } catch (error) {
      toast.error("Failed to save phone number. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="text-left">
      <h3 className="text-xl font-black text-textPrimary tracking-tight mb-2">
        Just one more step
      </h3>
      <p className="text-sm text-textMuted mb-6">
        Please provide your phone number so sellers can contact you easily.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
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
