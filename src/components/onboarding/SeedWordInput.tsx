import { useState, useRef, useEffect } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { isValidBip39Word, getWordSuggestions } from "@/utils/seedPhrase";

interface SeedWordInputProps {
  index: number;
  value: string;
  onChange: (index: number, value: string) => void;
  onKeyDown: (index: number, e: React.KeyboardEvent) => void;
  autoFocus?: boolean;
}

export const SeedWordInput = ({
  index,
  value,
  onChange,
  onKeyDown,
  autoFocus = false,
}: SeedWordInputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const isValid = value.length > 0 && isValidBip39Word(value);
  const isInvalid = value.length > 0 && !isValidBip39Word(value);
  const showSuggestions = isFocused && suggestions.length > 0 && value.length > 0;

  useEffect(() => {
    if (value.length > 0) {
      const newSuggestions = getWordSuggestions(value, 5);
      setSuggestions(newSuggestions);
      setSelectedSuggestionIndex(0);
    } else {
      setSuggestions([]);
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toLowerCase().replace(/[^a-z]/g, "");
    onChange(index, newValue);
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(index, suggestion);
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => prev < suggestions.length - 1 ? prev + 1 : 0);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => prev > 0 ? prev - 1 : suggestions.length - 1);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        if (suggestions[selectedSuggestionIndex]) {
          e.preventDefault();
          onChange(index, suggestions[selectedSuggestionIndex]);
          setSuggestions([]);
          if (e.key === "Tab" || e.key === "Enter") {
            onKeyDown(index, { ...e, key: "Tab" } as React.KeyboardEvent);
          }
          return;
        }
      }
    }
    onKeyDown(index, e);
  };

  return (
    <div className="relative">
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border h-[44px] pl-1.5 pr-2.5 transition-colors duration-150",
          "bg-white/[0.06] border-white/10",
          isFocused && "border-primary/70 bg-white/[0.10]",
          isValid && !isFocused && "border-emerald-400/50 bg-emerald-400/[0.08]",
          isInvalid && !isFocused && "border-destructive/50 bg-destructive/[0.08]"
        )}
      >
        <span
          className={cn(
            "shrink-0 w-6 h-7 rounded-md flex items-center justify-center text-[10px] font-bold tabular-nums transition-colors",
            isFocused ? "bg-primary/25 text-primary-foreground" : "bg-white/10 text-foreground/70"
          )}
        >
          {index + 1}
        </span>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 150)}
          onKeyDown={handleKeyDown}
          autoFocus={autoFocus}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className="flex-1 bg-transparent text-[13.5px] font-medium outline-none placeholder:text-muted-foreground/35 min-w-0 text-foreground"
          placeholder="word"
        />
        {isValid && (
          <span className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
            <Check className="w-2.5 h-2.5 text-emerald-500" strokeWidth={3} />
          </span>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {showSuggestions && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-card/95 backdrop-blur-xl border border-border/40 rounded-xl shadow-2xl shadow-black/40 overflow-hidden">
          {suggestions.map((suggestion, idx) => (
            <button
              key={suggestion}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleSuggestionClick(suggestion); }}
              className={cn(
                "w-full px-3 py-2 text-left text-[12.5px] font-medium transition-colors",
                idx === selectedSuggestionIndex ? "bg-primary/10" : "hover:bg-muted/30"
              )}
            >
              <span className="text-primary">{value}</span>
              <span className="text-foreground/70">{suggestion.slice(value.length)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
