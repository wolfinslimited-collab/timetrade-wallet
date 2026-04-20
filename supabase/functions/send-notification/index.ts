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
    const { title, message, type, icon, target_platform, expires_at } = await req.json();

    if (!title || !message) {
      return new Response(JSON.stringify({ error: "title and message are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validPlatforms = ["all", "iphone", "android", "web"];
    const validTypes = ["info", "price_alert", "transaction", "security"];

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase.from("push_notifications").insert({
      title,
      message,
      type: validTypes.includes(type) ? type : "info",
      icon: icon || null,
      target_platform: validPlatforms.includes(target_platform) ? target_platform : "all",
      is_active: true,
      expires_at: expires_at || null,
    }).select().single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, notification: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});