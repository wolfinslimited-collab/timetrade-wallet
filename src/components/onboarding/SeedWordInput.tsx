import { useState, useRef, useEffect } from "react";
import { Check, X } from "lucide-react";
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
          "flex items-center gap-1 rounded-xl border px-2.5 py-2 transition-all duration-200",
          "bg-muted/15 border-border/20",
          isFocused && "ring-1 ring-primary/40 border-primary/40 bg-muted/25",
          isValid && !isFocused && "border-primary/20 bg-primary/[0.04]",
          isInvalid && !isFocused && "border-destructive/20 bg-destructive/[0.04]"
        )}
      >
        <span className="text-[10px] font-mono text-muted-foreground/40 w-5 shrink-0 text-right mr-0.5">
          {index + 1}.
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
          className="flex-1 bg-transparent text-[13px] font-mono outline-none placeholder:text-muted-foreground/25 min-w-0 text-foreground/90"
          placeholder="word"
        />
        {isValid && <Check className="w-3 h-3 text-primary/60 shrink-0" />}
        {isInvalid && <X className="w-3 h-3 text-destructive/50 shrink-0" />}
      </div>

      {/* Autocomplete Dropdown */}
      {showSuggestions && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card/95 backdrop-blur-xl border border-border/30 rounded-xl shadow-xl overflow-hidden">
          {suggestions.map((suggestion, idx) => (
            <button
              key={suggestion}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleSuggestionClick(suggestion); }}
              className={cn(
                "w-full px-3 py-1.5 text-left text-[12px] font-mono hover:bg-muted/30 transition-colors",
                idx === selectedSuggestionIndex && "bg-muted/30"
              )}
            >
              <span className="text-primary/80">{value}</span>
              <span className="text-foreground/60">{suggestion.slice(value.length)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
