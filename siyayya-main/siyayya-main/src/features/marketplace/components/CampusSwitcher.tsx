import React, { useState } from "react";
import { MapPin, ChevronDown, Globe, Navigation, Building2, Search, X } from "lucide-react";
import { getNorthernCampuses, Campus } from "@/lib/campus";
import { FeedMode } from "@/hooks/useNearbyProducts";
import { motion, AnimatePresence } from "framer-motion";

interface CampusSwitcherProps {
  currentMode: FeedMode;
  nearestCampusName?: string;
  selectedCampusName?: string;
  onModeChange: (mode: FeedMode) => void;
  onCampusSelect: (campusId: string) => void;
}

const modeConfig = {
  nearby: { icon: Navigation, label: "Nearby", color: "text-emerald-500" },
  campus: { icon: Building2, label: "Campus", color: "text-primary" },
  nationwide: { icon: Globe, label: "Nationwide", color: "text-amber-500" },
};

export const CampusSwitcher: React.FC<CampusSwitcherProps> = ({
  currentMode,
  nearestCampusName,
  selectedCampusName,
  onModeChange,
  onCampusSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showCampusList, setShowCampusList] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const campuses = getNorthernCampuses();
  const filteredCampuses = campuses.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.shortName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentConfig = modeConfig[currentMode];
  const ModeIcon = currentConfig.icon;

  const displayLabel =
    currentMode === "campus" && selectedCampusName
      ? selectedCampusName
      : currentMode === "nearby" && nearestCampusName
      ? `Near ${nearestCampusName}`
      : currentConfig.label;

  const handleModeSelect = (mode: FeedMode) => {
    if (mode === "campus") {
      setShowCampusList(true);
      return;
    }
    onModeChange(mode);
    setIsOpen(false);
    setShowCampusList(false);
  };

  const handleCampusSelect = (campus: Campus) => {
    onCampusSelect(campus.id);
    onModeChange("campus");
    setIsOpen(false);
    setShowCampusList(false);
    setSearchQuery("");
  };

  return (
    <div className="relative" id="campus-switcher">
      {/* Trigger Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setShowCampusList(false);
        }}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-surface border border-black/5 dark:border-white/10 shadow-sm hover:shadow-md transition-all duration-300 group"
      >
        <div className={`flex items-center gap-2 ${currentConfig.color}`}>
          <ModeIcon className="h-4 w-4" />
          <span className="text-xs font-bold tracking-wide">{displayLabel}</span>
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 text-textMuted transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => {
                setIsOpen(false);
                setShowCampusList(false);
              }}
            />

            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="absolute top-full right-0 mt-2 z-50 w-72 max-w-[calc(100vw-2rem)] rounded-2xl bg-white dark:bg-surface border border-black/5 dark:border-white/10 shadow-2xl overflow-hidden origin-top-right"
            >
              {!showCampusList ? (
                // Mode Selection
                <div className="p-2">
                  <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-textMuted">
                    Browse Mode
                  </p>
                  {(["nearby", "campus", "nationwide"] as FeedMode[]).map((mode) => {
                    const config = modeConfig[mode];
                    const Icon = config.icon;
                    const isActive = currentMode === mode;
                    return (
                      <button
                        key={mode}
                        onClick={() => handleModeSelect(mode)}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted/50 text-textPrimary"
                        }`}
                      >
                        <div
                          className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                            isActive
                              ? "bg-primary/20"
                              : "bg-muted/50"
                          }`}
                        >
                          <Icon className={`h-4 w-4 ${isActive ? config.color : "text-textMuted"}`} />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold">
                            {mode === "nearby"
                              ? "Nearby Campuses"
                              : mode === "campus"
                              ? "Specific University"
                              : "Nationwide"}
                          </p>
                          <p className="text-[10px] text-textMuted">
                            {mode === "nearby"
                              ? "Products near your location"
                              : mode === "campus"
                              ? "Browse a specific campus"
                              : "All northern campuses"}
                          </p>
                        </div>
                        {isActive && (
                          <div className="ml-auto h-2 w-2 rounded-full bg-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                // Campus Selection List
                <div>
                  <div className="p-3 border-b border-black/5 dark:border-white/10">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowCampusList(false)}
                        className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted/50 transition-colors"
                      >
                        <ChevronDown className="h-4 w-4 rotate-90 text-textMuted" />
                      </button>
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-textMuted" />
                        <input
                          type="text"
                          placeholder="Search university..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-8 py-2 rounded-xl bg-muted/50 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-textMuted/50"
                          autoFocus
                        />
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2"
                          >
                            <X className="h-3.5 w-3.5 text-textMuted" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto p-2 scrollbar-none">
                    {filteredCampuses.length === 0 ? (
                      <p className="text-center py-6 text-xs text-textMuted">
                        No universities found
                      </p>
                    ) : (
                      filteredCampuses.map((campus) => (
                        <button
                          key={campus.id}
                          onClick={() => handleCampusSelect(campus)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors text-left"
                        >
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <span className="text-[10px] font-black text-primary">
                              {campus.shortName.slice(0, 3)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-textPrimary truncate">
                              {campus.shortName}
                            </p>
                            <p className="text-[10px] text-textMuted truncate">
                              {campus.name} • {campus.location}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
