import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { assets, totalValue } = await req.json();
    if (!assets || !Array.isArray(assets)) {
      return new Response(JSON.stringify({ error: "assets array is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build portfolio summary for AI (only public data, no keys)
    const portfolioSummary = assets.map((a: any) => ({
      symbol: a.symbol,
      chain: a.chain,
      percentage: totalValue > 0 ? ((a.valueUsd / totalValue) * 100).toFixed(1) : "0",
      valueUsd: a.valueUsd?.toFixed(2),
    }));

    // Calculate basic metrics
    const topAsset = assets.reduce((max: any, a: any) => a.valueUsd > (max?.valueUsd || 0) ? a : max, null);
    const topConcentration = totalValue > 0 && topAsset ? ((topAsset.valueUsd / totalValue) * 100) : 0;
    const uniqueChains = new Set(assets.map((a: any) => a.chain)).size;
    const stablecoins = assets.filter((a: any) => ["USDT", "USDC", "DAI", "BUSD"].includes(a.symbol?.toUpperCase()));
    const stablePct = totalValue > 0 ? stablecoins.reduce((s: number, a: any) => s + (a.valueUsd || 0), 0) / totalValue * 100 : 0;

    const prompt = `You are a crypto portfolio analyst. Analyze this portfolio and provide insights.

Portfolio Total Value: $${totalValue?.toFixed(2) || "0"}
Number of Assets: ${assets.length}
Number of Chains: ${uniqueChains}
Top Asset: ${topAsset?.symbol || "N/A"} (${topConcentration.toFixed(1)}% of portfolio)
Stablecoin Allocation: ${stablePct.toFixed(1)}%

Asset Breakdown:
${portfolioSummary.map((a: any) => `- ${a.symbol} on ${a.chain}: ${a.percentage}% ($${a.valueUsd})`).join("\n")}

Provide a professional portfolio analysis. Do NOT give financial advice or guarantees. Focus on diversification, concentration risk, and chain exposure. Be concise.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a crypto portfolio analyst. Use the tool to return structured insights. Never give financial guarantees." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "portfolio_insights",
            description: "Return structured portfolio analysis",
            parameters: {
              type: "object",
              properties: {
                risk_level: { type: "string", enum: ["Low", "Medium", "High"] },
                diversification_score: { type: "number", description: "Score from 0-100, higher is more diversified" },
                concentration_warning: { type: "boolean", description: "True if portfolio is too concentrated" },
                insight_text: { type: "string", description: "2-3 sentence human-readable portfolio insight" },
                recommendations: {
                  type: "array",
                  items: { type: "string" },
                  description: "2-3 short actionable recommendations"
                }
              },
              required: ["risk_level", "diversification_score", "concentration_warning", "insight_text", "recommendations"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "portfolio_insights" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      return new Response(JSON.stringify(JSON.parse(toolCall.function.arguments)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("No tool call response");
  } catch (e) {
    console.error("portfolio-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
