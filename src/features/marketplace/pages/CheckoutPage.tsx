import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { formatPrice } from '@/lib/mock-data';
import { usePaystackPayment } from 'react-paystack';
import { PAYSTACK_PUBLIC_KEY } from '@/lib/config';
import { toast } from 'sonner';
import { createOrder } from '../services/orderService';
import { Loader2, ArrowLeft, CheckCircle2, ShoppingBag, ShieldCheck, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CheckoutPage() {
  const { user } = useAuth();
  const { items, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();
  
  const [step, setStep] = useState<'details' | 'payment' | 'success'>('details');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState<string>('');
  
  const [buyerDetails, setBuyerDetails] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: '',
    instructions: ''
  });

  useEffect(() => {
    if (items.length === 0 && step !== 'success') {
      navigate('/marketplace');
    }
  }, [items, navigate, step]);

  const config = {
    reference: paymentReference,
    email: user?.email || "guest@siyayya.com",
    amount: totalPrice * 100,
    publicKey: PAYSTACK_PUBLIC_KEY,
    metadata: {
      order_id: pendingOrderId,
      custom_fields: [
        {
          display_name: "Cart Purchase",
          variable_name: "cart_purchase",
          value: `Order for ${items.length} items`
        }
      ]
    }
  };

  const initializePayment = usePaystackPayment(config);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setBuyerDetails(prev => ({ ...prev, [name]: value }));
  };

  const proceedToPayment = async () => {
    setIsProcessing(true);
    try {
      const freshReference = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const orderId = await createOrder({
        buyerId: user?.id || 'guest',
        buyerName: buyerDetails.name,
        buyerEmail: user?.email || 'guest@siyayya.com',
        buyerPhone: buyerDetails.phone,
        shippingAddress: buyerDetails.address,
        deliveryInstructions: buyerDetails.instructions,
        items,
        totalAmount: totalPrice,
        paymentReference: freshReference,
        status: 'pending'
      });
      setPaymentReference(freshReference);
      setPendingOrderId(orderId);
      setStep('payment');
    } catch (error) {
      console.error("Failed to create pending order:", error);
      toast.error("Failed to initialize order. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const onSuccess = (reference: any) => {
    // We don't update firestore here. The webhook will handle it.
    clearCart();
    setStep('success');
    toast.success("Payment successful! Waiting for confirmation...");
  };

  const onClosePaystack = () => {
    setIsProcessing(false);
    toast.error("Payment was cancelled.");
  };

  const handlePayment = () => {
    setIsProcessing(true);
    initializePayment({ onSuccess, onClose: onClosePaystack });
  };

  if (items.length === 0 && step !== 'success') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      
      <div className="container max-w-4xl py-8">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {step === 'details' && (
                <motion.div
                  key="details"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-surface border border-black/5 rounded-[2.5rem] p-8 shadow-sm"
                >
                  <h2 className="text-2xl font-black italic tracking-tighter text-textPrimary mb-6 uppercase">Delivery Details</h2>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-textSecondary uppercase tracking-widest">Full Name</label>
                      <Input name="name" value={buyerDetails.name} onChange={handleInputChange} placeholder="John Doe" className="h-12 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-textSecondary uppercase tracking-widest">Phone Number</label>
                      <Input name="phone" value={buyerDetails.phone} onChange={handleInputChange} placeholder="08012345678" className="h-12 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-textSecondary uppercase tracking-widest">Delivery Address</label>
                      <Textarea name="address" value={buyerDetails.address} onChange={handleInputChange} placeholder="Enter your full campus address or hostel" className="min-h-[100px] rounded-xl resize-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-textSecondary uppercase tracking-widest">Special Instructions (Optional)</label>
                      <Textarea name="instructions" value={buyerDetails.instructions} onChange={handleInputChange} placeholder="Any specific instructions for delivery?" className="min-h-[80px] rounded-xl resize-none" />
                    </div>
                  </div>

                  <Button 
                    onClick={proceedToPayment}
                    disabled={!buyerDetails.name || !buyerDetails.phone || !buyerDetails.address || isProcessing}
                    className="w-full h-14 bg-black hover:bg-black/90 text-white rounded-2xl uppercase tracking-widest text-[10px] font-black mt-8 shadow-xl"
                  >
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Continue to Payment"}
                  </Button>
                </motion.div>
              )}

              {step === 'payment' && (
                <motion.div
                  key="payment"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-surface border border-black/5 rounded-[2.5rem] p-8 shadow-sm"
                >
                  <h2 className="text-2xl font-black italic tracking-tighter text-textPrimary mb-6 uppercase">Payment Method</h2>
                  
                  <div className="space-y-4">
                    <button className="w-full flex items-center justify-between p-5 rounded-2xl border-2 border-primary bg-primary/5 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                          <CreditCard className="h-5 w-5 text-primary" />
                        </div>
                        <div className="text-left">
                          <span className="font-black text-textPrimary block">Card / Bank Transfer</span>
                          <span className="text-[10px] text-textSecondary font-bold uppercase tracking-widest">Secured by Paystack</span>
                        </div>
                      </div>
                      <div className="h-5 w-5 rounded-full border-4 border-primary" />
                    </button>
                    
                    <div className="flex items-center gap-3 text-xs text-textSecondary font-medium mt-6 bg-success/10 text-success p-4 rounded-2xl">
                      <ShieldCheck className="h-5 w-5 shrink-0" />
                      <span>Your payment is held securely in escrow until all items are delivered and verified.</span>
                    </div>
                  </div>

                  <Button 
                    onClick={handlePayment}
                    disabled={isProcessing}
                    className="w-full h-14 bg-black hover:bg-black/90 text-white rounded-2xl uppercase tracking-widest text-[10px] font-black mt-8 shadow-xl"
                  >
                    {isProcessing ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing...</>
                    ) : (
                      `Pay ${formatPrice(totalPrice)} Securely`
                    )}
                  </Button>
                </motion.div>
              )}

              {step === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-surface border border-black/5 rounded-[2.5rem] p-12 text-center shadow-sm"
                >
                  <div className="mx-auto h-24 w-24 rounded-full bg-success/10 flex items-center justify-center mb-6">
                    <CheckCircle2 className="h-12 w-12 text-success" />
                  </div>
                  <h2 className="text-3xl font-black text-textPrimary tracking-tighter italic uppercase mb-3">Order Confirmed!</h2>
                  <p className="text-textSecondary font-medium mb-8 max-w-md mx-auto">
                    Your payment was successful and your order has been placed. We've notified the seller(s).
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button 
                      onClick={() => navigate('/orders')}
                      className="h-14 bg-black text-white px-8 rounded-2xl uppercase tracking-widest text-[10px] font-black"
                    >
                      View Order Status
                    </Button>
                    <Button 
                      onClick={() => navigate('/marketplace')}
                      variant="outline"
                      className="h-14 px-8 rounded-2xl uppercase tracking-widest text-[10px] font-black border-black/10"
                    >
                      Continue Shopping
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="lg:col-span-5">
            {step !== 'success' && (
              <div className="bg-surface border border-black/5 rounded-[2.5rem] p-6 sm:p-8 shadow-sm sticky top-28">
                <h3 className="text-lg font-black italic tracking-tighter text-textPrimary mb-6 flex items-center gap-2 uppercase">
                  <ShoppingBag className="h-5 w-5 text-primary" /> Order Summary
                </h3>
                
                <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                  {items.map(item => (
                    <div key={item.id} className="flex gap-4">
                      <div className="h-16 w-16 rounded-xl bg-muted overflow-hidden shrink-0">
                        <img src={item.images?.[0] || item.image} alt={item.title} className="h-full w-full object-cover" />
                      </div>
                      <div className="flex-1 flex flex-col justify-center">
                        <p className="font-bold text-sm text-textPrimary line-clamp-1">{item.title}</p>
                        <p className="text-[10px] font-black text-textSecondary uppercase tracking-widest">Qty: {item.quantity}</p>
                        <p className="font-black text-primary mt-1">{formatPrice(item.price * item.quantity)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 pt-6 border-t border-black/5">
                  <div className="flex justify-between text-sm font-medium text-textSecondary">
                    <span>Subtotal</span>
                    <span>{formatPrice(totalPrice)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium text-textSecondary">
                    <span>Platform Fee (Escrow)</span>
                    <span className="text-success font-black">Free</span>
                  </div>
                  <div className="flex justify-between text-xl font-black text-textPrimary pt-4 border-t border-black/5">
                    <span>Total</span>
                    <span className="text-primary">{formatPrice(totalPrice)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
