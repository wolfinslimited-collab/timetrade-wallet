import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Loader2, Plus, Key, FileText, ChevronRight, ChevronLeft, Layers, Edit2, Wallet, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { toast } from "sonner";
import { validateSeedPhrase } from "@/utils/seedPhrase";
import {
  deriveEvmAddress,
  deriveSolanaAddress,
  deriveTronAddress,
  type SolanaDerivationPath,
} from "@/utils/walletDerivation";
import { decryptPrivateKey, encryptPrivateKey } from "@/utils/encryption";
import { Wallet as EthersWallet } from "ethers";
import { evmToTronAddress } from "@/utils/tronAddress";
import { setAllAddresses, clearMnemonicSession, logWalletState, WALLET_STORAGE_KEYS } from "@/utils/walletStorage";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AccountSwitcherSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type AddAccountMode = null | "menu" | "mnemonic" | "privateKey";

interface StoredAccount {
  id: string;
  name: string;
  type: "mnemonic" | "privateKey";
  // When type === "mnemonic", we must persist the encrypted mnemonic per account
  // so switching restores the correct wallet after refresh.
  encryptedSeedPhrase?: string;
  // Optional derivation index for accounts derived from the SAME mnemonic (0,1,2...).
  // Flutter may persist multiple accounts using one global encrypted seed.
  derivationIndex?: number;
  // When type === "privateKey", link to an entry in timetrade_stored_keys.
  storedKeyId?: string;
  createdAt: string;
}

const ACCOUNTS_STORAGE_KEY = "timetrade_user_accounts";
const ACTIVE_ACCOUNT_ID_KEY = "timetrade_active_account_id";

function coerceAccountType(v: unknown): StoredAccount["type"] | null {
  if (v === "mnemonic" || v === "privateKey") return v;
  if (typeof v !== "string") return null;
  const s = v.toLowerCase();
  if (s === "mnemonic" || s === "seed" || s === "seedphrase" || s === "seed_phrase") return "mnemonic";
  if (s === "privatekey" || s === "private_key" || s === "pk") return "privateKey";
  return null;
}

function coerceNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim().length > 0) {
    const n = parseInt(v, 10);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function extractAccountsArray(parsed: unknown): any[] {
  if (Array.isArray(parsed)) return parsed;
  if (!parsed || typeof parsed !== "object") return [];
  const obj: any = parsed;
  if (Array.isArray(obj.accounts)) return obj.accounts;
  if (Array.isArray(obj.items)) return obj.items;

  // Some implementations store a map keyed by id.
  const values = Object.values(obj);
  if (values.length > 0 && values.every((v) => v && typeof v === "object")) return values as any[];
  return [];
}

function normalizeStoredAccounts(parsed: unknown): StoredAccount[] {
  const arr = extractAccountsArray(parsed);
  const out: StoredAccount[] = [];
  const usedIds = new Set<string>();

  for (let i = 0; i < arr.length; i++) {
    const a: any = arr[i];
    if (!a || typeof a !== "object") continue;

    const idRaw = a.id ?? a.accountId ?? a.uuid ?? a.key ?? String(i);
    const baseId = String(idRaw);
    let id = baseId;
    let suffix = 1;
    while (usedIds.has(id)) {
      id = `${baseId}_${suffix++}`;
    }
    usedIds.add(id);

    const name = String(a.name ?? a.walletName ?? a.label ?? `Account ${i + 1}`);
    const type =
      coerceAccountType(a.type ?? a.accountType ?? a.kind ?? a.walletType) ||
      (a.storedKeyId || a.keyId || a.privateKey ? "privateKey" : "mnemonic");

    const derivationIndex = coerceNumber(
      a.derivationIndex ?? a.accountIndex ?? a.index ?? a.derivation_index ?? a.account_index
    );

    const encryptedSeedPhrase =
      a.encryptedSeedPhrase ?? a.encryptedMnemonic ?? a.encryptedSeed ?? a.seedCipher ?? a.seed_phrase;
    const storedKeyId = a.storedKeyId ?? a.keyId ?? a.stored_key_id;

    const createdAt = String(
      a.createdAt ?? a.created_at ?? a.addedAt ?? a.added_at ?? a.updatedAt ?? new Date().toISOString()
    );

    out.push({
      id,
      name,
      type,
      derivationIndex,
      encryptedSeedPhrase: typeof encryptedSeedPhrase === "string" ? encryptedSeedPhrase : undefined,
      storedKeyId: typeof storedKeyId === "string" ? storedKeyId : undefined,
      createdAt,
    });
  }

  return out;
}

function useUserAccounts() {
  const [accounts, setAccounts] = useState<StoredAccount[]>([]);
  const [activeAccountId, setActiveAccountIdState] = useState<string | null>(null);

  // Load accounts on mount - with recovery for empty arrays
  useEffect(() => {
    const load = () => {
      const stored = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
      const storedActiveId = localStorage.getItem(ACTIVE_ACCOUNT_ID_KEY);

      console.log('%c[ACCOUNT LOADER] 📂 Loading accounts from storage', 'color: #8b5cf6;', { 
        raw: stored,
        activeId: storedActiveId 
      });

      let parsedUnknown: unknown = [];
      if (stored) {
        try {
          parsedUnknown = JSON.parse(stored);
        } catch {
          parsedUnknown = [];
        }
      }

      const normalized = normalizeStoredAccounts(parsedUnknown);
      console.log('%c[ACCOUNT LOADER] 📋 Normalized accounts', 'color: #3b82f6;', { 
        count: normalized.length, 
        accounts: normalized.map(a => ({ id: a.id, name: a.name, type: a.type, hasEncrypted: !!a.encryptedSeedPhrase }))
      });

      // If we have accounts, use them (and lightly hydrate legacy entries)
      if (normalized.length > 0) {
        const seedCipher = localStorage.getItem(WALLET_STORAGE_KEYS.SEED_PHRASE) || undefined;
        let didHydrate = false;
        const hydrated = normalized.map((a) => {
          // Only hydrate accounts that are known to be derived from the active/global mnemonic:
          // - the legacy main account
          // - accounts that declare a derivation index
          if (a.type === "mnemonic" && !a.encryptedSeedPhrase && seedCipher && (a.id === "main" || typeof a.derivationIndex === "number")) {
            didHydrate = true;
            return { ...a, encryptedSeedPhrase: seedCipher };
          }
          return a;
        });

        setAccounts(hydrated);
        if (didHydrate) {
          // Persist hydration so switching works after refresh
          localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(hydrated));
        }

        // Set active account ID - use stored or default to first account
        const activeId = storedActiveId && hydrated.some((a) => a.id === storedActiveId) ? storedActiveId : hydrated[0]?.id;
        setActiveAccountIdState(activeId || null);
        if (activeId) {
          localStorage.setItem(ACTIVE_ACCOUNT_ID_KEY, activeId);
        }
        return;
      }

      // Recovery: Check if there's an existing seed phrase but no accounts registered
      const seedCipher = localStorage.getItem(WALLET_STORAGE_KEYS.SEED_PHRASE);
      const walletName = localStorage.getItem(WALLET_STORAGE_KEYS.WALLET_NAME) || "Main Wallet";
      if (seedCipher) {
        const mainAccount: StoredAccount = {
          id: "main",
          name: walletName,
          type: "mnemonic",
          encryptedSeedPhrase: seedCipher,
          derivationIndex: 0,
          createdAt: new Date().toISOString(),
        };
        setAccounts([mainAccount]);
        setActiveAccountIdState("main");
        localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify([mainAccount]));
        localStorage.setItem(ACTIVE_ACCOUNT_ID_KEY, "main");
      }
    };

    load();

    // Keep in sync if something else updates localStorage (cross-tab) or a switch happens.
    const onStorage = (e: StorageEvent) => {
      if (e.key === ACCOUNTS_STORAGE_KEY || e.key === ACTIVE_ACCOUNT_ID_KEY) load();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("timetrade:account-switched", load);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("timetrade:account-switched", load);
    };
  }, []);

  const setActiveAccountId = (id: string) => {
    setActiveAccountIdState(id);
    localStorage.setItem(ACTIVE_ACCOUNT_ID_KEY, id);
    console.log(`%c[ACCOUNT SWITCHER] 🎯 Active account ID set to: ${id}`, 'color: #22c55e; font-weight: bold;');
  };

  const addAccount = (
    name: string,
    type: "mnemonic" | "privateKey",
    extras?: Pick<StoredAccount, "encryptedSeedPhrase" | "storedKeyId" | "derivationIndex">
  ) => {
    const newAccount: StoredAccount = {
      id: Date.now().toString(),
      name: name.trim() || `Account ${accounts.length + 1}`,
      type,
      ...(extras || {}),
      createdAt: new Date().toISOString(),
    };
    const updated = [...accounts, newAccount];
    setAccounts(updated);
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updated));
    // Set the new account as active
    setActiveAccountId(newAccount.id);
    return newAccount;
  };

  const removeAccount = (id: string) => {
    const updated = accounts.filter((a) => a.id !== id);
    setAccounts(updated);
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updated));
    // If we removed the active account, switch to the first remaining one
    if (activeAccountId === id && updated.length > 0) {
      setActiveAccountId(updated[0].id);
    }
  };

  const renameAccount = (id: string, newName: string) => {
    const updated = accounts.map((a) =>
      a.id === id ? { ...a, name: newName.trim() } : a
    );
    setAccounts(updated);
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updated));
  };

  return { accounts, activeAccountId, setActiveAccountId, addAccount, removeAccount, renameAccount };
}

