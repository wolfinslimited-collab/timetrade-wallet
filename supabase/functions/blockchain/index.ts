import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TATUM_API_KEY = Deno.env.get('TATUM_API_KEY');
const TATUM_BASE_URL = 'https://api.tatum.io/v3';
const TATUM_V4_BASE_URL = 'https://api.tatum.io/v4';

type Chain = 'ethereum' | 'bitcoin' | 'solana' | 'polygon' | 'tron';

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
    gasEndpoint: () => '/bitcoin/fee',
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
    gasEndpoint: () => '/solana/fee',
    explorerUrl: (testnet) => 
      testnet ? 'https://explorer.solana.com?cluster=devnet' : 'https://explorer.solana.com',
  },
  tron: {
    symbol: 'TRX',
    decimals: 6,
    balanceEndpoint: (address) => 
      `/tron/account/${address}`,
    txEndpoint: (address) => 
      `/tron/transaction/account/${address}?pageSize=20`,
    gasEndpoint: () => '/tron/fee',
    explorerUrl: (testnet) => 
      testnet ? 'https://shasta.tronscan.org' : 'https://tronscan.org',
  },
};

// Known SPL tokens on Solana (mainnet mint addresses)
const KNOWN_SPL_TOKENS: Record<string, { name: string; symbol: string; decimals: number; logo?: string }> = {
  // Major stablecoins
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { name: 'USD Coin', symbol: 'USDC', decimals: 6, logo: '💵' },
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': { name: 'Tether USD', symbol: 'USDT', decimals: 6, logo: '💲' },
  'USDSwr9ApdHk5bvJKMjzff41FfuX8bSxdKcR81vTwcA': { name: 'USDS', symbol: 'USDS', decimals: 6, logo: '💵' },
  'USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX': { name: 'USDH', symbol: 'USDH', decimals: 6, logo: '💵' },
  
  // Wrapped tokens
  'So11111111111111111111111111111111111111112': { name: 'Wrapped SOL', symbol: 'WSOL', decimals: 9, logo: '◎' },
  '9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E': { name: 'Wrapped BTC (Sollet)', symbol: 'BTC', decimals: 6, logo: '₿' },
  '2FPyTwcZLUg1MDrwsyoP4D6s1tM7hAkHYRjkNb5w6Pxk': { name: 'Wrapped ETH (Sollet)', symbol: 'ETH', decimals: 6, logo: '⟠' },
  '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs': { name: 'Wrapped ETH (Wormhole)', symbol: 'weETH', decimals: 8, logo: '⟠' },
  '3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh': { name: 'Wrapped BTC (Wormhole)', symbol: 'wBTC', decimals: 8, logo: '₿' },
  
  // Major DeFi tokens
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': { name: 'Jupiter', symbol: 'JUP', decimals: 6, logo: '🪐' },
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': { name: 'Marinade Staked SOL', symbol: 'mSOL', decimals: 9, logo: '🥩' },
  '7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj': { name: 'Lido Staked SOL', symbol: 'stSOL', decimals: 9, logo: '🌊' },
  'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL': { name: 'JTO', symbol: 'JTO', decimals: 9, logo: '🏛️' },
  'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE': { name: 'Orca', symbol: 'ORCA', decimals: 6, logo: '🐋' },
  'RasYALBDLb3vW7icNVHzkd9E6VHM7qQKoTkbUPSBvrd': { name: 'Raydium', symbol: 'RAY', decimals: 6, logo: '☀️' },
  'SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt': { name: 'Serum', symbol: 'SRM', decimals: 6, logo: '🧪' },
  
  // Meme coins
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': { name: 'Bonk', symbol: 'BONK', decimals: 5, logo: '🐕' },
  'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm': { name: 'dogwifhat', symbol: 'WIF', decimals: 6, logo: '🐶' },
  'ED5nyyWEzpPPiWimP8vYm7sD7TD3LAt3Q3gRTWHzPJBY': { name: 'MOODENG', symbol: 'MOODENG', decimals: 6, logo: '🦛' },
  
  // Gaming/NFT tokens
  'ATLASXmbPQxBUYbxPsV97usA3fPQYEqzQBUHgiFCUsXx': { name: 'Star Atlas', symbol: 'ATLAS', decimals: 8, logo: '🚀' },
  'poLisWXnNRwC6oBu1vHiuKQzFjGL4XDSu4g9qjz9qVk': { name: 'Star Atlas DAO', symbol: 'POLIS', decimals: 8, logo: '🏛️' },
};

