import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { wallet_name, device_info } = await req.json();

    // Get IP from request headers
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      "unknown";

    // Try to get geo info from ip-api (free, no key needed)
    let country: string | null = null;
    let city: string | null = null;
    try {
      const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=country,city`);
      if (geoRes.ok) {
        const geo = await geoRes.json();
        country = geo.country || null;
        city = geo.city || null;
      }
    } catch {
      // geo lookup failed, continue without it
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supabase.from("wallet_users").insert({
      wallet_name: wallet_name || "Main Wallet",
      device_info: device_info || {},
      ip_address: ip,
      country,
      city,
    });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("register-user error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
