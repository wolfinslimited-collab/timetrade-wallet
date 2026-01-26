import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TATUM_API_KEY = Deno.env.get('TATUM_API_KEY');
const TATUM_BASE_URL = 'https://api.tatum.io/v3';

type Chain = 'ethereum' | 'bitcoin' | 'solana' | 'polygon';

interface WalletBalanceRequest {
  action: 'getBalance' | 'getTransactions' | 'estimateGas';
  chain: Chain;
  address: string;
  testnet?: boolean;
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

async function getBalance(chain: Chain, address: string, testnet: boolean = true) {
  const config = chainConfigs[chain];
  
  try {
    const endpoint = config.balanceEndpoint(address, testnet);
    const balanceData = await tatumRequest(endpoint);
    console.log(`${chain} balance response:`, JSON.stringify(balanceData));
    
    // Different chains return balance in different formats
    let balance = '0';
    if (typeof balanceData === 'object') {
      // Ethereum/Polygon return { balance: "..." }
      // Bitcoin returns { incoming: "...", outgoing: "..." } or { balance: "..." }
      // Solana returns { balance: "..." }
      balance = balanceData.balance || 
                (balanceData.incoming ? String(parseFloat(balanceData.incoming) - parseFloat(balanceData.outgoing || '0')) : '0');
    } else if (typeof balanceData === 'string') {
      balance = balanceData;
    }
    
    return {
      chain,
      native: {
        symbol: config.symbol,
        balance,
        decimals: config.decimals,
      },
      tokens: [], // Token balances would require additional API calls
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!TATUM_API_KEY) {
      throw new Error('TATUM_API_KEY is not configured');
    }

    const body: WalletBalanceRequest = await req.json();
    const { action, chain, address, testnet = true } = body;

    // Validate chain
    if (!chainConfigs[chain]) {
      throw new Error(`Unsupported chain: ${chain}. Supported chains: ${Object.keys(chainConfigs).join(', ')}`);
    }

    console.log(`Processing ${action} for ${chain} address: ${address}, testnet: ${testnet}`);

    let result;

    switch (action) {
      case 'getBalance':
        if (!address) {
          throw new Error('Address is required for getBalance');
        }
        result = await getBalance(chain, address, testnet);
        break;

      case 'getTransactions':
        if (!address) {
          throw new Error('Address is required for getTransactions');
        }
        result = await getTransactions(chain, address, testnet);
        break;

      case 'estimateGas':
        result = await estimateGas(chain, testnet);
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
