import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

interface SearchBarProps {
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export function SearchBar({ value = "", onChange, onSubmit, placeholder = "What are you looking for today?", className = "", autoFocus = false }: SearchBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [localValue, setLocalValue] = useState(value);

  // Sync with prop value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced navigation/update
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue === value) return;

      if (localValue.trim()) {
        if (location.pathname !== "/marketplace") {
          navigate(`/marketplace?search=${encodeURIComponent(localValue.trim())}`);
        } else {
          onChange?.(localValue);
        }
      } else if (value && !localValue.trim()) {
        onChange?.("");
      }
    }, 500);

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
          onChange?.(val);
        }
      }
      onSubmit?.(localValue);
    }
  };

  return (
    <div className={`relative w-full group ${className}`}>
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
        <Search className="h-5 w-5 text-textMuted/50 group-focus-within:text-primary transition-all duration-300" />
      </div>
      <input
        type="text"
        value={localValue}
        autoFocus={autoFocus}
        onChange={(e) => setLocalValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="h-full w-full rounded-[inherit] border-none bg-transparent pl-12 pr-10 text-sm md:text-base font-medium text-textPrimary placeholder:text-textMuted/40 focus:ring-0 outline-none normal-case tracking-normal"
        onClick={() => {
          if (location.pathname === "/") {
            const event = new KeyboardEvent('keydown', {
              key: 'k',
              metaKey: true,
              bubbles: true
            });
            document.dispatchEvent(event);
          }
        }}
      />
      {localValue && (
        <button
          onClick={() => {
            setLocalValue("");
            onChange?.("");
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted hover:text-destructive transition-all p-1.5 rounded-xl hover:bg-destructive/5 active:scale-90"
        >
          <X className="h-4 w-4 stroke-[3px]" />
        </button>
      )}
    </div>
  );
}
