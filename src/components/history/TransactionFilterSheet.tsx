import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CalendarIcon, X, Check } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface TransactionFilters {
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  types: ("send" | "receive" | "swap")[];
  statuses: ("completed" | "pending" | "failed")[];
  tokens: string[];
}

interface TransactionFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: TransactionFilters;
  onApply: (filters: TransactionFilters) => void;
  availableTokens: string[];
}

const defaultFilters: TransactionFilters = {
  dateFrom: undefined,
  dateTo: undefined,
  types: [],
  statuses: [],
  tokens: [],
};

export const TransactionFilterSheet = ({
  open,
  onOpenChange,
  filters,
  onApply,
  availableTokens,
}: TransactionFilterSheetProps) => {
  const [localFilters, setLocalFilters] = useState<TransactionFilters>(filters);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setLocalFilters(filters);
    }
    onOpenChange(isOpen);
  };

  const handleApply = () => {
    onApply(localFilters);
    onOpenChange(false);
  };

  const handleReset = () => {
    setLocalFilters(defaultFilters);
  };

  const toggleType = (type: "send" | "receive" | "swap") => {
    setLocalFilters((prev) => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter((t) => t !== type)
        : [...prev.types, type],
    }));
  };

  const toggleStatus = (status: "completed" | "pending" | "failed") => {
    setLocalFilters((prev) => ({
      ...prev,
      statuses: prev.statuses.includes(status)
        ? prev.statuses.filter((s) => s !== status)
        : [...prev.statuses, status],
    }));
  };

  const toggleToken = (token: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      tokens: prev.tokens.includes(token)
        ? prev.tokens.filter((t) => t !== token)
        : [...prev.tokens, token],
    }));
  };

  const hasActiveFilters = 
    localFilters.dateFrom || 
    localFilters.dateTo || 
    localFilters.types.length > 0 || 
    localFilters.statuses.length > 0 || 
    localFilters.tokens.length > 0;

  return (
    <Sheet open={open} onOpenChange={handleOpen}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="text-left pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle>Filter Transactions</SheetTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={handleReset} className="text-muted-foreground">
                <X className="w-4 h-4 mr-1" />
                Reset
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="space-y-6 overflow-y-auto max-h-[calc(85vh-180px)] pb-4">
          {/* Date Range */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Date Range</Label>
            <div className="flex gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !localFilters.dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {localFilters.dateFrom ? format(localFilters.dateFrom, "MMM d, yyyy") : "From"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50" align="start">
                  <Calendar
                    mode="single"
                    selected={localFilters.dateFrom}
                    onSelect={(date) => setLocalFilters((prev) => ({ ...prev, dateFrom: date }))}
                    disabled={(date) => date > new Date() || (localFilters.dateTo && date > localFilters.dateTo)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !localFilters.dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {localFilters.dateTo ? format(localFilters.dateTo, "MMM d, yyyy") : "To"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50" align="start">
                  <Calendar
                    mode="single"
                    selected={localFilters.dateTo}
                    onSelect={(date) => setLocalFilters((prev) => ({ ...prev, dateTo: date }))}
                    disabled={(date) => date > new Date() || (localFilters.dateFrom && date < localFilters.dateFrom)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Transaction Type */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Transaction Type</Label>
            <div className="flex flex-wrap gap-2">
              {(["send", "receive", "swap"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-colors border",
                    localFilters.types.includes(type)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border text-muted-foreground hover:border-primary/50"
                  )}
                >
                  {type === "send" && "↗ Send"}
                  {type === "receive" && "↙ Receive"}
                  {type === "swap" && "⇄ Swap"}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Status</Label>
            <div className="flex flex-wrap gap-2">
              {(["completed", "pending", "failed"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => toggleStatus(status)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-colors border",
                    localFilters.statuses.includes(status)
                      ? status === "completed"
                        ? "bg-green-500 text-white border-green-500"
                        : status === "pending"
                        ? "bg-amber-500 text-white border-amber-500"
                        : "bg-destructive text-destructive-foreground border-destructive"
                      : "bg-card border-border text-muted-foreground hover:border-primary/50"
                  )}
                >
                  {status === "completed" && "✓ Completed"}
                  {status === "pending" && "◔ Pending"}
                  {status === "failed" && "✕ Failed"}
                </button>
              ))}
            </div>
          </div>

          {/* Token */}
          {availableTokens.length > 0 && (
            <div>
              <Label className="text-sm font-medium mb-3 block">Token</Label>
              <div className="space-y-2">
                {availableTokens.map((token) => (
                  <div
                    key={token}
                    onClick={() => toggleToken(token)}
                    className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border cursor-pointer hover:border-primary/30 transition-colors"
                  >
                    <Checkbox
                      checked={localFilters.tokens.includes(token)}
                      onCheckedChange={() => toggleToken(token)}
                    />
                    <span className="font-medium">{token}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Apply Button */}
        <div className="pt-4 border-t border-border space-y-3">
          <Button onClick={handleApply} className="w-full h-12">
            <Check className="w-4 h-4 mr-2" />
            Apply Filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
