import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Chain ID mapping for ParaSwap
const CHAIN_IDS: Record<string, number> = {
  ethereum: 1,
  polygon: 137,
  arbitrum: 42161,
  bsc: 56,
};

// Native token addresses
const NATIVE_TOKEN = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

// SOL mint address
const SOL_MINT = "So11111111111111111111111111111111111111112";

interface QuoteRequest {
  action: "quote" | "swap" | "tokens";
  chain: string;
  srcToken: string;
  destToken: string;
  amount: string; // in base units
  srcDecimals?: number;
  destDecimals?: number;
  slippage?: number; // in bps (e.g., 50 = 0.5%)
  userAddress?: string;
}

// ========== JUPITER (Solana) ==========

async function getJupiterQuote(
  inputMint: string,
  outputMint: string,
  amount: string,
  slippageBps: number
) {
  const url = `https://lite-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`;
  console.log("[SWAP] Jupiter quote URL:", url);

  const res = await fetch(url);
  const text = await res.text();

  if (!res.ok) {
    console.error("[SWAP] Jupiter quote error:", text);
    throw new Error(`Jupiter quote failed: ${text}`);
  }

  return JSON.parse(text);
}

async function getJupiterSwapTransaction(
  quoteResponse: any,
  userPublicKey: string
) {
  const res = await fetch("https://lite-api.jup.ag/v6/swap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteResponse,
      userPublicKey,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: "auto",
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error("[SWAP] Jupiter swap error:", text);
    throw new Error(`Jupiter swap transaction failed: ${text}`);
  }
  return JSON.parse(text);
}

// ========== PARASWAP (EVM) ==========

async function getParaSwapQuote(
  chainId: number,
  srcToken: string,
  destToken: string,
  amount: string,
  srcDecimals: number,
  destDecimals: number
) {
  const params = new URLSearchParams({
    srcToken: srcToken === "native" ? NATIVE_TOKEN : srcToken,
    destToken: destToken === "native" ? NATIVE_TOKEN : destToken,
    amount,
    srcDecimals: srcDecimals.toString(),
    destDecimals: destDecimals.toString(),
    network: chainId.toString(),
    side: "SELL",
  });

  const url = `https://apiv5.paraswap.io/prices?${params}`;
  console.log("[SWAP] ParaSwap quote URL:", url);

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    console.error("[SWAP] ParaSwap quote error:", text);
    throw new Error(`ParaSwap quote failed: ${text}`);
  }
  const data = await res.json();
  return data.priceRoute;
}

async function getParaSwapTransaction(
  chainId: number,
  priceRoute: any,
  userAddress: string,
  slippage: number // percentage e.g. 0.5
) {
  const destAmountNum = BigInt(priceRoute.destAmount);
  const slippageFactor = BigInt(Math.floor((1 - slippage / 100) * 10000));
  const minDestAmount = (destAmountNum * slippageFactor / BigInt(10000)).toString();

  const body = {
    srcToken: priceRoute.srcToken,
    destToken: priceRoute.destToken,
    srcAmount: priceRoute.srcAmount,
    destAmount: minDestAmount,
    priceRoute,
    userAddress,
    partner: "timetrade",
  };

  const res = await fetch(
    `https://apiv5.paraswap.io/transactions/${chainId}?ignoreChecks=true`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    console.error("[SWAP] ParaSwap tx error:", text);
    throw new Error(`ParaSwap transaction failed: ${text}`);
  }
  return await res.json();
}

// ========== HANDLER ==========

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: QuoteRequest = await req.json();
    const { action, chain, srcToken, destToken, amount, srcDecimals, destDecimals, slippage, userAddress } = body;

    console.log("[SWAP] Request:", { action, chain, srcToken, destToken, amount });

    // ---- QUOTE ----
    if (action === "quote") {
      if (chain === "solana") {
        const jupiterQuote = await getJupiterQuote(
          srcToken || SOL_MINT,
          destToken || SOL_MINT,
          amount,
          slippage || 50
        );

        return new Response(
          JSON.stringify({
            success: true,
            provider: "jupiter",
            data: {
              srcAmount: jupiterQuote.inAmount,
              destAmount: jupiterQuote.outAmount,
              priceImpact: parseFloat(jupiterQuote.priceImpactPct || "0"),
              route: jupiterQuote.routePlan?.map((r: any) => r.swapInfo?.label).filter(Boolean) || [],
              raw: jupiterQuote,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        // EVM chains via ParaSwap
        const chainId = CHAIN_IDS[chain];
        if (!chainId) {
          throw new Error(`Unsupported chain for swap: ${chain}`);
        }

        const priceRoute = await getParaSwapQuote(
          chainId,
          srcToken,
          destToken,
          amount,
          srcDecimals || 18,
          destDecimals || 18
        );

        return new Response(
          JSON.stringify({
            success: true,
            provider: "paraswap",
            data: {
              srcAmount: priceRoute.srcAmount,
              destAmount: priceRoute.destAmount,
              priceImpact: parseFloat(priceRoute.priceImpact || "0"),
              gasCost: priceRoute.gasCost,
              gasCostUSD: priceRoute.gasCostUSD,
              route: priceRoute.bestRoute?.map((r: any) => r.swaps?.[0]?.swapExchanges?.[0]?.exchange).filter(Boolean) || [],
              raw: priceRoute,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ---- SWAP (build transaction) ----
    if (action === "swap") {
      if (!userAddress) throw new Error("userAddress required for swap");

      if (chain === "solana") {
        const jupiterQuote = body as any;
        const rawQuote = jupiterQuote.quoteResponse || jupiterQuote.raw;
        if (!rawQuote) throw new Error("Missing quote data for Jupiter swap");

        const swapResult = await getJupiterSwapTransaction(rawQuote, userAddress);

        return new Response(
          JSON.stringify({
            success: true,
            provider: "jupiter",
            data: {
              swapTransaction: swapResult.swapTransaction,
              lastValidBlockHeight: swapResult.lastValidBlockHeight,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        const chainId = CHAIN_IDS[chain];
        if (!chainId) throw new Error(`Unsupported chain: ${chain}`);

        const rawPriceRoute = (body as any).priceRoute || (body as any).raw;
        if (!rawPriceRoute) throw new Error("Missing priceRoute for ParaSwap swap");

        const txData = await getParaSwapTransaction(
          chainId,
          rawPriceRoute,
          userAddress,
          (slippage || 50) / 100 // convert bps to percentage
        );

        return new Response(
          JSON.stringify({
            success: true,
            provider: "paraswap",
            data: {
              to: txData.to,
              from: txData.from,
              data: txData.data,
              value: txData.value,
              gasPrice: txData.gasPrice,
              chainId: txData.chainId,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    console.error("[SWAP] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
