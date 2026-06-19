import React from "react";

export function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin shadow-lg shadow-primary/20"></div>
        <p className="text-sm font-black text-textPrimary uppercase tracking-widest animate-pulse">
          Initializing Siyayya...
        </p>
      </div>
    </div>
  );
}
