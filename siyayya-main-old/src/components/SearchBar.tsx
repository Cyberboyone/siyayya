import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export function SearchBar({ value, onChange, onSubmit, placeholder = "Search marketplace...", className = "", autoFocus = false }: SearchBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [localValue, setLocalValue] = useState(value);

  // Sync with prop value (e.g. from URL in Marketplace)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced navigation/update
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue === value) return; // Already synced or no change

      if (localValue.trim()) {
        if (location.pathname !== "/marketplace") {
          navigate(`/marketplace?search=${encodeURIComponent(localValue.trim())}`);
        } else {
          // If on marketplace, let the parent handle the update via onChange
          onChange(localValue);
        }
      } else if (value && !localValue.trim()) {
        // Handle clear
        onChange("");
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localValue, location.pathname, navigate, onChange, value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = localValue.trim();
      if (val) {
        if (location.pathname !== "/marketplace") {
          navigate(`/marketplace?search=${encodeURIComponent(val)}`);
        } else {
          onChange(val);
        }
      }
      onSubmit?.(localValue);
    }
  };

  return (
    <div className={`relative w-full max-w-xl mx-auto group ${className}`}>
      <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-textMuted group-focus-within:text-primary transition-colors duration-200" />
      <input
        type="text"
        value={localValue}
        autoFocus={autoFocus}
        onChange={(e) => setLocalValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="h-14 w-full rounded-full border-2 border-black/5 bg-surface pl-12 pr-12 text-base font-medium text-textPrimary shadow-sm placeholder:text-textMuted/60 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-200"
      />
      {localValue && (
        <button
          onClick={() => {
            setLocalValue("");
            onChange("");
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-textMuted hover:text-textPrimary transition-colors p-1"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
