import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TATUM_API_KEY = Deno.env.get('TATUM_API_KEY');
const TATUM_BASE_URL = 'https://api.tatum.io/v3';

interface WalletBalanceRequest {
  action: 'getBalance' | 'getTransactions' | 'estimateGas' | 'getTokenBalances';
  chain: 'ethereum' | 'bitcoin' | 'solana' | 'polygon';
  address: string;
  testnet?: boolean;
}

async function tatumRequest(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${TATUM_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'x-api-key': TATUM_API_KEY!,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Tatum API error: ${response.status} - ${errorText}`);
    throw new Error(`Tatum API error: ${response.status}`);
  }

  return response.json();
}

async function getEthereumBalance(address: string, testnet: boolean = true) {
  const network = testnet ? 'ethereum-sepolia' : 'ethereum-mainnet';
  try {
    // Get native ETH balance
    const balanceData = await tatumRequest(`/blockchain/token/balance/${network}/${address}`);
    console.log('Balance response:', JSON.stringify(balanceData));
    
    return {
      native: {
        symbol: 'ETH',
        balance: balanceData.balance || '0',
        decimals: 18,
      },
      tokens: balanceData.tokenBalances || [],
    };
  } catch (error) {
    console.error('Error fetching balance:', error);
    // Return empty balance on error
    return {
      native: {
        symbol: 'ETH',
        balance: '0',
        decimals: 18,
      },
      tokens: [],
    };
  }
}

async function getEthereumTransactions(address: string, testnet: boolean = true) {
  const network = testnet ? 'ethereum-sepolia' : 'ethereum-mainnet';
  try {
    const txData = await tatumRequest(`/blockchain/transaction/${network}/${address}?pageSize=20`);
    console.log('Transactions response:', JSON.stringify(txData));
    return txData;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
}

async function estimateGasFee(testnet: boolean = true) {
  const network = testnet ? 'ethereum-sepolia' : 'ethereum-mainnet';
  try {
    const gasData = await tatumRequest(`/blockchain/fee/${network}`);
    console.log('Gas estimate response:', JSON.stringify(gasData));
    return {
      slow: gasData.slow || { gasPrice: '10', estimatedTime: 300 },
      medium: gasData.medium || { gasPrice: '20', estimatedTime: 60 },
      fast: gasData.fast || { gasPrice: '30', estimatedTime: 15 },
    };
  } catch (error) {
    console.error('Error estimating gas:', error);
    return {
      slow: { gasPrice: '10', estimatedTime: 300 },
      medium: { gasPrice: '20', estimatedTime: 60 },
      fast: { gasPrice: '30', estimatedTime: 15 },
    };
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

    console.log(`Processing ${action} for ${chain} address: ${address}, testnet: ${testnet}`);

    let result;

    switch (action) {
      case 'getBalance':
        if (chain === 'ethereum') {
          result = await getEthereumBalance(address, testnet);
        } else {
          throw new Error(`Chain ${chain} not yet supported`);
        }
        break;

      case 'getTransactions':
        if (chain === 'ethereum') {
          result = await getEthereumTransactions(address, testnet);
        } else {
          throw new Error(`Chain ${chain} not yet supported`);
        }
        break;

      case 'estimateGas':
        result = await estimateGasFee(testnet);
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
