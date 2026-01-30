import { useState, useEffect, useCallback } from "react";

interface AvatarCache {
  [address: string]: string;
}

// In-memory cache to prevent duplicate requests
const avatarCache: AvatarCache = {};

// Generate a deterministic color from address for placeholder
function addressToColor(address: string): { from: string; to: string } {
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    const char = address.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  const hue1 = Math.abs(hash % 360);
  const hue2 = (hue1 + 40 + Math.abs((hash >> 8) % 60)) % 360;
  
  return {
    from: `hsl(${hue1}, 70%, 50%)`,
    to: `hsl(${hue2}, 70%, 40%)`,
  };
}

// Generate a deterministic avatar URL using UI Avatars service
function generateAvatarUrl(address: string): string {
  // Use first 6 and last 4 characters for the avatar
  const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;
  const colors = addressToColor(address);
  // Extract just the hue value from the HSL color
  const bgColor = colors.from.match(/hsl\((\d+)/)?.[1] || '240';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(shortAddr)}&background=${bgColor}80&color=fff&bold=true&size=128&format=png`;
}

export function useWalletAvatar(address: string | null) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const normalizedAddress = address?.toLowerCase() || "";
  const placeholderColors = address ? addressToColor(address) : { from: "#6366f1", to: "#8b5cf6" };

  const fetchOrGenerateAvatar = useCallback(async (addr: string): Promise<string | null> => {
    // Check cache first
    if (avatarCache[addr]) {
      return avatarCache[addr];
    }
    
    // Generate avatar URL (no backend needed)
    const url = generateAvatarUrl(addr);
    avatarCache[addr] = url;
    return url;
  }, []);

  useEffect(() => {
    if (!normalizedAddress) {
      setAvatarUrl(null);
      return;
    }

    // Check cache immediately
    if (avatarCache[normalizedAddress]) {
      setAvatarUrl(avatarCache[normalizedAddress]);
      return;
    }

    setIsLoading(true);
    setError(null);

    fetchOrGenerateAvatar(normalizedAddress)
      .then((url) => {
        if (url) {
          setAvatarUrl(url);
        }
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [normalizedAddress, fetchOrGenerateAvatar]);

  return {
    avatarUrl,
    isLoading,
    error,
    placeholderColors,
  };
}
