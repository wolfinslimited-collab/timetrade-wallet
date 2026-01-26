import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TATUM_API_KEY = Deno.env.get('TATUM_API_KEY');
const TATUM_BASE_URL = 'https://api.tatum.io/v3';
const TATUM_V4_BASE_URL = 'https://api.tatum.io/v4';

type Chain = 'ethereum' | 'bitcoin' | 'solana' | 'polygon';

type ActionType = 'getBalance' | 'getTransactions' | 'estimateGas' | 'getPrices' | 'broadcastTransaction';

interface WalletBalanceRequest {
  action: ActionType;
  chain: Chain;
  address: string;
  testnet?: boolean;
  symbols?: string[]; // For getPrices action
  // For broadcastTransaction action
  signedTransaction?: string;
  to?: string;
  amount?: string;
  gasPrice?: string;
  gasLimit?: string;
}

interface ChainConfig {
  symbol: string;
  decimals: number;
  balanceEndpoint: (address: string, testnet: boolean) => string;
  txEndpoint: (address: string, testnet: boolean) => string;
  gasEndpoint: (testnet: boolean) => string;
  explorerUrl: (testnet: boolean) => string;
}

// Chain configurations for Tatum API v3
const chainConfigs: Record<Chain, ChainConfig> = {
  ethereum: {
    symbol: 'ETH',
    decimals: 18,
    balanceEndpoint: (address, testnet) => 
      `/ethereum/account/balance/${address}${testnet ? '?testnet=true' : ''}`,
    txEndpoint: (address, testnet) => 
      `/ethereum/account/transaction/${address}?pageSize=20${testnet ? '&testnet=true' : ''}`,
    gasEndpoint: (testnet) => 
      `/ethereum/gas${testnet ? '?testnet=true' : ''}`,
    explorerUrl: (testnet) => 
      testnet ? 'https://sepolia.etherscan.io' : 'https://etherscan.io',
  },
  polygon: {
    symbol: 'MATIC',
    decimals: 18,
    balanceEndpoint: (address, testnet) => 
      `/polygon/account/balance/${address}${testnet ? '?testnet=true' : ''}`,
    txEndpoint: (address, testnet) => 
      `/polygon/account/transaction/${address}?pageSize=20${testnet ? '&testnet=true' : ''}`,
    gasEndpoint: (testnet) => 
      `/polygon/gas${testnet ? '?testnet=true' : ''}`,
    explorerUrl: (testnet) => 
      testnet ? 'https://amoy.polygonscan.com' : 'https://polygonscan.com',
  },
  bitcoin: {
    symbol: 'BTC',
    decimals: 8,
    balanceEndpoint: (address, testnet) => 
      `/bitcoin/address/balance/${address}${testnet ? '?testnet=true' : ''}`,
    txEndpoint: (address, testnet) => 
      `/bitcoin/transaction/address/${address}?pageSize=20${testnet ? '&testnet=true' : ''}`,
    gasEndpoint: () => '/bitcoin/fee', // BTC doesn't have gas, returns fee recommendations
    explorerUrl: (testnet) => 
      testnet ? 'https://mempool.space/testnet' : 'https://mempool.space',
  },
  solana: {
    symbol: 'SOL',
    decimals: 9,
    balanceEndpoint: (address) => 
      `/solana/account/balance/${address}`,
    txEndpoint: (address) => 
      `/solana/account/transaction/${address}?pageSize=20`,
    gasEndpoint: () => '/solana/fee', // Returns priority fee recommendations
    explorerUrl: (testnet) => 
      testnet ? 'https://explorer.solana.com?cluster=devnet' : 'https://explorer.solana.com',
  },
};

// Known SPL tokens on Solana (mainnet mint addresses)
const KNOWN_SPL_TOKENS: Record<string, { name: string; symbol: string; decimals: number; logo?: string }> = {
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { name: 'USD Coin', symbol: 'USDC', decimals: 6, logo: '💵' },
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': { name: 'Tether USD', symbol: 'USDT', decimals: 6, logo: '💲' },
  'So11111111111111111111111111111111111111112': { name: 'Wrapped SOL', symbol: 'WSOL', decimals: 9, logo: '◎' },
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': { name: 'Bonk', symbol: 'BONK', decimals: 5, logo: '🐕' },
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': { name: 'Jupiter', symbol: 'JUP', decimals: 6, logo: '🪐' },
};