// Known TRC-20 tokens on Tron (mainnet contract addresses)
const KNOWN_TRC20_TOKENS: Record<string, { name: string; symbol: string; decimals: number; logo?: string }> = {
  // Major stablecoins
  'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t': { name: 'Tether USD', symbol: 'USDT', decimals: 6, logo: '💲' },
  'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8': { name: 'USD Coin', symbol: 'USDC', decimals: 6, logo: '💵' },
  'TUPM7K8REVzD2UdV4R5fe5M8XbnR2DdoJ6': { name: 'TrueUSD', symbol: 'TUSD', decimals: 18, logo: '💵' },
  'TMwFHYXLJaRUPeW6421aqXL4ZEzPRFGkGT': { name: 'USDD', symbol: 'USDD', decimals: 18, logo: '💵' },
  
  // Wrapped tokens
  'TXpw8XeWYeTUd4quDskoUqeQPowRh4jY65': { name: 'Wrapped BTC', symbol: 'WBTC', decimals: 8, logo: '₿' },
  'THb4CqiFdwNHsWsQCs4JhzwjMWys4aqCbF': { name: 'Wrapped ETH', symbol: 'WETH', decimals: 18, logo: '⟠' },
  'TNUC9Qb1rRpS5CbWLmNMxXBjyFoydXjWFR': { name: 'Wrapped TRX', symbol: 'WTRX', decimals: 6, logo: '◈' },
  
  // DeFi tokens
  'TKkeiboTkxXKJpbmVFbv4a8ov5rAfRDMf9': { name: 'SunToken', symbol: 'SUN', decimals: 18, logo: '☀️' },
  'TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7': { name: 'WINk', symbol: 'WIN', decimals: 6, logo: '🃏' },
  'TSSMHYeV2uE9qYH95DqyoCuNCzEL1NvU3S': { name: 'JUST', symbol: 'JST', decimals: 18, logo: '⚖️' },
  'TAFjULxiVgT4qWk6UZwjqwZXTSaGaqnVp4': { name: 'BitTorrent', symbol: 'BTT', decimals: 18, logo: '🔄' },
  
  // Other popular tokens
  'TF17BgPaZYbz8oxbjhriubPDsA7ArKoLX3': { name: 'JUST Stablecoin', symbol: 'USDJ', decimals: 18, logo: '💵' },
  'TCFLL5dx5ZJdKnWuesXxi1VPwjLVmWZZy9': { name: 'JUST', symbol: 'JST', decimals: 18, logo: '⚖️' },
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

// Fetch SPL tokens for Solana addresses using Tatum's Solana RPC endpoint
async function getSPLTokens(address: string): Promise<Array<{
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  contractAddress: string;
  logo?: string;
}>> {
  try {
    // Use Tatum's Solana JSON-RPC endpoint with getTokenAccountsByOwner
    // Token Program ID for SPL tokens
    const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
    
    const rpcBody = {
      jsonrpc: '2.0',
      id: 1,
      method: 'getTokenAccountsByOwner',
      params: [
        address,
        { programId: TOKEN_PROGRAM_ID },
        { encoding: 'jsonParsed' }
      ]
    };
    
    console.log(`Fetching SPL tokens via RPC for solana address: ${address}`);
    
    const response = await fetch('https://api.tatum.io/v3/blockchain/node/SOL', {
      method: 'POST',
      headers: {
        'x-api-key': TATUM_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(rpcBody),
    });
    
    const responseText = await response.text();
    
    if (!response.ok) {
      console.error(`Solana RPC error: ${response.status} - ${responseText}`);
      return [];
    }
    
    const rpcResult = JSON.parse(responseText);
    console.log(`Solana SPL tokens RPC response:`, JSON.stringify(rpcResult).slice(0, 500));
    
    if (rpcResult.error) {
      console.error(`Solana RPC error:`, rpcResult.error);
      return [];
    }
    
    const tokenAccounts = rpcResult.result?.value || [];
    
    const tokens = tokenAccounts
      .map((account: { 
        account: { 
          data: { 
            parsed: { 
              info: { 
                mint: string; 
                tokenAmount: { 
                  amount: string; 
                  decimals: number; 
                  uiAmountString: string;
                } 
              } 
            } 
          } 
        } 
      }) => {
        const info = account.account?.data?.parsed?.info;
        if (!info) return null;
        
        const contractAddress = info.mint;
        const tokenAmount = info.tokenAmount;
        const knownToken = KNOWN_SPL_TOKENS[contractAddress] || undefined;
        const decimals = knownToken?.decimals ?? tokenAmount.decimals;
        
        // Use the raw amount (already in base units)
        const balance = tokenAmount.amount;

        return {
          symbol: knownToken?.symbol || 'UNKNOWN',
          name: knownToken?.name || 'Unknown Token',
          balance,
          decimals,
          contractAddress,
          logo: knownToken?.logo,
        };
      })
      .filter((t: { balance: string } | null): t is { balance: string; symbol: string; name: string; decimals: number; contractAddress: string; logo?: string } => 
        t !== null && isNonZeroBaseUnit(t.balance)
      );

    return tokens;
  } catch (error) {
    console.error(`Error fetching Solana SPL tokens:`, error);
    // Return empty array on error - don't fail the whole balance request
    return [];
  }
}

// Fetch TRC-20 tokens for Tron addresses
async function getTRC20Tokens(address: string): Promise<Array<{
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  contractAddress: string;
  logo?: string;
}>> {
  try {
    // Use Tatum v3 endpoint for TRC-20 tokens
    const endpoint = `/tron/account/${address}`;
    console.log(`Fetching TRC-20 tokens for tron address: ${address}`);
    
    const accountData = await tatumRequest(endpoint);
    console.log(`Tron account data:`, JSON.stringify(accountData).slice(0, 1000));
    
    // TRC-20 tokens are in the trc20 array
    const trc20Balances = accountData.trc20 || [];
    
    const tokens = trc20Balances
      .map((tokenBalance: Record<string, string>) => {
        // Each item is an object like { "contractAddress": "balance" }
        const contractAddress = Object.keys(tokenBalance)[0];
        const rawBalance = tokenBalance[contractAddress];
        
        if (!contractAddress || !rawBalance) return null;
        
        const knownToken = KNOWN_TRC20_TOKENS[contractAddress];
        const decimals = knownToken?.decimals ?? 6; // Default to 6 for TRC-20
        
        return {
          symbol: knownToken?.symbol || 'UNKNOWN',
          name: knownToken?.name || 'Unknown Token',
          balance: rawBalance, // Already in base units
          decimals,
          contractAddress,
          logo: knownToken?.logo,
        };
      })
      .filter((t: { balance: string } | null): t is { balance: string; symbol: string; name: string; decimals: number; contractAddress: string; logo?: string } => 
        t !== null && isNonZeroBaseUnit(t.balance)
      );

    return tokens;
  } catch (error) {
    console.error(`Error fetching Tron TRC-20 tokens:`, error);
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
  } else if (chain === 'tron') {
    return getTRC20Tokens(address);
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
    
    if (chain === 'tron') {
      // Tron returns balance in sun (1 TRX = 1,000,000 sun)
      // The balance field is already in sun (base units)
      if (typeof balanceData === 'object' && balanceData) {
        rawBalance = balanceData.balance ?? '0';
      }
    } else if (typeof balanceData === 'object' && balanceData) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bd: any = balanceData;
      rawBalance = bd.balance ?? (bd.incoming ? (parseFloat(bd.incoming) - parseFloat(bd.outgoing || '0')) : '0');
    } else if (typeof balanceData === 'string' || typeof balanceData === 'number') {
      rawBalance = balanceData;
    }

    // For Tron, balance is already in base units (sun), for others we need to convert
    const balance = chain === 'tron' 
      ? String(rawBalance) 
      : toBaseUnits(rawBalance, config.decimals);
    
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
        txID?: string;
        from?: string;
        to?: string;
        inputs?: Array<{ address?: string }>;
        outputs?: Array<{ address?: string }>;
        ownerAddress?: string;
        toAddress?: string;
        value?: string;
        amount?: string;
        timestamp?: number;
        blockTime?: number;
        block_timestamp?: number;
        status?: string;
        blockNumber?: number;
        blockHeight?: number;
      }) => ({
        hash: tx.hash || tx.txId || tx.signature || tx.txID,
        from: tx.from || tx.ownerAddress || (tx.inputs && tx.inputs[0]?.address),
        to: tx.to || tx.toAddress || (tx.outputs && tx.outputs[0]?.address),
        value: tx.value || tx.amount,
        timestamp: tx.timestamp || tx.blockTime || tx.block_timestamp,
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
    } else if (chain === 'tron') {
      // Tron uses bandwidth/energy, return static estimates
      return {
        chain,
        slow: { fee: '1', estimatedTime: 60 },
        medium: { fee: '5', estimatedTime: 30 },
        fast: { fee: '10', estimatedTime: 10 },
        unit: 'TRX',
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
    } else if (chain === 'tron') {
      return {
        chain,
        slow: { fee: '1', estimatedTime: 60 },
        medium: { fee: '5', estimatedTime: 30 },
        fast: { fee: '10', estimatedTime: 10 },
        unit: 'TRX',
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
  TRX: 'tron',
  USDC: 'usd-coin',
  USDT: 'tether',
  DAI: 'dai',
  LINK: 'chainlink',
  UNI: 'uniswap',
  AAVE: 'aave',
  WETH: 'weth',
  WBTC: 'wrapped-bitcoin',
  WMATIC: 'wmatic',
  BTT: 'bittorrent',
  JST: 'just',
  SUN: 'sun-token',
  WIN: 'wink',
};

interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  marketCap?: number;
  volume24h?: number;
  lastUpdated: string;
}

async function getPrices(symbols: string[] = ['ETH', 'BTC', 'SOL', 'MATIC', 'TRX']): Promise<PriceData[]> {
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
    case 'tron':
      endpoint = `/tron/broadcast`;
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
    case 'tron':
      explorerUrl = `${explorerBase}/#/transaction/${txHash}`;
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
        result = await getPrices(symbols || ['ETH', 'BTC', 'SOL', 'MATIC', 'TRX']);
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
