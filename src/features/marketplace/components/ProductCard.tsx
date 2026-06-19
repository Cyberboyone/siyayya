import React, { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthModal } from "@/features/auth/components/AuthModal";
import { MessageCircle, CreditCard, Image as ImageIcon } from "lucide-react";
import { useCart } from "@/features/marketplace/contexts/CartContext";
import { formatPrice } from "@/lib/mock-data";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { motion } from "framer-motion";
import { Product } from "@/lib/mock-data";
import { getOptimizedUrl } from "@/lib/cloudinary-utils";
import { chatService } from "@/features/messaging/services/chatService";
import { toast } from "sonner";
import { auth } from "@/lib/firebase";

export interface ProductCardProps {
  product: Product;
  index?: number;
  isSaved?: boolean;
  onToggleSave?: (id: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, index = 0 }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated, user: authUser } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingChat, setPendingChat] = useState(false);

  React.useEffect(() => {
    if (pendingChat && isAuthenticated && authUser) {
      setPendingChat(false);
      createChatAndNavigate();
    }
  }, [pendingChat, isAuthenticated, authUser]);

  const createChatAndNavigate = async () => {
    if (!authUser) return;
    
    if (authUser.id === product.ownerId) {
      toast.error("This is your own listing!");
      return;
    }

    try {
      // Wait for Firebase Auth SDK to fully propagate the token to Firestore
      // This prevents "Missing or insufficient permissions" on fresh logins
      let waited = 0;
      while (!auth.currentUser && waited < 3000) {
        await new Promise(r => setTimeout(r, 200));
        waited += 200;
      }
      if (!auth.currentUser) {
        toast.error("Authentication is still loading. Please try again.");
        return;
      }

      const conversationId = await chatService.getOrCreateConversation(
        [
          {
            uid: authUser.id,
            displayName: authUser.name || "Student",
            photoURL: authUser.photoUrl || authUser.avatar || ""
          },
          {
            uid: product.ownerId,
            displayName: product.ownerName || "Seller",
            photoURL: product.ownerAvatar || product.ownerPhoto || ""
          }
        ],
        {
          type: 'product',
          id: product.id || product._id || '',
          title: product.title,
          image: product.images?.[0] || product.image,
          price: product.price
        }
      );
      navigate(`/messages/${conversationId}`);
    } catch (error: any) {
      console.error("Error opening chat:", error);
      if (error?.code === 'permission-denied' || error?.message?.includes('permissions')) {
        toast.error("Please try clicking Chat again — your login is still syncing.");
      } else {
        toast.error("Could not open chat");
      }
      navigate(`/messages`);
    }
  };

  const handleChatSeller = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated || !authUser) {
      setPendingChat(true);
      setShowAuthModal(true);
      return;
    }
    
    createChatAndNavigate();
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
    navigate(`/checkout?product=${product.id || product._id}`);
  };

  return (
    <motion.div
      ref={cardRef}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ 
        duration: 0.4, 
        delay: index * 0.05,
        ease: [0.16, 1, 0.3, 1]
      }}
      whileHover={{ y: -8 }}
      className="group relative rounded-2xl md:rounded-3xl overflow-hidden bg-white dark:bg-surface border border-black/5 flex flex-col h-full transition-shadow duration-500 hover:shadow-lg hover:shadow-[0_30px_60px_rgba(0,0,0,0.1)] pb-2"
    >
      <Link
        to={`/product/${product.id || product._id}`}
        className={`flex flex-col flex-grow ${product.isSold ? "opacity-60 grayscale-[0.5]" : ""}`}
      >
        <div className="relative aspect-[4/5] sm:aspect-square w-full overflow-hidden bg-muted/20">
          <motion.img
            src={getOptimizedUrl(product.image, { width: 500 })}
            alt={product.title}
            crossOrigin="anonymous"
            className="h-full w-full object-cover"
            loading="lazy"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          {product.isSold && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
              <span className="rounded-full bg-white px-4 py-1.5 text-[10px] font-black tracking-widest text-black shadow-xl">SOLD</span>
            </div>
          )}

          <div className="absolute top-3 left-3 flex items-center gap-2 text-white drop-shadow-md">
            <div className="h-6 w-6 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-[10px] font-black">
              {product.ownerName?.charAt(0)}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-black uppercase tracking-widest truncate max-w-[100px]">{product.ownerName}</span>
            </div>
          </div>
        </div>
        
        <div className="px-2 pt-2 pb-1 flex flex-col flex-grow">
          <h3 className="text-xs font-bold text-textPrimary leading-tight group-hover:text-primary transition-colors duration-300 line-clamp-2 mb-1">
            {product.title}
          </h3>
          
          <div className="mt-1">
            <p className="text-sm font-black text-textPrimary tabular-nums tracking-tighter leading-none">
              {formatPrice(product.price)}
            </p>
          </div>
        </div>
      </Link>
      
      {/* Action Buttons */}
      <div className="px-2 pb-2 pt-1 flex gap-1 mt-auto">
        <button
          onClick={handleChatSeller}
          className="flex-1 h-8 rounded-lg bg-primary text-white flex items-center justify-center gap-1.5 hover:bg-primary/90 active:scale-95 transition-all shadow-sm text-[9px] font-black uppercase tracking-widest"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Chat
        </button>
        <button
          onClick={handleBuyNow}
          className="flex-1 h-8 rounded-lg bg-black dark:bg-white text-white dark:text-black flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-95 transition-all shadow-sm text-[9px] font-black uppercase tracking-widest"
        >
          <CreditCard className="h-3.5 w-3.5" />
          Buy
        </button>
      </div>

      {showAuthModal && (
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => {
            setShowAuthModal(false);
            // We don't reset pendingChat here in case onSuccess hasn't triggered yet, 
            // but if they explicitly close it without auth, pendingChat will just sit harmlessly until next click.
          }} 
        />
      )}
    </motion.div>
  );
};

