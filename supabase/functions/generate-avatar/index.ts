import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate a deterministic seed from wallet address for consistent avatars
function addressToSeed(address: string): number {
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    const char = address.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Generate unique style attributes from the address
function getAvatarStyle(address: string): { theme: string; element: string; color: string } {
  const seed = addressToSeed(address);
  
  const themes = [
    "cyberpunk", "ethereal", "cosmic", "mystical", "futuristic",
    "neon", "crystal", "quantum", "holographic", "astral"
  ];
  
  const elements = [
    "orb", "crystal ball", "gem", "prism", "diamond",
    "nebula", "star", "moon", "aurora", "vortex"
  ];
  
  const colors = [
    "purple and gold", "cyan and magenta", "emerald and silver",
    "orange and teal", "pink and blue", "red and gold",
    "violet and amber", "turquoise and coral", "indigo and lime"
  ];
  
  return {
    theme: themes[seed % themes.length],
    element: elements[(seed >> 4) % elements.length],
    color: colors[(seed >> 8) % colors.length],
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address } = await req.json();
    
    if (!address || typeof address !== "string") {
      return new Response(
        JSON.stringify({ error: "Address is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Initialize Supabase client for storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if avatar already exists in storage
    const avatarPath = `avatars/${address.toLowerCase()}.png`;
    const { data: existingFile } = await supabase.storage
      .from("wallet-avatars")
      .createSignedUrl(avatarPath, 3600);
    
    if (existingFile?.signedUrl) {
      // Return existing avatar URL
      const { data: publicUrl } = supabase.storage
        .from("wallet-avatars")
        .getPublicUrl(avatarPath);
      
      return new Response(
        JSON.stringify({ success: true, avatarUrl: publicUrl.publicUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate unique style from address
    const style = getAvatarStyle(address);
    const seed = addressToSeed(address);
    
    const prompt = `Create a stunning ${style.theme} NFT avatar featuring a glowing ${style.element} in ${style.color} colors. The design should be: square 1:1 aspect ratio, vibrant and eye-catching, with smooth gradients, ambient lighting effects, perfect for a crypto wallet profile picture. Style: modern digital art, high detail, centered composition, dark background with glowing elements. No text, no letters.`;

    console.log(`Generating avatar for ${address} with prompt: ${prompt}`);

    // Generate image using Lovable AI
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          { role: "user", content: prompt }
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add more credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageData) {
      console.error("No image in response:", JSON.stringify(data));
      throw new Error("No image generated");
    }

    // Extract base64 data (remove data URL prefix)
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from("wallet-avatars")
      .upload(avatarPath, imageBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      // Return the base64 image directly if upload fails
      return new Response(
        JSON.stringify({ success: true, avatarUrl: imageData }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get public URL
    const { data: publicUrl } = supabase.storage
      .from("wallet-avatars")
      .getPublicUrl(avatarPath);

    console.log(`Avatar generated and stored: ${publicUrl.publicUrl}`);

    return new Response(
      JSON.stringify({ success: true, avatarUrl: publicUrl.publicUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Avatar generation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
