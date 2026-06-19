import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/mock-data";
import { Loader2, CreditCard, ShieldCheck, CheckCircle2, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePaystackPayment } from 'react-paystack';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { PAYSTACK_PUBLIC_KEY } from '@/lib/config';
import { toast } from 'sonner';

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    title: string;
    price: number;
    image: string;
    ownerName: string;
  };
}

export function PurchaseModal({ isOpen, onClose, product }: PurchaseModalProps) {
  const [step, setStep] = useState<'details' | 'payment' | 'success'>('details');
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();

  // Paystack Configuration
  const config = {
    reference: (new Date()).getTime().toString(),
    email: user?.email || "guest@siyayya.com",
    amount: product.price * 100, // Paystack uses Kobo (100 kobo = 1 Naira)
    publicKey: PAYSTACK_PUBLIC_KEY,
    metadata: {
      custom_fields: [
        {
          display_name: "Item Title",
          variable_name: "item_title",
          value: product.title
        }
      ]
    }
  };

  const initializePayment = usePaystackPayment(config);

  const onSuccess = (reference: any) => {
    console.log("[Paystack] Payment Successful:", reference);
    setIsProcessing(false);
    setStep('success');
    toast.success("Payment verified successfully!");
  };

  const onClosePaystack = () => {
    console.log("[Paystack] Payment Closed");
    setIsProcessing(false);
    toast.error("Payment was cancelled.");
  };

  const handlePayment = () => {
    if (!user) {
      toast.error("Please sign in to complete your purchase.");
      return;
    }
    setIsProcessing(true);
    initializePayment({ onSuccess, onClose: onClosePaystack });
  };

  const resetAndClose = () => {
    onClose();
    setTimeout(() => setStep('details'), 300);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && resetAndClose()}>
      <DialogContent className="sm:max-w-[420px] rounded-[2.5rem] border-black/5 bg-surface p-0 overflow-hidden shadow-2xl">
        <AnimatePresence mode="wait">
          {step === 'details' && (
            <motion.div 
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8"
            >
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-textPrimary tracking-tighter italic uppercase">Review Purchase</DialogTitle>
                <DialogDescription className="text-textSecondary font-medium">
                  Securely reserve this item through Siyayya.
                </DialogDescription>
              </DialogHeader>

              <div className="mt-8 flex gap-4 p-4 rounded-2xl bg-muted/30 border border-black/5">
                <img src={product.image} alt={product.title} className="h-20 w-20 rounded-xl object-cover" />
                <div className="flex flex-col justify-center">
                  <h4 className="font-black text-textPrimary text-sm line-clamp-1">{product.title}</h4>
                  <p className="text-primary font-black text-lg">{formatPrice(product.price)}</p>
                  <p className="text-[9px] font-bold text-textSecondary uppercase tracking-widest opacity-60">Seller: {product.ownerName}</p>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <div className="flex items-center gap-3 text-xs text-textSecondary font-medium">
                  <ShieldCheck className="h-4 w-4 text-success" />
                  <span>Your payment is held in escrow until you meet.</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-textSecondary font-medium">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span>Full refund if the item isn't as described.</span>
                </div>
              </div>

              <DialogFooter className="mt-8">
                <Button 
                  onClick={() => setStep('payment')}
                  className="w-full h-14 btn-premium text-white font-black uppercase tracking-widest rounded-2xl group"
                >
                  Proceed to Payment
                  <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </DialogFooter>
            </motion.div>
          )}

          {step === 'payment' && (
            <motion.div 
              key="payment"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8"
            >
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-textPrimary tracking-tighter italic uppercase">Payment Method</DialogTitle>
                <DialogDescription className="text-textSecondary font-medium">
                  Pay via Paystack Secure Checkout.
                </DialogDescription>
              </DialogHeader>

              <div className="mt-8 space-y-3">
                <button className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-primary bg-primary/5 transition-all">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <span className="font-black text-textPrimary text-sm">Card / Bank Transfer</span>
                  </div>
                  <div className="h-4 w-4 rounded-full border-4 border-primary" />
                </button>
                <button className="w-full flex items-center justify-between p-4 rounded-2xl border border-black/5 bg-muted/20 opacity-50 cursor-not-allowed">
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 flex items-center justify-center font-black text-xs text-textMuted">K</div>
                    <span className="font-black text-textMuted text-sm">Kuda / OPay</span>
                  </div>
                </button>
              </div>

              <DialogFooter className="mt-8">
                <Button 
                  onClick={handlePayment}
                  disabled={isProcessing}
                  className="w-full h-14 bg-black hover:bg-black/90 text-white font-black uppercase tracking-widest rounded-2xl"
                >
                  {isProcessing ? (
                    <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Processing...</>
                  ) : (
                    `Pay ${formatPrice(product.price)}`
                  )}
                </Button>
              </DialogFooter>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-12 text-center"
            >
              <div className="mx-auto h-20 w-20 rounded-full bg-success/10 flex items-center justify-center mb-6">
                <CheckCircle2 className="h-10 w-10 text-success" />
              </div>
              <h2 className="text-2xl font-black text-textPrimary tracking-tighter italic uppercase mb-2">Reservation Confirmed!</h2>
              <p className="text-sm text-textSecondary font-medium mb-8">
                The item is now reserved for you. We've notified {product.ownerName} to arrange the meeting.
              </p>
              <Button 
                onClick={resetAndClose}
                className="w-full h-14 bg-success hover:bg-success/90 text-white font-black uppercase tracking-widest rounded-2xl"
              >
                Done
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