async function tatumRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${TATUM_BASE_URL}${endpoint}`;
  console.log(`Tatum request: ${url}`);
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'x-api-key': TATUM_API_KEY!,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const responseText = await response.text();
  
  if (!response.ok) {
    console.error(`Tatum API error: ${response.status} - ${responseText}`);
    throw new Error(`Tatum API error: ${response.status} - ${responseText}`);
  }

  try {
    return JSON.parse(responseText);
  } catch {
    console.log('Raw response:', responseText);
    return { balance: responseText };
  }
}

async function tatumRequestV4(endpoint: string, options: RequestInit = {}) {
  const url = `${TATUM_V4_BASE_URL}${endpoint}`;
  console.log(`Tatum v4 request: ${url}`);

  const response = await fetch(url, {
    ...options,
    headers: {
      'x-api-key': TATUM_API_KEY!,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const responseText = await response.text();

  if (!response.ok) {
    console.error(`Tatum v4 API error: ${response.status} - ${responseText}`);
    throw new Error(`Tatum v4 API error: ${response.status} - ${responseText}`);
  }

  try {
    return JSON.parse(responseText);
  } catch {
    console.log('Tatum v4 raw response:', responseText);
    return responseText;
  }
}

function toBaseUnits(value: string | number, decimals: number): string {
  const s = String(value ?? '0').trim();
  if (!s || s === '0') return '0';

  const negative = s.startsWith('-');
  const unsigned = negative ? s.slice(1) : s;

  const [intPartRaw, fracRaw = ''] = unsigned.split('.');
  const intPart = (intPartRaw || '0').replace(/^0+(?=\d)/, '') || '0';
  const frac = fracRaw.padEnd(decimals, '0').slice(0, decimals);

  // Combine and strip leading zeros
  const combined = `${intPart}${frac}`.replace(/^0+(?=\d)/, '') || '0';
  return negative ? `-${combined}` : combined;
}

function isNonZeroBaseUnit(balance: string): boolean {
  return !!balance && balance !== '0';
}

type RawTokenBalance = {
  tokenAddress?: string;
  contractAddress?: string;
  symbol?: string;
  name?: string;
  decimals?: number;
  balance?: string | number;
  type?: string;
  tokenType?: string;
};

function extractV4Balances(raw: unknown): RawTokenBalance[] {
  if (Array.isArray(raw)) {
    // Either an array of balances OR an array of { balances: [...] }
    const first = raw[0] as any;
    if (first && Array.isArray(first.balances)) return first.balances;
    return raw as RawTokenBalance[];
  }

  const obj = raw as any;
  if (obj && Array.isArray(obj.balances)) return obj.balances;
  if (obj && Array.isArray(obj.data)) return obj.data;
  if (obj && Array.isArray(obj.result)) return obj.result;
  return [];
}

// Popular testnet ERC-20 tokens for display
const KNOWN_TOKENS: Record<string, { name: string; symbol: string; decimals: number; logo?: string }> = {
  // Ethereum Mainnet
  '0xdac17f958d2ee523a2206206994597c13d831ec7': { name: 'Tether USD', symbol: 'USDT', decimals: 6, logo: '💲' },
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': { name: 'USD Coin', symbol: 'USDC', decimals: 6, logo: '💵' },
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': { name: 'Wrapped Ether', symbol: 'WETH', decimals: 18, logo: '⟠' },

  // Ethereum Sepolia testnet tokens
  '0x779877a7b0d9e8603169ddbd7836e478b4624789': { name: 'Chainlink', symbol: 'LINK', decimals: 18, logo: '🔗' },
  '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238': { name: 'USD Coin', symbol: 'USDC', decimals: 6, logo: '💵' },
  '0xaa8e23fb1079ea71e0a56f48a2aa51851d8433d0': { name: 'Tether USD', symbol: 'USDT', decimals: 6, logo: '💲' },
  '0x7b79995e5f793a07bc00c21412e50ecae098e7f9': { name: 'Wrapped Ether', symbol: 'WETH', decimals: 18, logo: '⟠' },

  // Polygon Amoy testnet tokens
  '0x0fa8781a83e46826621b3bc094ea2a0212e71b23': { name: 'USD Coin', symbol: 'USDC', decimals: 6, logo: '💵' },
  '0x360ad4f9a9a8efe9a8dcb5f461c4cc1047e1dcf9': { name: 'Wrapped Matic', symbol: 'WMATIC', decimals: 18, logo: '⬡' },

  // Polygon Mainnet
  '0x2791bca1f2de4661ed88a30c99a7a9449aa84174': { name: 'USD Coin', symbol: 'USDC', decimals: 6, logo: '💵' },
};

async function getERC20Tokens(chain: Chain, address: string, testnet: boolean): Promise<Array<{
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  contractAddress: string;
  logo?: string;
}>> {
  // Only fetch tokens for EVM chains
  if (chain !== 'ethereum' && chain !== 'polygon') {
    return [];
  }

  try {
    // ✅ Use Tatum v4 balances endpoint (v3 /data/tokens currently validates tokenAddress and fails)
    const endpoint = `/data/balances?chain=${chain}&addresses=${encodeURIComponent(address)}`;
    console.log(`Fetching ERC-20 tokens (v4) for ${chain}: ${endpoint}`);

    const raw = await tatumRequestV4(endpoint);
    const balances = extractV4Balances(raw);

    const tokens = balances
      .filter((b) => {
        const addr = (b.tokenAddress || b.contractAddress || '').toLowerCase();
        // Keep only fungible token balances; exclude native
        if (!addr || addr === 'native') return false;
        return true;
      })
      .map((b) => {
        const contractAddress = b.tokenAddress || b.contractAddress || '';
        const decimals = typeof b.decimals === 'number' ? b.decimals : 18;
        const knownToken = KNOWN_TOKENS[contractAddress.toLowerCase()];
        const baseBalance = toBaseUnits(b.balance ?? '0', knownToken?.decimals ?? decimals);

        return {
          symbol: knownToken?.symbol || b.symbol || 'UNKNOWN',
          name: knownToken?.name || b.name || 'Unknown Token',
          balance: baseBalance,
          decimals: knownToken?.decimals || decimals,
          contractAddress,
          logo: knownToken?.logo,
        };
      })
      .filter((t) => isNonZeroBaseUnit(t.balance));

    return tokens;
  } catch (error) {
    console.error(`Error fetching ${chain} ERC-20 tokens (v4):`, error);
    return [];
  }
}

// Fetch SPL tokens for Solana addresses
async function getSPLTokens(address: string): Promise<Array<{
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  contractAddress: string;
  logo?: string;
}>> {
  try {
    // ✅ Use Tatum v4 balances endpoint
    const endpoint = `/data/balances?chain=solana&addresses=${encodeURIComponent(address)}`;
    console.log(`Fetching SPL tokens (v4) for solana: ${endpoint}`);

    const raw = await tatumRequestV4(endpoint);
    const balances = extractV4Balances(raw);

    const tokens = balances
      .filter((b) => {
        const addr = (b.tokenAddress || b.contractAddress || '').toLowerCase();
        if (!addr || addr === 'native') return false;
        return true;
      })
      .map((b) => {
        const contractAddress = b.tokenAddress || b.contractAddress || '';
        const knownToken = KNOWN_SPL_TOKENS[contractAddress] || undefined;
        const decimals = knownToken?.decimals ?? (typeof b.decimals === 'number' ? b.decimals : 9);
        const baseBalance = toBaseUnits(b.balance ?? '0', decimals);

        return {
          symbol: knownToken?.symbol || b.symbol || 'UNKNOWN',
          name: knownToken?.name || b.name || 'Unknown Token',
          balance: baseBalance,
          decimals,
          contractAddress,
          logo: knownToken?.logo,
        };
      })
      .filter((t) => isNonZeroBaseUnit(t.balance));

    return tokens;
  } catch (error) {
    console.error(`Error fetching Solana SPL tokens (v4):`, error);
    // Return empty array on error - don't fail the whole balance request
    return [];
  }
}

// Unified token fetching function
async function getTokens(chain: Chain, address: string, testnet: boolean): Promise<Array<{
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  contractAddress: string;
  logo?: string;
}>> {
  if (chain === 'solana') {
    return getSPLTokens(address);
  } else if (chain === 'ethereum' || chain === 'polygon') {
    return getERC20Tokens(chain, address, testnet);
  }
  return [];
}

async function getBalance(chain: Chain, address: string, testnet: boolean = true) {
  const config = chainConfigs[chain];
  
  try {
    // Fetch native balance and tokens in parallel
    const [balanceData, tokens] = await Promise.all([
      tatumRequest(config.balanceEndpoint(address, testnet)),
      getTokens(chain, address, testnet),
    ]);
    
    console.log(`${chain} balance response:`, JSON.stringify(balanceData));
    
    // Normalize to base units so the frontend can safely divide by decimals.
    let rawBalance: string | number = '0';
    if (typeof balanceData === 'object' && balanceData) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bd: any = balanceData;
      rawBalance = bd.balance ?? (bd.incoming ? (parseFloat(bd.incoming) - parseFloat(bd.outgoing || '0')) : '0');
    } else if (typeof balanceData === 'string' || typeof balanceData === 'number') {
      rawBalance = balanceData;
    }

    const balance = toBaseUnits(rawBalance, config.decimals);
    
    return {
      chain,
      native: {
        symbol: config.symbol,
        balance,
        decimals: config.decimals,
      },
      tokens,
      explorerUrl: config.explorerUrl(testnet),
    };
  } catch (error) {
    console.error(`Error fetching ${chain} balance:`, error);
    return {
      chain,
      native: {
        symbol: config.symbol,
        balance: '0',
        decimals: config.decimals,
      },
      tokens: [],
      explorerUrl: config.explorerUrl(testnet),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function getTransactions(chain: Chain, address: string, testnet: boolean = true) {
  const config = chainConfigs[chain];
  
  try {
    const endpoint = config.txEndpoint(address, testnet);
    const txData = await tatumRequest(endpoint);
    console.log(`${chain} transactions response:`, JSON.stringify(txData));
    
    // Normalize transaction format across chains
    const transactions = Array.isArray(txData) ? txData : (txData.transactions || []);
    
    return {
      chain,
      transactions: transactions.map((tx: {
        hash?: string;
        txId?: string;
        signature?: string;
        from?: string;
        to?: string;
        inputs?: Array<{ address?: string }>;
        outputs?: Array<{ address?: string }>;
        value?: string;
        amount?: string;
        timestamp?: number;
        blockTime?: number;
        status?: string;
        blockNumber?: number;
        blockHeight?: number;
      }) => ({
        hash: tx.hash || tx.txId || tx.signature,
        from: tx.from || (tx.inputs && tx.inputs[0]?.address),
        to: tx.to || (tx.outputs && tx.outputs[0]?.address),
        value: tx.value || tx.amount,
        timestamp: tx.timestamp || tx.blockTime,
        status: tx.status || 'confirmed',
        blockNumber: tx.blockNumber || tx.blockHeight,
      })),
      explorerUrl: config.explorerUrl(testnet),
    };
  } catch (error) {
    console.error(`Error fetching ${chain} transactions:`, error);
    return {
      chain,
      transactions: [],
      explorerUrl: config.explorerUrl(testnet),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function estimateGas(chain: Chain, testnet: boolean = true) {
  const config = chainConfigs[chain];
  
  try {
    const endpoint = config.gasEndpoint(testnet);
    const gasData = await tatumRequest(endpoint);
    console.log(`${chain} gas estimate response:`, JSON.stringify(gasData));
    
    // Normalize gas/fee response across chains
    if (chain === 'bitcoin') {
      // Bitcoin returns fee in satoshis per byte
      return {
        chain,
        slow: { fee: gasData.slow || '10', estimatedTime: 3600 }, // ~1 hour
        medium: { fee: gasData.medium || '20', estimatedTime: 1800 }, // ~30 min
        fast: { fee: gasData.fast || '50', estimatedTime: 600 }, // ~10 min
        unit: 'sat/byte',
      };
    } else if (chain === 'solana') {
      // Solana returns priority fee in lamports
      return {
        chain,
        slow: { fee: gasData.low || '5000', estimatedTime: 60 },
        medium: { fee: gasData.medium || '10000', estimatedTime: 30 },
        fast: { fee: gasData.high || '25000', estimatedTime: 10 },
        unit: 'lamports',
      };
    } else {
      // Ethereum/Polygon return gas price in gwei
      return {
        chain,
        slow: { 
          gasPrice: gasData.slow?.gasPrice || gasData.safeLow || '10', 
          estimatedTime: 300 
        },
        medium: { 
          gasPrice: gasData.standard?.gasPrice || gasData.average || '20', 
          estimatedTime: 60 
        },
        fast: { 
          gasPrice: gasData.fast?.gasPrice || gasData.fastest || '30', 
          estimatedTime: 15 
        },
        baseFee: gasData.baseFee,
        unit: 'gwei',
      };
    }
  } catch (error) {
    console.error(`Error estimating ${chain} gas:`, error);
    // Return fallback values
    if (chain === 'bitcoin') {
      return {
        chain,
        slow: { fee: '10', estimatedTime: 3600 },
        medium: { fee: '20', estimatedTime: 1800 },
        fast: { fee: '50', estimatedTime: 600 },
        unit: 'sat/byte',
      };
    } else if (chain === 'solana') {
      return {
        chain,
        slow: { fee: '5000', estimatedTime: 60 },
        medium: { fee: '10000', estimatedTime: 30 },
        fast: { fee: '25000', estimatedTime: 10 },
        unit: 'lamports',
      };
    } else {
      return {
        chain,
        slow: { gasPrice: '10', estimatedTime: 300 },
        medium: { gasPrice: '20', estimatedTime: 60 },
        fast: { gasPrice: '30', estimatedTime: 15 },
        unit: 'gwei',
      };
    }
  }
}

// CoinGecko ID mapping for symbols
const COINGECKO_IDS: Record<string, string> = {
  ETH: 'ethereum',
  BTC: 'bitcoin',
  SOL: 'solana',
  MATIC: 'matic-network',
  USDC: 'usd-coin',
  USDT: 'tether',
  DAI: 'dai',
  LINK: 'chainlink',
  UNI: 'uniswap',
  AAVE: 'aave',
  WETH: 'weth',
  WBTC: 'wrapped-bitcoin',
  WMATIC: 'wmatic',
};

interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  marketCap?: number;
  volume24h?: number;
  lastUpdated: string;
}

async function getPrices(symbols: string[] = ['ETH', 'BTC', 'SOL', 'MATIC']): Promise<PriceData[]> {
  try {
    // Map symbols to CoinGecko IDs
    const ids = symbols
      .map(s => COINGECKO_IDS[s.toUpperCase()])
      .filter(Boolean)
      .join(',');

    if (!ids) {
      console.log('No valid symbols to fetch prices for');
      return symbols.map(s => ({
        symbol: s,
        price: 0,
        change24h: 0,
        lastUpdated: new Date().toISOString(),
      }));
    }

    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`;
    console.log(`Fetching prices from CoinGecko: ${url}`);

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`CoinGecko API error: ${response.status} - ${errorText}`);
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('CoinGecko response:', JSON.stringify(data));

    // Map back to symbols
    const prices: PriceData[] = symbols.map(symbol => {
      const geckoId = COINGECKO_IDS[symbol.toUpperCase()];
      const priceData = geckoId ? data[geckoId] : null;

      return {
        symbol: symbol.toUpperCase(),
        price: priceData?.usd || 0,
        change24h: priceData?.usd_24h_change || 0,
        marketCap: priceData?.usd_market_cap,
        volume24h: priceData?.usd_24h_vol,
        lastUpdated: new Date().toISOString(),
      };
    });

    return prices;
  } catch (error) {
    console.error('Error fetching prices:', error);
    // Return fallback prices
    return symbols.map(symbol => ({
      symbol: symbol.toUpperCase(),
      price: 0,
      change24h: 0,
      lastUpdated: new Date().toISOString(),
    }));
  }
}

