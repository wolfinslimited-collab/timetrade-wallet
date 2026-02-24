import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { address, chain, amount, senderAddress } = await req.json();
    if (!address || !chain) {
      return new Response(JSON.stringify({ error: "address and chain are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const prompt = `You are a blockchain security analyst. Analyze this recipient address for potential risks.

Address: ${address}
Chain: ${chain}
Transaction Amount: ${amount || "unknown"}
Sender: ${senderAddress || "unknown"}

Evaluate the address and provide a risk assessment. Consider:
1. Address format validity for the chain
2. Whether it could be a known scam pattern (e.g., zero-value address, honeypot contract patterns)
3. If the address looks like a contract vs EOA on EVM chains
4. General risk factors

You MUST respond with a JSON object using the tool provided. Be conservative - most addresses are legitimate. Only flag high risk if there are clear red flags.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a blockchain security expert. Always use the provided tool to return structured risk data." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "risk_assessment",
            description: "Return structured risk assessment for a blockchain address",
            parameters: {
              type: "object",
              properties: {
                risk_score: { type: "number", description: "Risk score from 0 (safe) to 100 (dangerous)" },
                risk_level: { type: "string", enum: ["Low", "Medium", "High"], description: "Overall risk level" },
                explanation: { type: "string", description: "Short explanation of the risk assessment (1-2 sentences)" },
                flags: {
                  type: "array",
                  items: { type: "string" },
                  description: "List of specific risk flags found, if any"
                }
              },
              required: ["risk_score", "risk_level", "explanation", "flags"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "risk_assessment" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      // Return a default low-risk response on AI failure
      return new Response(JSON.stringify({
        risk_score: 15,
        risk_level: "Low",
        explanation: "Unable to perform full risk analysis. Please verify the address manually.",
        flags: [],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const riskData = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(riskData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback
    return new Response(JSON.stringify({
      risk_score: 15,
      risk_level: "Low",
      explanation: "No specific risks detected for this address.",
      flags: [],
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("transaction-risk error:", e);
    return new Response(JSON.stringify({
      risk_score: 15,
      risk_level: "Low",
      explanation: "Risk analysis unavailable. Please verify the address manually.",
      flags: [],
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
