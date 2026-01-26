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
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const isValid = value.length > 0 && isValidBip39Word(value);
  const isInvalid = value.length > 0 && !isValidBip39Word(value);
  const showSuggestions = isFocused && suggestions.length > 0 && value.length > 0;

  useEffect(() => {
    if (value.length > 0) {
      const newSuggestions = getWordSuggestions(value, 6);
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
        setSelectedSuggestionIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        if (suggestions[selectedSuggestionIndex]) {
          e.preventDefault();
          onChange(index, suggestions[selectedSuggestionIndex]);
          setSuggestions([]);
          // Move to next input on Tab or Enter
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
          "flex items-center gap-1.5 rounded-lg border bg-card px-2 py-1.5 transition-all",
          isFocused && "ring-2 ring-primary/50 border-primary",
          isValid && !isFocused && "border-primary/50 bg-primary/5",
          isInvalid && !isFocused && "border-destructive/50 bg-destructive/5"
        )}
      >
        <span className="text-xs text-muted-foreground w-5 shrink-0">
          {index + 1}.
        </span>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            // Delay to allow click on suggestion
            setTimeout(() => setIsFocused(false), 150);
          }}
          onKeyDown={handleKeyDown}
          autoFocus={autoFocus}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className="flex-1 bg-transparent text-sm font-mono outline-none placeholder:text-muted-foreground/50 min-w-0"
          placeholder="word"
        />
        {isValid && (
          <Check className="w-3.5 h-3.5 text-primary shrink-0" />
        )}
        {isInvalid && (
          <X className="w-3.5 h-3.5 text-destructive shrink-0" />
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {showSuggestions && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden"
        >
          {suggestions.map((suggestion, idx) => (
            <button
              key={suggestion}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSuggestionClick(suggestion);
              }}
              className={cn(
                "w-full px-3 py-1.5 text-left text-sm font-mono hover:bg-accent transition-colors",
                idx === selectedSuggestionIndex && "bg-accent"
              )}
            >
              <span className="text-primary">{value}</span>
              <span>{suggestion.slice(value.length)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