// Broadcast a signed transaction to the blockchain
async function broadcastTransaction(
  chain: Chain, 
  signedTransaction: string, 
  testnet: boolean = false
): Promise<{ txHash: string; explorerUrl: string }> {
  const config = chainConfigs[chain];
  
  if (!signedTransaction) {
    throw new Error('Signed transaction hex is required');
  }

  console.log(`Broadcasting ${chain} transaction (testnet: ${testnet})`);

  let endpoint: string;
  let body: object;

  switch (chain) {
    case 'ethereum':
      endpoint = `/ethereum/broadcast${testnet ? '?testnet=true' : ''}`;
      body = { txData: signedTransaction };
      break;
    case 'polygon':
      endpoint = `/polygon/broadcast${testnet ? '?testnet=true' : ''}`;
      body = { txData: signedTransaction };
      break;
    case 'bitcoin':
      endpoint = `/bitcoin/broadcast${testnet ? '?testnet=true' : ''}`;
      body = { txData: signedTransaction };
      break;
    case 'solana':
      endpoint = `/solana/broadcast`;
      body = { txData: signedTransaction };
      break;
    default:
      throw new Error(`Unsupported chain for broadcast: ${chain}`);
  }

  const result = await tatumRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  console.log(`${chain} broadcast response:`, JSON.stringify(result));

  const txHash = result.txId || result.txHash || result.signatureId || result;
  
  if (!txHash) {
    throw new Error('Failed to get transaction hash from broadcast response');
  }

  const explorerBase = config.explorerUrl(testnet);
  let explorerUrl: string;

  switch (chain) {
    case 'bitcoin':
      explorerUrl = `${explorerBase}/tx/${txHash}`;
      break;
    case 'solana':
      explorerUrl = `${explorerBase}/tx/${txHash}${testnet ? '?cluster=devnet' : ''}`;
      break;
    default:
      explorerUrl = `${explorerBase}/tx/${txHash}`;
  }

  return {
    txHash: typeof txHash === 'string' ? txHash : JSON.stringify(txHash),
    explorerUrl,
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: WalletBalanceRequest = await req.json();
    const { action, chain, address, testnet = true, symbols, signedTransaction } = body;

    console.log(`Processing ${action} for ${chain} address: ${address}, testnet: ${testnet}`);

    let result;

    switch (action) {
      case 'getBalance':
        if (!TATUM_API_KEY) {
          throw new Error('TATUM_API_KEY is not configured');
        }
        if (!address) {
          throw new Error('Address is required for getBalance');
        }
        // Validate chain for balance
        if (!chainConfigs[chain]) {
          throw new Error(`Unsupported chain: ${chain}. Supported chains: ${Object.keys(chainConfigs).join(', ')}`);
        }
        result = await getBalance(chain, address, testnet);
        break;

      case 'getTransactions':
        if (!TATUM_API_KEY) {
          throw new Error('TATUM_API_KEY is not configured');
        }
        if (!address) {
          throw new Error('Address is required for getTransactions');
        }
        if (!chainConfigs[chain]) {
          throw new Error(`Unsupported chain: ${chain}. Supported chains: ${Object.keys(chainConfigs).join(', ')}`);
        }
        result = await getTransactions(chain, address, testnet);
        break;

      case 'estimateGas':
        if (!TATUM_API_KEY) {
          throw new Error('TATUM_API_KEY is not configured');
        }
        if (!chainConfigs[chain]) {
          throw new Error(`Unsupported chain: ${chain}. Supported chains: ${Object.keys(chainConfigs).join(', ')}`);
        }
        result = await estimateGas(chain, testnet);
        break;

      case 'getPrices':
        // CoinGecko doesn't require API key for basic usage
        result = await getPrices(symbols || ['ETH', 'BTC', 'SOL', 'MATIC']);
        break;

      case 'broadcastTransaction':
        if (!TATUM_API_KEY) {
          throw new Error('TATUM_API_KEY is not configured');
        }
        if (!signedTransaction) {
          throw new Error('Signed transaction is required for broadcastTransaction');
        }
        if (!chainConfigs[chain]) {
          throw new Error(`Unsupported chain: ${chain}. Supported chains: ${Object.keys(chainConfigs).join(', ')}`);
        }
        // For mainnet transactions, testnet defaults to false
        result = await broadcastTransaction(chain, signedTransaction, testnet);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Edge function error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
