import React from "react";
import { Conversation } from "../types";
import { formatPrice } from "@/lib/mock-data";
import { ExternalLink, Tag } from "lucide-react";
import { Link } from "react-router-dom";

interface ChatContextCardProps {
  context: Conversation['context'];
}

export const ChatContextCard: React.FC<ChatContextCardProps> = ({ context }) => {
  if (!context) return null;

  const routeType = context.type === 'service' ? 'service' : 'product';

  return (
    <div className="mx-4 my-2 p-3 bg-surface border border-black/5 rounded-2xl flex items-center gap-3 shadow-sm hover:shadow-md transition-all group">
      <div className="h-12 w-12 rounded-xl bg-muted overflow-hidden shrink-0 border border-black/5">
        {context.image && <img src={context.image} alt="" className="h-full w-full object-cover" />}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Tag className="h-3 w-3 text-primary" />
          <span className="text-[9px] font-black uppercase tracking-widest text-primary">Discussing</span>
        </div>
        <h4 className="text-xs font-black text-textPrimary truncate uppercase tracking-tighter">{context.title}</h4>
        {context.price && (
          <p className="text-[10px] font-bold text-textSecondary">{formatPrice(context.price)}</p>
        )}
      </div>

      <Link 
        to={`/${routeType}/${context.id}`} 
        className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-textSecondary hover:bg-primary/10 hover:text-primary transition-colors"
      >
        <ExternalLink className="h-4 w-4" />
      </Link>
    </div>
  );
};