export function AccountSwitcherSheet({ open, onOpenChange }: AccountSwitcherSheetProps) {
  const { isLoadingAccounts, refreshAll } = useBlockchainContext();
  
  const { accounts, activeAccountId, setActiveAccountId, addAccount, removeAccount, renameAccount } = useUserAccounts();
  const [addMode, setAddMode] = useState<AddAccountMode>(null);
  const [mnemonicInput, setMnemonicInput] = useState("");
  const [privateKeyInput, setPrivateKeyInput] = useState("");
  const [accountNameInput, setAccountNameInput] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editNameInput, setEditNameInput] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleSelectAccount = async (accountId: string) => {
    console.log(`%c[ACCOUNT SWITCHER] 🔄 Starting account switch`, 'color: #8b5cf6; font-weight: bold;', { accountId });
    logWalletState();
    
    const account = accounts.find((a) => a.id === accountId);
    if (!account) {
      console.error(`%c[ACCOUNT SWITCHER] ❌ Account not found`, 'color: #ef4444;', { accountId });
      toast.error("Account not found");
      return;
    }

    console.log(`%c[ACCOUNT SWITCHER] 📋 Account details`, 'color: #3b82f6;', {
      id: account.id,
      name: account.name,
      type: account.type,
      hasEncryptedSeed: !!account.encryptedSeedPhrase,
      hasStoredKeyId: !!account.storedKeyId,
    });

    try {
      // Always update wallet name so header reflects selection
      localStorage.setItem(WALLET_STORAGE_KEYS.WALLET_NAME, account.name);

      const storedPin = localStorage.getItem(WALLET_STORAGE_KEYS.PIN);
      if (!storedPin) {
        console.error(`%c[ACCOUNT SWITCHER] ❌ No PIN found`, 'color: #ef4444;');
        toast.error("Please set up PIN first");
        return;
      }

      if (account.type === "mnemonic") {
        const effectiveSeedCipher =
          account.encryptedSeedPhrase || localStorage.getItem(WALLET_STORAGE_KEYS.SEED_PHRASE) || "";

        if (!effectiveSeedCipher) {
          console.error(`%c[ACCOUNT SWITCHER] ❌ No encrypted seed phrase`, 'color: #ef4444;');
          toast.error("This wallet was created before an update. Please re-import the seed phrase.");
          return;
        }

        const index = typeof account.derivationIndex === "number" ? account.derivationIndex : 0;

        console.log(`%c[ACCOUNT SWITCHER] 🔐 Decrypting and deriving addresses`, 'color: #22c55e;');
        
        // Store the encrypted seed phrase FIRST
        localStorage.setItem(WALLET_STORAGE_KEYS.SEED_PHRASE, effectiveSeedCipher);
        localStorage.setItem(WALLET_STORAGE_KEYS.ACTIVE_ACCOUNT_INDEX, String(index));

        // CRITICAL: Decrypt and derive addresses NOW, before dispatching events
        try {
          const encryptedData = JSON.parse(effectiveSeedCipher);
          const decryptedPhrase = await decryptPrivateKey(encryptedData, storedPin);
          const words = decryptedPhrase.split(/\s+/);
          const phrase = words.join(" ").toLowerCase().trim();
          
          // Derive addresses for all chains
          const evmAddress = deriveEvmAddress(phrase, index);
          const solanaPathStyle =
            (localStorage.getItem(WALLET_STORAGE_KEYS.SOLANA_DERIVATION_PATH) as SolanaDerivationPath) ||
            "phantom";

          // Persist the path so first-load derivation uses the same address (prevents $0 until switching)
          localStorage.setItem(WALLET_STORAGE_KEYS.SOLANA_DERIVATION_PATH, solanaPathStyle);

          const solAddress = deriveSolanaAddress(phrase, index, solanaPathStyle);
          const tronAddress = deriveTronAddress(phrase, index);

          console.log(`%c[ACCOUNT SWITCHER] 📍 Derived addresses`, 'color: #22c55e; font-weight: bold;', {
            evm: evmAddress,
            solana: solAddress,
            tron: tronAddress,
          });

          // Use centralized storage to set ALL addresses atomically
          setAllAddresses({
            evm: evmAddress,
            solana: solAddress,
            tron: tronAddress,
          });

        } catch (decryptErr) {
          console.error(`%c[ACCOUNT SWITCHER] ❌ Failed to decrypt/derive`, 'color: #ef4444;', decryptErr);
          toast.error("Failed to decrypt wallet. Check your PIN.");
          return;
        }

        // Log final state before event
        logWalletState();

        // Now dispatch event - addresses are already in localStorage
        console.log(`%c[ACCOUNT SWITCHER] 📢 Dispatching account-switched event`, 'color: #eab308;');
        window.dispatchEvent(new CustomEvent("timetrade:account-switched"));

        // Refresh queries after a small delay to allow event handlers to run
        setTimeout(() => {
          console.log(`%c[ACCOUNT SWITCHER] 🔄 Calling refreshAll()`, 'color: #06b6d4;');
          refreshAll();
        }, 150);
      } else {
        // Private-key accounts - clear mnemonic session first
        console.log(`%c[ACCOUNT SWITCHER] 🔑 Processing private key account`, 'color: #f97316;');
        clearMnemonicSession();
        
        const existingKeys = JSON.parse(localStorage.getItem(WALLET_STORAGE_KEYS.STORED_KEYS) || "[]");
        const entry =
          existingKeys.find((k: any) => k.id === account.storedKeyId) ||
          existingKeys.find((k: any) => k.label === account.name);
        
        if (!entry?.encryptedKey) {
          console.error(`%c[ACCOUNT SWITCHER] ❌ Private key not found`, 'color: #ef4444;', { storedKeyId: account.storedKeyId });
          toast.error("Private key not found for this account");
          return;
        }

        console.log(`%c[ACCOUNT SWITCHER] 🔓 Decrypting private key`, 'color: #a855f7;');
        const privateKeyRaw = await decryptPrivateKey(entry.encryptedKey, storedPin);
        const privateKey = privateKeyRaw.startsWith("0x") ? privateKeyRaw : `0x${privateKeyRaw}`;
        
        const evmAddress = new EthersWallet(privateKey).address;
        const tronAddress = evmToTronAddress(evmAddress);

        console.log(`%c[ACCOUNT SWITCHER] 📍 Derived addresses from private key`, 'color: #22c55e;', {
          evm: evmAddress,
          tron: tronAddress || '(none)',
        });

        // Use centralized storage - explicitly no Solana for PK accounts
        setAllAddresses({
          evm: evmAddress,
          tron: tronAddress || undefined,
          solana: undefined, // This will remove the Solana address
        });
        
        localStorage.setItem(WALLET_STORAGE_KEYS.ACTIVE_ACCOUNT_INDEX, "0");

        // Log final state before event
        logWalletState();

        console.log(`%c[ACCOUNT SWITCHER] 📢 Dispatching account-switched event`, 'color: #eab308;');
        window.dispatchEvent(new CustomEvent("timetrade:account-switched"));
        
        setTimeout(() => {
          console.log(`%c[ACCOUNT SWITCHER] 🔄 Calling refreshAll()`, 'color: #06b6d4;');
          refreshAll();
        }, 150);
      }

      // CRITICAL: Update the active account ID in state and storage
      setActiveAccountId(accountId);

      toast.success(`Switched to ${account.name}`);
      onOpenChange(false);
      
      console.log(`%c[ACCOUNT SWITCHER] ✅ Account switch completed successfully`, 'color: #22c55e; font-weight: bold;', { newActiveId: accountId });
    } catch (err) {
      console.error(`%c[ACCOUNT SWITCHER] ❌ Account switch failed`, 'color: #ef4444; font-weight: bold;', err);
      toast.error("Failed to switch account. Please try again.");
    }
  };

  const handleImportMnemonic = async () => {
    console.log(`%c[ACCOUNT SWITCHER] 📥 Starting mnemonic import`, 'color: #8b5cf6; font-weight: bold;');
    
    const words = mnemonicInput.trim().toLowerCase().split(/\s+/);
    if (!validateSeedPhrase(words)) {
      console.error(`%c[ACCOUNT SWITCHER] ❌ Invalid seed phrase`, 'color: #ef4444;', { wordCount: words.length });
      toast.error("Invalid seed phrase");
      return;
    }

    setIsImporting(true);
    try {
      const storedPin = localStorage.getItem(WALLET_STORAGE_KEYS.PIN);
      if (!storedPin) {
        console.error(`%c[ACCOUNT SWITCHER] ❌ No PIN found`, 'color: #ef4444;');
        toast.error("Please set up PIN first");
        setIsImporting(false);
        return;
      }

      console.log(`%c[ACCOUNT SWITCHER] 🔐 Encrypting seed phrase`, 'color: #22c55e;');
      const encrypted = await encryptPrivateKey(words.join(" "), storedPin);
      const encryptedStr = JSON.stringify(encrypted);
      localStorage.setItem(WALLET_STORAGE_KEYS.SEED_PHRASE, encryptedStr);

      console.log(`%c[ACCOUNT SWITCHER] 🔑 Deriving addresses`, 'color: #3b82f6;');
      const evmAddress = deriveEvmAddress(words.join(" "), 0);
      const solanaPathStyle =
        (localStorage.getItem(WALLET_STORAGE_KEYS.SOLANA_DERIVATION_PATH) as SolanaDerivationPath) ||
        "phantom";
      localStorage.setItem(WALLET_STORAGE_KEYS.SOLANA_DERIVATION_PATH, solanaPathStyle);

      const solAddress = deriveSolanaAddress(words.join(" "), 0, solanaPathStyle);
      const tronAddress = deriveTronAddress(words.join(" "), 0);

      console.log(`%c[ACCOUNT SWITCHER] 📍 Derived addresses`, 'color: #22c55e;', {
        evm: evmAddress,
        solana: solAddress,
        tron: tronAddress,
      });

      // Use centralized storage
      setAllAddresses({
        evm: evmAddress,
        solana: solAddress,
        tron: tronAddress,
      });

      const accountName = accountNameInput.trim() || "Imported Wallet";
      localStorage.setItem(WALLET_STORAGE_KEYS.WALLET_NAME, accountName);
      
      addAccount(accountName, "mnemonic", { encryptedSeedPhrase: encryptedStr, derivationIndex: 0 });

      // Log state before events
      logWalletState();

      console.log(`%c[ACCOUNT SWITCHER] 📢 Dispatching events`, 'color: #eab308;');
      window.dispatchEvent(new CustomEvent("timetrade:unlocked", { detail: { pin: storedPin } }));
      window.dispatchEvent(new CustomEvent("timetrade:account-switched"));

      toast.success("Wallet imported successfully");
      setMnemonicInput("");
      setAccountNameInput("");
      setAddMode(null);
      onOpenChange(false);
      
      console.log(`%c[ACCOUNT SWITCHER] ✅ Import completed, refreshing...`, 'color: #22c55e; font-weight: bold;');
      // Refresh data instead of full page reload
      setTimeout(() => refreshAll(), 200);
    } catch (err) {
      console.error(`%c[ACCOUNT SWITCHER] ❌ Import failed`, 'color: #ef4444; font-weight: bold;', err);
      toast.error("Failed to import wallet");
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportPrivateKey = async () => {
    console.log(`%c[ACCOUNT SWITCHER] 📥 Starting private key import`, 'color: #8b5cf6; font-weight: bold;');
    
    const key = privateKeyInput.trim();
    if (!key || key.length < 32) {
      console.error(`%c[ACCOUNT SWITCHER] ❌ Invalid private key`, 'color: #ef4444;', { keyLength: key.length });
      toast.error("Invalid private key");
      return;
    }

    setIsImporting(true);
    try {
      const storedPin = localStorage.getItem(WALLET_STORAGE_KEYS.PIN);
      if (!storedPin) {
        console.error(`%c[ACCOUNT SWITCHER] ❌ No PIN found`, 'color: #ef4444;');
        toast.error("Please set up PIN first");
        setIsImporting(false);
        return;
      }

      // Clear mnemonic session when importing a private key
      clearMnemonicSession();

      console.log(`%c[ACCOUNT SWITCHER] 🔐 Encrypting private key`, 'color: #22c55e;');
      const encrypted = await encryptPrivateKey(key, storedPin);
      const existingKeys = JSON.parse(localStorage.getItem(WALLET_STORAGE_KEYS.STORED_KEYS) || "[]");
      const accountName = accountNameInput.trim() || `Private Key ${existingKeys.length + 1}`;
      const keyId = Date.now().toString();
      
      existingKeys.push({
        id: keyId,
        label: accountName,
        encryptedKey: encrypted,
        addedAt: new Date().toISOString(),
      });
      localStorage.setItem(WALLET_STORAGE_KEYS.STORED_KEYS, JSON.stringify(existingKeys));

      // Derive addresses from private key
      console.log(`%c[ACCOUNT SWITCHER] 🔑 Deriving addresses from private key`, 'color: #3b82f6;');
      const privateKeyFormatted = key.startsWith("0x") ? key : `0x${key}`;
      const evmAddress = new EthersWallet(privateKeyFormatted).address;
      const tronAddress = evmToTronAddress(evmAddress);

      console.log(`%c[ACCOUNT SWITCHER] 📍 Derived addresses`, 'color: #22c55e;', {
        evm: evmAddress,
        tron: tronAddress || '(none)',
      });

      // Use centralized storage - explicitly no Solana for PK accounts
      setAllAddresses({
        evm: evmAddress,
        tron: tronAddress || undefined,
        solana: undefined,
      });
      
      localStorage.setItem(WALLET_STORAGE_KEYS.WALLET_NAME, accountName);
      
      addAccount(accountName, "privateKey", { storedKeyId: keyId });

      // Log state before events
      logWalletState();

      console.log(`%c[ACCOUNT SWITCHER] 📢 Dispatching account-switched event`, 'color: #eab308;');
      window.dispatchEvent(new CustomEvent("timetrade:account-switched"));

      toast.success("Private key imported");
      setPrivateKeyInput("");
      setAccountNameInput("");
      setAddMode(null);
      onOpenChange(false);
      
      // Refresh data for the new account
      setTimeout(() => {
        console.log(`%c[ACCOUNT SWITCHER] 🔄 Calling refreshAll()`, 'color: #06b6d4;');
        refreshAll();
      }, 200);
      
      console.log(`%c[ACCOUNT SWITCHER] ✅ Private key import completed`, 'color: #22c55e; font-weight: bold;');
    } catch (err) {
      console.error(`%c[ACCOUNT SWITCHER] ❌ Import failed`, 'color: #ef4444; font-weight: bold;', err);
      toast.error("Failed to import key");
    } finally {
      setIsImporting(false);
    }
  };

  const handleSaveNickname = (id: string) => {
    if (editNameInput.trim()) {
      renameAccount(id, editNameInput.trim());
      toast.success("Account renamed");
    }
    setEditingAccountId(null);
    setEditNameInput("");
  };

  const startEditingName = (id: string, currentName: string) => {
    setEditingAccountId(id);
    setEditNameInput(currentName);
  };

  const handleDeleteAccount = (id: string) => {
    removeAccount(id);
    setDeleteConfirmId(null);
    toast.success("Account removed");
  };

  const resetAddMode = () => {
    setAddMode(null);
    setMnemonicInput("");
    setPrivateKeyInput("");
    setAccountNameInput("");
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { resetAddMode(); setEditingAccountId(null); } }}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh] bg-background/95 backdrop-blur-xl border-border/50">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-left flex items-center gap-2 text-lg">
              <Layers className="w-5 h-5 text-primary" />
              {addMode === null && "Switch Account"}
              {addMode === "menu" && "Add Account"}
              {addMode === "mnemonic" && "Import Seed Phrase"}
              {addMode === "privateKey" && "Import Private Key"}
            </SheetTitle>
          </SheetHeader>

          {/* Add Account Button */}
          {addMode === null && (
            <button
              onClick={() => setAddMode("menu")}
              className="w-full flex items-center gap-4 p-4 mb-4 rounded-2xl border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all duration-200"
            >
              <div className="w-11 h-11 rounded-full bg-primary/20 flex items-center justify-center">
                <Plus className="w-5 h-5 text-primary" />
              </div>
              <span className="font-medium text-primary">Add or Import Account</span>
            </button>
          )}

          {/* Add Account Menu */}
          {addMode === "menu" && (
            <div className="space-y-3 py-4">
              <button
                onClick={() => setAddMode("mnemonic")}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border/50 bg-card/50 hover:bg-secondary/50 transition-all duration-200"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-foreground">Import Seed Phrase</p>
                  <p className="text-sm text-muted-foreground">12 or 24 word recovery phrase</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>

              <button
                onClick={() => setAddMode("privateKey")}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border/50 bg-card/50 hover:bg-secondary/50 transition-all duration-200"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Key className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-foreground">Import Private Key</p>
                  <p className="text-sm text-muted-foreground">Hex-encoded private key</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>

              <Button variant="ghost" onClick={resetAddMode} className="w-full mt-2">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            </div>
          )}

          {/* Mnemonic Import Form */}
          {addMode === "mnemonic" && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="account-name-mnemonic" className="text-muted-foreground">Wallet Name</Label>
                <Input
                  id="account-name-mnemonic"
                  value={accountNameInput}
                  onChange={(e) => setAccountNameInput(e.target.value)}
                  placeholder="e.g. Main Wallet, Trading"
                  maxLength={24}
                  className="bg-secondary/50 border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Seed Phrase</Label>
                <textarea
                  value={mnemonicInput}
                  onChange={(e) => setMnemonicInput(e.target.value)}
                  placeholder="Enter your 12 or 24 word seed phrase..."
                  className="w-full h-28 p-4 rounded-2xl border border-border/50 bg-secondary/50 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/50"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={resetAddMode} className="flex-1 rounded-xl">
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
                <Button
                  onClick={handleImportMnemonic}
                  disabled={isImporting || !mnemonicInput.trim()}
                  className="flex-1 rounded-xl"
                >
                  {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Import Wallet"}
                </Button>
              </div>
            </div>
          )}

          {/* Private Key Import Form */}
          {addMode === "privateKey" && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="account-name-pk" className="text-muted-foreground">Wallet Name</Label>
                <Input
                  id="account-name-pk"
                  value={accountNameInput}
                  onChange={(e) => setAccountNameInput(e.target.value)}
                  placeholder="e.g. Hot Wallet, DeFi"
                  maxLength={24}
                  className="bg-secondary/50 border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Private Key</Label>
                <Input
                  type="password"
                  value={privateKeyInput}
                  onChange={(e) => setPrivateKeyInput(e.target.value)}
                  placeholder="Enter private key..."
                  className="font-mono bg-secondary/50 border-border/50"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={resetAddMode} className="flex-1 rounded-xl">
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
                <Button
                  onClick={handleImportPrivateKey}
                  disabled={isImporting || !privateKeyInput.trim()}
                  className="flex-1 rounded-xl"
                >
                  {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Import Key"}
                </Button>
              </div>
            </div>
          )}

          {/* Account List */}
          {addMode === null && (
            <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
              {isLoadingAccounts ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading accounts...</span>
                </div>
              ) : accounts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Wallet className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="font-medium">No Accounts Found</p>
                  <p className="text-sm mt-1 opacity-70">Import a wallet to get started</p>
                </div>
              ) : (
                accounts.map((account, index) => {
                  const isActive = activeAccountId === account.id;
                  const isEditing = editingAccountId === account.id;

                  return (
                    <div
                      key={account.id}
                      className={cn(
                        "w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all duration-200",
                        isActive
                          ? "border-primary/50 bg-primary/10"
                          : "border-border/30 bg-card/30 hover:bg-secondary/50"
                      )}
                    >
                      {/* Account Number */}
                      <button
                        onClick={() => handleSelectAccount(account.id)}
                        className={cn(
                          "w-11 h-11 rounded-full flex items-center justify-center font-bold text-lg shrink-0 transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 text-muted-foreground"
                        )}
                      >
                        {index + 1}
                      </button>
                      
                      {/* Account Info */}
                      <button
                        onClick={() => handleSelectAccount(account.id)}
                        className="flex-1 text-left min-w-0"
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <Input
                              value={editNameInput}
                              onChange={(e) => setEditNameInput(e.target.value)}
                              placeholder="Enter wallet name"
                              maxLength={24}
                              className="h-8 text-sm bg-secondary/50"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveNickname(account.id);
                                if (e.key === "Escape") setEditingAccountId(null);
                              }}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => handleSaveNickname(account.id)}
                            >
                              <Check className="w-4 h-4 text-primary" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground truncate">{account.name}</span>
                            {account.type === "privateKey" && (
                              <Key className="w-3 h-3 text-muted-foreground shrink-0" />
                            )}
                            {isActive && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-semibold shrink-0">
                                Active
                              </span>
                            )}
                          </div>
                        )}
                      </button>

                      {/* Action Buttons */}
                      {!isEditing && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditingName(account.id, account.name);
                            }}
                            className="p-2 rounded-xl hover:bg-muted/50 transition-colors"
                            title="Rename"
                          >
                            <Edit2 className="w-4 h-4 text-muted-foreground" />
                          </button>
                          {/* Only allow deletion for non-main accounts or if there are multiple accounts */}
                          {(account.id !== "main" || accounts.length > 1) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmId(account.id);
                              }}
                              className="p-2 rounded-xl hover:bg-destructive/10 transition-colors"
                              title="Remove"
                            >
                              <Trash2 className="w-4 h-4 text-destructive/70" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this account from your wallet? This action cannot be undone.
              Make sure you have backed up your seed phrase or private key before removing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDeleteAccount(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
