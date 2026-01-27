import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AvatarCache {
  [address: string]: string;
}

// In-memory cache to prevent duplicate requests
const avatarCache: AvatarCache = {};
const pendingRequests: Map<string, Promise<string | null>> = new Map();

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
    
    // Check if there's already a pending request for this address
    if (pendingRequests.has(addr)) {
      return pendingRequests.get(addr)!;
    }
    
    // Create the request promise
    const requestPromise = (async () => {
      try {
        // First, check if avatar already exists in storage
        const { data: publicUrl } = supabase.storage
          .from("wallet-avatars")
          .getPublicUrl(`avatars/${addr}.png`);
        
        // Try to fetch the existing image
        try {
          const checkResponse = await fetch(publicUrl.publicUrl, { method: "HEAD" });
          if (checkResponse.ok) {
            avatarCache[addr] = publicUrl.publicUrl;
            return publicUrl.publicUrl;
          }
        } catch {
          // Image doesn't exist, need to generate
        }

        // Generate new avatar
        const { data, error: fnError } = await supabase.functions.invoke("generate-avatar", {
          body: { address: addr },
        });

        if (fnError) {
          console.error("Avatar generation error:", fnError);
          return null;
        }

        if (data?.avatarUrl) {
          avatarCache[addr] = data.avatarUrl;
          return data.avatarUrl;
        }

        return null;
      } catch (err) {
        console.error("Failed to fetch/generate avatar:", err);
        return null;
      } finally {
        pendingRequests.delete(addr);
      }
    })();
    
    pendingRequests.set(addr, requestPromise);
    return requestPromise;
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
