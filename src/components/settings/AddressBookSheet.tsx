import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Trash2, Copy, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useSavedAddresses, type SavedAddress } from "@/hooks/useSavedAddresses";
import { getNetworkLogoUrl, type Chain } from "@/config/networks";
import { toast } from "sonner";

interface AddressBookSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CHAIN_OPTIONS: { value: SavedAddress["chain"]; label: string }[] = [
  { value: "ethereum", label: "Ethereum" },
  { value: "polygon", label: "Polygon" },
  { value: "arbitrum", label: "Arbitrum" },
  { value: "solana", label: "Solana" },
  { value: "tron", label: "Tron" },
  { value: "bitcoin", label: "Bitcoin" },
];

export const AddressBookSheet = ({ open, onOpenChange }: AddressBookSheetProps) => {
  const { addresses, saveAddress, removeAddress } = useSavedAddresses();
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newChain, setNewChain] = useState<SavedAddress["chain"]>("ethereum");

  if (!open) return null;

  const filtered = addresses.filter(
    (a) =>
      a.label.toLowerCase().includes(search.toLowerCase()) ||
      a.address.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = () => {
    if (!newLabel.trim() || !newAddress.trim()) return;
    saveAddress(newAddress, newLabel, newChain);
    setNewLabel("");
    setNewAddress("");
    setNewChain("ethereum");
    setAdding(false);
    toast.success("Address saved");
  };

  const handleCopy = (addr: string) => {
    navigator.clipboard.writeText(addr);
    toast.success("Copied to clipboard");
  };

  const handleDelete = (addr: string, chain: SavedAddress["chain"]) => {
    removeAddress(addr, chain);
    toast.success("Address removed");
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex flex-col">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
      <div className="relative flex flex-col mt-auto sm:mt-0 sm:m-auto w-full max-w-md max-h-[85vh] rounded-t-2xl sm:rounded-2xl border border-border/60 bg-card/95 backdrop-blur-md shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="text-base font-semibold text-foreground">Address Book</h3>
          <button
            onClick={() => onOpenChange(false)}
            className="w-8 h-8 rounded-xl bg-muted/50 flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Search + Add */}
        <div className="px-5 pb-3 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search addresses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 rounded-xl bg-muted/30 border-border/40 text-sm"
            />
          </div>
          <Button
            size="sm"
            onClick={() => setAdding(!adding)}
            className="h-10 px-3 rounded-xl"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Add form */}
        {adding && (
          <div className="mx-5 mb-3 p-4 rounded-xl border border-border/40 bg-muted/20 space-y-3">
            <Input
              placeholder="Label (e.g. My Binance)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="h-10 rounded-xl bg-background/60 text-sm"
            />
            <Input
              placeholder="Wallet address"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              className="h-10 rounded-xl bg-background/60 text-sm font-mono"
            />
            <div className="flex gap-1.5 flex-wrap">
              {CHAIN_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setNewChain(c.value)}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                    newChain === c.value
                      ? "bg-primary/15 border-primary/40 text-primary"
                      : "bg-muted/30 border-border/40 text-muted-foreground"
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setAdding(false)} className="flex-1 h-10 rounded-xl text-muted-foreground">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!newLabel.trim() || !newAddress.trim()} className="flex-1 h-10 rounded-xl">
                Save
              </Button>
            </div>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2">
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">
                {addresses.length === 0 ? "No saved addresses yet" : "No matches found"}
              </p>
              {addresses.length === 0 && (
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Tap + to add your first address
                </p>
              )}
            </div>
          ) : (
            filtered.map((a, i) => {
              const logoUrl = getNetworkLogoUrl(a.chain as Chain);
              return (
                <div
                  key={`${a.address}-${a.chain}-${i}`}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/30 bg-muted/15"
                >
                  <img src={logoUrl} alt={a.chain} className="w-8 h-8 rounded-full object-contain shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{a.label}</p>
                    <p className="text-[11px] text-muted-foreground font-mono truncate">{a.address}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleCopy(a.address)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted/50 transition-colors"
                      aria-label="Copy"
                    >
                      <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => handleDelete(a.address, a.chain)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-destructive/10 transition-colors"
                      aria-label="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive/70" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};