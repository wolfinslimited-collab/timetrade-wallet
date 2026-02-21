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
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, ...params } = await req.json();

    if (action === "create") {
      const { wallet_address, token_symbol, chain, amount, apy_rate, unlock_at, tx_hash } = params;

      // Validate required fields
      if (!wallet_address || !token_symbol || !chain || !amount || !apy_rate || !unlock_at) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate amount is positive
      if (typeof amount !== "number" || amount <= 0) {
        return new Response(
          JSON.stringify({ error: "Invalid amount" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate tx_hash is provided (proves on-chain transfer happened)
      if (!tx_hash || typeof tx_hash !== "string" || tx_hash.length < 10) {
        return new Response(
          JSON.stringify({ error: "Valid transaction hash required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check for duplicate tx_hash to prevent replay
      const { data: existing } = await supabaseAdmin
        .from("staking_positions")
        .select("id")
        .eq("tx_hash", tx_hash)
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({ error: "Transaction already recorded" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabaseAdmin.from("staking_positions").insert({
        wallet_address: wallet_address.toLowerCase(),
        token_symbol,
        chain,
        amount,
        apy_rate,
        unlock_at,
        tx_hash,
      }).select().single();

      if (error) {
        console.error("Insert error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to create staking position" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "unstake") {
      const { position_id, wallet_address } = params;

      if (!position_id || !wallet_address) {
        return new Response(
          JSON.stringify({ error: "Missing position_id or wallet_address" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify the position belongs to this wallet
      const { data: position } = await supabaseAdmin
        .from("staking_positions")
        .select("*")
        .eq("id", position_id)
        .eq("wallet_address", wallet_address.toLowerCase())
        .eq("is_active", true)
        .maybeSingle();

      if (!position) {
        return new Response(
          JSON.stringify({ error: "Position not found or not owned by this wallet" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check unlock date
      if (new Date(position.unlock_at) > new Date()) {
        return new Response(
          JSON.stringify({ error: "Position is still locked" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabaseAdmin
        .from("staking_positions")
        .update({ is_active: false })
        .eq("id", position_id)
        .eq("wallet_address", wallet_address.toLowerCase());

      if (error) {
        console.error("Unstake error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to unstake" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Staking function error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
