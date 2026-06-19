import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { useCart } from '@/features/marketplace/contexts/CartContext';
import { formatPrice } from '@/lib/mock-data';
import { MediaRenderer } from '@/components/MediaRenderer';

export function CartSidebar() {
  const { items, isCartOpen, setIsCartOpen, updateQuantity, removeFromCart, totalPrice } = useCart();
  const navigate = useNavigate();

  return (
    <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="p-6 border-b border-black/5 bg-surface">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <ShoppingBag className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-xl font-black italic tracking-tighter text-textPrimary">Your Cart</SheetTitle>
              <SheetDescription className="text-xs font-bold uppercase tracking-widest text-textSecondary/60 mt-1">
                {items.length} {items.length === 1 ? 'Item' : 'Items'}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
              <ShoppingBag className="h-16 w-16 text-textMuted" />
              <div>
                <p className="font-black text-textPrimary text-lg">Your cart is empty</p>
                <p className="text-sm font-medium text-textSecondary mt-1">Add items to start shopping</p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => setIsCartOpen(false)}
                className="mt-4 rounded-2xl h-12 uppercase text-[10px] tracking-widest font-black"
              >
                Browse Marketplace
              </Button>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex gap-4 p-4 rounded-2xl border border-black/5 bg-surface shadow-sm">
                <div className="h-20 w-20 shrink-0 rounded-xl overflow-hidden bg-muted">
                  <MediaRenderer 
                    url={item.images?.[0] || item.image} 
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-textPrimary line-clamp-1">{item.title}</h3>
                    <p className="text-xs font-bold text-textSecondary/60 uppercase tracking-widest mt-1">
                      {item.category}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="font-black text-primary">{formatPrice(item.price)}</p>
                    
                    <div className="flex items-center gap-3 bg-muted/50 rounded-full px-2 py-1">
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="h-6 w-6 rounded-full bg-surface shadow-sm flex items-center justify-center text-textSecondary hover:text-error transition-colors"
                      >
                        {item.quantity === 1 ? <Trash2 className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                      </button>
                      <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="h-6 w-6 rounded-full bg-surface shadow-sm flex items-center justify-center text-textSecondary hover:text-success transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="p-6 border-t border-black/5 bg-surface">
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm font-medium text-textSecondary">
                <span>Subtotal</span>
                <span>{formatPrice(totalPrice)}</span>
              </div>
              <div className="flex justify-between text-sm font-medium text-textSecondary">
                <span>Platform Fee (Escrow)</span>
                <span>Free</span>
              </div>
              <div className="flex justify-between text-lg font-black text-textPrimary pt-3 border-t border-black/5">
                <span>Total</span>
                <span className="text-primary">{formatPrice(totalPrice)}</span>
              </div>
            </div>
            <Button 
              className="w-full h-14 btn-premium rounded-2xl uppercase tracking-widest text-[10px] font-black"
              onClick={() => {
                setIsCartOpen(false);
                navigate('/checkout');
              }}
            >
              Proceed to Checkout
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
