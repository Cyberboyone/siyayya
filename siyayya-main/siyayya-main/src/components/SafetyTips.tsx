import React from 'react';
import { ShieldCheck, Info, MapPin, Eye, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export function SafetyTips() {
  const tips = [
    {
      icon: MapPin,
      title: "Public Meetings",
      desc: "Always meet in crowded campus areas (Library, Gate, or Cafeteria)."
    },
    {
      icon: Eye,
      title: "Inspect First",
      desc: "Check the item thoroughly before handing over any money."
    },
    {
      icon: Zap,
      title: "No Upfront Pay",
      desc: "Never pay before seeing the item. Use our secure reservation if available."
    }
  ];

  return (
    <div className="mt-8 overflow-hidden rounded-[2rem] border border-primary/10 bg-primary/5 p-6 md:p-8 relative group">
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-32 h-32 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors duration-700" />
      
      <div className="relative flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/20 rounded-xl">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <h3 className="text-sm font-black text-primary uppercase tracking-[0.2em] italic">Safety Guidelines</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
        {tips.map((tip, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="space-y-2"
          >
            <div className="flex items-center gap-2">
              <tip.icon className="h-3.5 w-3.5 text-primary/60" />
              <h4 className="text-[10px] font-black text-textPrimary uppercase tracking-widest">{tip.title}</h4>
            </div>
            <p className="text-[11px] leading-relaxed text-textSecondary font-medium">
              {tip.desc}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-primary/10 flex items-center gap-2">
        <Info className="h-3 w-3 text-primary/40" />
        <p className="text-[9px] font-bold text-primary/60 uppercase tracking-widest">
          Siyayya never asks for your password or OTP.
        </p>
      </div>
    </div>
  );
}
