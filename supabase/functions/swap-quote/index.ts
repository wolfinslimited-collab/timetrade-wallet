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
  action: "quote" | "swap" | "tokens" | "search-tokens";
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
  const url = `https://lite-api.jup.ag/swap/v1/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`;
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
  const res = await fetch("https://lite-api.jup.ag/swap/v1/swap", {
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

    // ---- SEARCH TOKENS ----
    if (action === "search-tokens") {
      const query = (body as any).query || "";
      const searchChain = chain || "solana";

      if (searchChain === "solana") {
        // Curated list of popular Solana SPL tokens with real mint addresses
        const SOLANA_TOKENS = [
          { address: "So11111111111111111111111111111111111111112", symbol: "SOL", name: "Solana", decimals: 9, logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" },
          { address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", symbol: "USDC", name: "USD Coin", decimals: 6, logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png" },
          { address: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", symbol: "USDT", name: "Tether USD", decimals: 6, logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.svg" },
          { address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", symbol: "BONK", name: "Bonk", decimals: 5, logoURI: "https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I" },
          { address: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", symbol: "JUP", name: "Jupiter", decimals: 6, logoURI: "https://static.jup.ag/jup/icon.png" },
          { address: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", symbol: "WIF", name: "dogwifhat", decimals: 6, logoURI: "https://bafkreibk3covs5ltyqxa272uodhber7flz7rfnvhfp42bt5x5igqacrwzy.ipfs.nftstorage.link" },
          { address: "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs", symbol: "WETH", name: "Wrapped Ether (Wormhole)", decimals: 8, logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs/logo.png" },
          { address: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So", symbol: "mSOL", name: "Marinade staked SOL", decimals: 9, logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So/logo.png" },
          { address: "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj", symbol: "stSOL", name: "Lido Staked SOL", decimals: 9, logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj/logo.png" },
          { address: "RLBxxFkseAZ4RgJH3Sqn8jXxhmGoz9jWxDNJMh8pL7a", symbol: "RLB", name: "Rollbit Coin", decimals: 2, logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/RLBxxFkseAZ4RgJH3Sqn8jXxhmGoz9jWxDNJMh8pL7a/logo.png" },
          { address: "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3", symbol: "PYTH", name: "Pyth Network", decimals: 6, logoURI: "https://pyth.network/token.svg" },
          { address: "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE", symbol: "ORCA", name: "Orca", decimals: 6, logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE/logo.png" },
          { address: "RaydiumcPmPhkTDTjEgLdHrjNMwTz7p2uzT8Bkh2VYC4", symbol: "RAY", name: "Raydium", decimals: 6, logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R/logo.png" },
          { address: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R", symbol: "RAY", name: "Raydium (Legacy)", decimals: 6, logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R/logo.png" },
          { address: "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL", symbol: "JTO", name: "Jito", decimals: 9, logoURI: "https://metadata.jito.network/token/jto/icon.png" },
          { address: "TNSRxcUxoT9xBG3de7PiJyTDYu7kskLqcpddxnEJAS6", symbol: "TNSR", name: "Tensor", decimals: 9, logoURI: "https://arweave.net/6NQRA9Y9vhbxYCQiOCR-JFT4411TZFp9SXKpj5kNiPU" },
          { address: "85VBFQZC9TZkfaptBWjvUw7YbZjy52A6mjtPGjstQAmQ", symbol: "W", name: "Wormhole", decimals: 6, logoURI: "https://wormhole.com/token.png" },
          { address: "DriFtupJYLTosbwoN8koMbEYSx54aFAVLddWsbksjwg7", symbol: "DRIFT", name: "Drift", decimals: 6, logoURI: "" },
          { address: "MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5", symbol: "MEW", name: "cat in a dogs world", decimals: 5, logoURI: "https://bafkreidlwyr565dxtao2ipsze5b2dq5kvdpemco7t7s7e5z6z7xhqlbkba.ipfs.nftstorage.link" },
          { address: "KMNo3nJsBXfcpJTVhZcXLW7RmTwTt4GVFE7suUBo9sS", symbol: "KMNO", name: "Kamino", decimals: 6, logoURI: "" },
          { address: "SHDWyBxihqiCj6YekG2GUr7wqKLeLAMK1gHZck9pL6y", symbol: "SHDW", name: "Shadow Token", decimals: 9, logoURI: "https://shdw-drive.genesysgo.net/FDcC9gn12fGkLOwX1p9A3ZS9jXhFz3bQ6CgBKKBTKMWi/250x250_with_padding.png" },
          { address: "nosXBVoaCTtYdLvKY6Csb4AC8JCdQKKAaWYtx2ZMoo7", symbol: "NOS", name: "Nosana", decimals: 6, logoURI: "" },
          { address: "BHKFCMgYJ3VvEVr4GjXHrbqP3PTpHMbV36pAGRQyJnpm", symbol: "MOBILE", name: "Helium Mobile", decimals: 6, logoURI: "" },
          { address: "iotEVVZLEywoTn1QdwNPddxPWszn3zFhEot3MfL9fns", symbol: "IOT", name: "Helium IOT", decimals: 6, logoURI: "" },
          { address: "rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof", symbol: "RENDER", name: "Render Token", decimals: 8, logoURI: "" },
          { address: "HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC", symbol: "AI16Z", name: "ai16z", decimals: 9, logoURI: "" },
          { address: "Grass7B4RdKfBCjTKgSqnXkqjwiGvQyFbuSCUJr3XXjs", symbol: "GRASS", name: "Grass", decimals: 9, logoURI: "" },
          { address: "CLoUDKc4Ane7HeQcPpE3YHnznRxhMimJ4MyaUqyHFzAu", symbol: "CLOUD", name: "Cloud", decimals: 9, logoURI: "" },
          { address: "LAYER4xPpTCb3QL8S3dSWTpRairmxFNprtMoyutaLYu5", symbol: "LAYER", name: "Solayer", decimals: 6, logoURI: "" },
          { address: "hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux", symbol: "HNT", name: "Helium", decimals: 8, logoURI: "" },
        ];

        const q = query.toLowerCase();
        const filtered = q
          ? SOLANA_TOKENS.filter(t =>
              t.symbol.toLowerCase().includes(q) ||
              t.name.toLowerCase().includes(q) ||
              t.address.toLowerCase() === q
            )
          : SOLANA_TOKENS;

        return new Response(
          JSON.stringify({
            success: true,
            tokens: filtered.slice(0, 30).map(t => ({
              ...t,
              isVerified: true,
            })),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // EVM token search
      const EVM_TOKENS: Record<string, Array<{ address: string; symbol: string; name: string; decimals: number; logoURI: string }>> = {
        ethereum: [
          { address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", symbol: "ETH", name: "Ethereum", decimals: 18, logoURI: "" },
          { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", symbol: "USDC", name: "USD Coin", decimals: 6, logoURI: "" },
          { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", symbol: "USDT", name: "Tether USD", decimals: 6, logoURI: "" },
          { address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", symbol: "DAI", name: "Dai Stablecoin", decimals: 18, logoURI: "" },
          { address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", symbol: "WBTC", name: "Wrapped BTC", decimals: 8, logoURI: "" },
          { address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", symbol: "WETH", name: "Wrapped Ether", decimals: 18, logoURI: "" },
          { address: "0x514910771AF9Ca656af840dff83E8264EcF986CA", symbol: "LINK", name: "Chainlink", decimals: 18, logoURI: "" },
          { address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", symbol: "UNI", name: "Uniswap", decimals: 18, logoURI: "" },
          { address: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9", symbol: "AAVE", name: "Aave", decimals: 18, logoURI: "" },
          { address: "0xD533a949740bb3306d119CC777fa900bA034cd52", symbol: "CRV", name: "Curve DAO Token", decimals: 18, logoURI: "" },
          { address: "0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2", symbol: "MKR", name: "Maker", decimals: 18, logoURI: "" },
          { address: "0xae78736Cd615f374D3085123A210448E74Fc6393", symbol: "rETH", name: "Rocket Pool ETH", decimals: 18, logoURI: "" },
          { address: "0xBe9895146f7AF43049ca1c1AE358B0541Ea49704", symbol: "cbETH", name: "Coinbase Wrapped ETH", decimals: 18, logoURI: "" },
          { address: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0", symbol: "wstETH", name: "Wrapped stETH", decimals: 18, logoURI: "" },
          { address: "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE", symbol: "SHIB", name: "Shiba Inu", decimals: 18, logoURI: "" },
          { address: "0x6982508145454Ce325dDbE47a25d4ec3d2311933", symbol: "PEPE", name: "Pepe", decimals: 18, logoURI: "" },
        ],
        polygon: [
          { address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", symbol: "MATIC", name: "Polygon", decimals: 18, logoURI: "" },
          { address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", symbol: "USDC", name: "USD Coin", decimals: 6, logoURI: "" },
          { address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", symbol: "USDT", name: "Tether USD", decimals: 6, logoURI: "" },
          { address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", symbol: "WETH", name: "Wrapped Ether", decimals: 18, logoURI: "" },
          { address: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6", symbol: "WBTC", name: "Wrapped BTC", decimals: 8, logoURI: "" },
          { address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", symbol: "DAI", name: "Dai Stablecoin", decimals: 18, logoURI: "" },
          { address: "0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39", symbol: "LINK", name: "Chainlink", decimals: 18, logoURI: "" },
          { address: "0xb33EaAd8d922B1083446DC23f610c2567fB5180f", symbol: "UNI", name: "Uniswap", decimals: 18, logoURI: "" },
          { address: "0xD6DF932A45C0f255f85145f286eA0b292B21C90B", symbol: "AAVE", name: "Aave", decimals: 18, logoURI: "" },
        ],
        arbitrum: [
          { address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", symbol: "ETH", name: "Ethereum", decimals: 18, logoURI: "" },
          { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", symbol: "USDC", name: "USD Coin", decimals: 6, logoURI: "" },
          { address: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8", symbol: "USDC.e", name: "Bridged USDC", decimals: 6, logoURI: "" },
          { address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", symbol: "USDT", name: "Tether USD", decimals: 6, logoURI: "" },
          { address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", symbol: "WBTC", name: "Wrapped BTC", decimals: 8, logoURI: "" },
          { address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", symbol: "WETH", name: "Wrapped Ether", decimals: 18, logoURI: "" },
          { address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", symbol: "DAI", name: "Dai Stablecoin", decimals: 18, logoURI: "" },
          { address: "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", symbol: "LINK", name: "Chainlink", decimals: 18, logoURI: "" },
          { address: "0x912CE59144191C1204E64559FE8253a0e49E6548", symbol: "ARB", name: "Arbitrum", decimals: 18, logoURI: "" },
          { address: "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a", symbol: "GMX", name: "GMX", decimals: 18, logoURI: "" },
        ],
        bsc: [
          { address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", symbol: "BNB", name: "BNB", decimals: 18, logoURI: "" },
          { address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", symbol: "USDC", name: "USD Coin", decimals: 18, logoURI: "" },
          { address: "0x55d398326f99059fF775485246999027B3197955", symbol: "USDT", name: "Tether USD", decimals: 18, logoURI: "" },
          { address: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8", symbol: "ETH", name: "Ethereum", decimals: 18, logoURI: "" },
          { address: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", symbol: "BTCB", name: "Bitcoin BEP2", decimals: 18, logoURI: "" },
          { address: "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3", symbol: "DAI", name: "Dai Stablecoin", decimals: 18, logoURI: "" },
          { address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", symbol: "WBNB", name: "Wrapped BNB", decimals: 18, logoURI: "" },
          { address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82", symbol: "CAKE", name: "PancakeSwap", decimals: 18, logoURI: "" },
        ],
      };

      const chainTokens = EVM_TOKENS[searchChain] || [];
      const q2 = query.toLowerCase();
      const evmFiltered = q2
        ? chainTokens.filter(t =>
            t.symbol.toLowerCase().includes(q2) ||
            t.name.toLowerCase().includes(q2) ||
            t.address.toLowerCase() === q2
          )
        : chainTokens;

      return new Response(
        JSON.stringify({
          success: true,
          tokens: evmFiltered.slice(0, 30).map(t => ({
            ...t,
            isVerified: true,
          })),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
