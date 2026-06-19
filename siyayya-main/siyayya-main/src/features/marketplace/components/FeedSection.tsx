import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface FeedSectionProps {
  icon: string;
  title: string;
  subtitle?: string;
  viewAllLink?: string;
  layout?: "grid" | "scroll";
  children: React.ReactNode;
  className?: string;
}

const sectionVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export const FeedSection: React.FC<FeedSectionProps> = ({
  icon,
  title,
  subtitle,
  viewAllLink,
  layout = "grid",
  children,
  className = "",
}) => {
  return (
    <motion.section
      variants={sectionVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      className={`${className}`}
    >
      {/* Section Header */}
      <div className="flex items-end justify-between mb-3 md:mb-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-[9px] font-black text-accent uppercase tracking-[0.2em]">
            <span>{icon}</span> {subtitle || title}
          </div>
          <h2 className="text-xl md:text-2xl font-black text-textPrimary tracking-tight">
            {title}
          </h2>
        </div>
        {viewAllLink && (
          <Link
            to={viewAllLink}
            className="hidden md:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-textMuted hover:text-primary transition-colors group"
          >
            View All
            <div className="h-8 w-8 rounded-full border border-black/5 dark:border-white/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>
        )}
      </div>

      {/* Content */}
      {layout === "scroll" ? (
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory -mx-4 px-4">
          {children}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 md:gap-4">
          {children}
        </div>
      )}

      {/* Mobile View All */}
      {viewAllLink && (
        <Link
          to={viewAllLink}
          className="mt-3 flex md:hidden items-center justify-center w-full h-12 rounded-2xl bg-surface border border-black/5 dark:border-white/10 text-[10px] font-black uppercase tracking-widest text-textPrimary hover:bg-primary hover:text-white transition-all"
        >
          View All {title}
        </Link>
      )}
    </motion.section>
  );
};
