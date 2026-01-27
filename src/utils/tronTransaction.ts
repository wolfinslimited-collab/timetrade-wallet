import { sha256, keccak256, SigningKey, Signature } from 'ethers';

// Tron mainnet and testnet (Shasta/Nile) API endpoints
const TRON_API_URLS = {
  mainnet: 'https://api.trongrid.io',
  testnet: 'https://api.shasta.trongrid.io',
};

export interface TronTransactionParams {
  to: string;           // Tron address (T...)
  amount: string;       // Amount in TRX (e.g., "10.5")
  from: string;         // Sender's Tron address (T...)
}

export interface TronTRC20TransactionParams {
  to: string;           // Recipient's Tron address (T...)
  amount: string;       // Amount in token units (e.g., "100" for 100 USDT)
  from: string;         // Sender's Tron address (T...)
  contractAddress: string; // TRC-20 contract address
  decimals: number;     // Token decimals
}

export interface SignedTronTransaction {
  signedTx: string;     // Hex-encoded signed transaction
  txHash: string;       // Transaction ID
}

// Base58 alphabet for Tron addresses
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Decode a Base58Check-encoded Tron address to hex (without 0x prefix)
 */
function decodeBase58(address: string): string {
  let num = BigInt(0);
  for (const char of address) {
    const idx = BASE58_ALPHABET.indexOf(char);
    if (idx === -1) throw new Error('Invalid Base58 character');
    num = num * BigInt(58) + BigInt(idx);
  }
  
  // Convert to hex string (25 bytes = 50 hex chars)
  let hex = num.toString(16).padStart(50, '0');
  
  // The first 21 bytes (42 hex chars) are the address, last 4 bytes are checksum
  return hex.slice(0, 42);
}

/**
 * Convert Tron T-address to hex address (with 41 prefix)
 */
export function tronAddressToHex(tronAddress: string): string {
  if (!tronAddress.startsWith('T')) {
    throw new Error('Invalid Tron address: must start with T');
  }
  return decodeBase58(tronAddress);
}

/**
 * Convert hex address (41...) to EVM-compatible format (without prefix)
 */
function tronHexToEvmHex(tronHex: string): string {
  if (tronHex.startsWith('41')) {
    return tronHex.slice(2);
  }
  return tronHex;
}

/**
 * Convert TRX amount to SUN (1 TRX = 1,000,000 SUN)
 */
function trxToSun(trx: string): number {
  const amount = parseFloat(trx);
  return Math.floor(amount * 1_000_000);
}

/**
 * Convert token amount to base units based on decimals
 */
function tokenToBaseUnits(amount: string, decimals: number): string {
  const amountNum = parseFloat(amount);
  const baseUnits = Math.floor(amountNum * Math.pow(10, decimals));
  return baseUnits.toString();
}

/**
 * Encode a uint256 value as a 32-byte hex string
 */
function encodeUint256(value: string | number): string {
  const bigVal = BigInt(value);
  return bigVal.toString(16).padStart(64, '0');
}

/**
 * Encode a Tron address for contract call (pad to 32 bytes)
 */
function encodeAddress(tronAddress: string): string {
  const hex = tronAddressToHex(tronAddress);
  const evmHex = tronHexToEvmHex(hex);
  return evmHex.padStart(64, '0');
}

/**
 * Get the current block reference from Tron network
 */
async function getBlockReference(isTestnet: boolean): Promise<{
  blockHash: string;
  blockNumber: number;
  timestamp: number;
}> {
  const apiUrl = isTestnet ? TRON_API_URLS.testnet : TRON_API_URLS.mainnet;
  
  const response = await fetch(`${apiUrl}/wallet/getnowblock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get block reference: ${response.statusText}`);
  }
  
  const block = await response.json();
  
  return {
    blockHash: block.blockID,
    blockNumber: block.block_header?.raw_data?.number || 0,
    timestamp: block.block_header?.raw_data?.timestamp || Date.now(),
  };
}

/**
 * Create a TRX transfer transaction using TronGrid API
 */
async function createTrxTransferTransaction(
  params: TronTransactionParams,
  isTestnet: boolean
): Promise<{ transaction: any; txID: string }> {
  const apiUrl = isTestnet ? TRON_API_URLS.testnet : TRON_API_URLS.mainnet;
  
  const sunAmount = trxToSun(params.amount);
  
  const response = await fetch(`${apiUrl}/wallet/createtransaction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to_address: tronAddressToHex(params.to),
      owner_address: tronAddressToHex(params.from),
      amount: sunAmount,
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create transaction: ${errorText}`);
  }
  
  const result = await response.json();
  
  if (result.Error) {
    throw new Error(`Tron API error: ${result.Error}`);
  }
  
  return {
    transaction: result,
    txID: result.txID,
  };
}

/**
 * Create a TRC-20 token transfer transaction
 */
async function createTrc20TransferTransaction(
  params: TronTRC20TransactionParams,
  isTestnet: boolean
): Promise<{ transaction: any; txID: string }> {
  const apiUrl = isTestnet ? TRON_API_URLS.testnet : TRON_API_URLS.mainnet;
  
  // Build the transfer function call data
  // transfer(address _to, uint256 _value)
  const functionSelector = 'transfer(address,uint256)';
  const toAddressParam = encodeAddress(params.to);
  const amountParam = encodeUint256(tokenToBaseUnits(params.amount, params.decimals));
  const parameter = toAddressParam + amountParam;
  
  const response = await fetch(`${apiUrl}/wallet/triggersmartcontract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contract_address: tronAddressToHex(params.contractAddress),
      owner_address: tronAddressToHex(params.from),
      function_selector: functionSelector,
      parameter: parameter,
      fee_limit: 100_000_000, // 100 TRX max fee
      call_value: 0,
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create TRC-20 transaction: ${errorText}`);
  }
  
  const result = await response.json();
  
  if (result.result?.code) {
    const errorMessage = result.result.message 
      ? Buffer.from(result.result.message, 'hex').toString('utf8')
      : 'Unknown error';
    throw new Error(`Tron API error: ${errorMessage}`);
  }
  
  return {
    transaction: result.transaction,
    txID: result.transaction?.txID,
  };
}

/**
 * Sign a Tron transaction with a private key
 */
function signTronTransaction(
  transaction: any,
  privateKey: string
): { signedTx: string; signature: string } {
  // Ensure private key has correct format
  let pk = privateKey;
  if (pk.startsWith('0x')) {
    pk = pk.slice(2);
  }
  
  // Get the transaction ID (hash) to sign
  const txID = transaction.txID;
  if (!txID) {
    throw new Error('Transaction missing txID');
  }
  
  // Sign the txID hash with the private key
  const signingKey = new SigningKey('0x' + pk);
  const txIDBytes = Buffer.from(txID, 'hex');
  const signature = signingKey.sign(txIDBytes);
  
  // Tron uses a specific signature format: r + s + recovery (65 bytes total)
  const r = signature.r.slice(2);
  const s = signature.s.slice(2);
  const v = (signature.v === 27 ? '1b' : '1c');
  const fullSignature = r + s + v;
  
  // Add signature to transaction
  const signedTransaction = {
    ...transaction,
    signature: [fullSignature],
  };
  
  return {
    signedTx: JSON.stringify(signedTransaction),
    signature: fullSignature,
  };
}

/**
 * Sign and prepare a TRX transfer transaction
 */
export async function signTrxTransaction(
  privateKey: string,
  params: TronTransactionParams,
  isTestnet: boolean = true
): Promise<SignedTronTransaction> {
  console.log('Creating TRX transfer transaction:', { 
    to: params.to, 
    amount: params.amount, 
    isTestnet 
  });
  
  // Create the unsigned transaction via TronGrid
  const { transaction, txID } = await createTrxTransferTransaction(params, isTestnet);
  
  console.log('Transaction created with ID:', txID);
  
  // Sign the transaction
  const { signedTx } = signTronTransaction(transaction, privateKey);
  
  console.log('Transaction signed successfully');
  
  return {
    signedTx,
    txHash: txID,
  };
}

/**
 * Sign and prepare a TRC-20 token transfer transaction
 */
export async function signTrc20Transaction(
  privateKey: string,
  params: TronTRC20TransactionParams,
  isTestnet: boolean = true
): Promise<SignedTronTransaction> {
  console.log('Creating TRC-20 transfer transaction:', { 
    to: params.to, 
    amount: params.amount,
    contractAddress: params.contractAddress,
    isTestnet 
  });
  
  // Create the unsigned transaction via TronGrid
  const { transaction, txID } = await createTrc20TransferTransaction(params, isTestnet);
  
  if (!txID) {
    throw new Error('Failed to create TRC-20 transaction');
  }
  
  console.log('TRC-20 transaction created with ID:', txID);
  
  // Sign the transaction
  const { signedTx } = signTronTransaction(transaction, privateKey);
  
  console.log('TRC-20 transaction signed successfully');
  
  return {
    signedTx,
    txHash: txID,
  };
}

/**
 * Validate a Tron address format
 */
export function isValidTronAddress(address: string): boolean {
  if (!address || !address.startsWith('T')) return false;
  if (address.length !== 34) return false;
  
  // Check all characters are valid Base58
  for (const char of address) {
    if (!BASE58_ALPHABET.includes(char)) return false;
  }
  
  return true;
}

/**
 * Derive Tron address from EVM private key
 * (Tron uses the same key derivation as Ethereum)
 */
export function getTronAddressFromPrivateKey(privateKey: string): string {
  let pk = privateKey;
  if (pk.startsWith('0x')) {
    pk = pk.slice(2);
  }
  
  const signingKey = new SigningKey('0x' + pk);
  const publicKey = signingKey.publicKey;
  
  // Remove the '04' prefix from uncompressed public key
  const pubKeyWithoutPrefix = publicKey.slice(4);
  
  // Keccak256 hash of the public key
  const hash = keccak256('0x' + pubKeyWithoutPrefix);
  
  // Take last 20 bytes and add Tron prefix (41)
  const addressHex = '41' + hash.slice(-40);
  
  // Create checksum using double SHA256
  const addressBytes = Buffer.from(addressHex, 'hex');
  const hash1 = sha256(addressBytes);
  const hash2 = sha256(hash1);
  const checksum = hash2.slice(2, 10); // First 4 bytes
  
  // Combine address and checksum
  const fullAddressHex = addressHex + checksum;
  const fullBytes = Buffer.from(fullAddressHex, 'hex');
  
  // Encode to Base58
  let num = BigInt('0x' + fullBytes.toString('hex'));
  let result = '';
  while (num > 0) {
    result = BASE58_ALPHABET[Number(num % BigInt(58))] + result;
    num = num / BigInt(58);
  }
  
  // Add leading '1's for leading zeros
  for (const byte of fullBytes) {
    if (byte === 0) result = '1' + result;
    else break;
  }
  
  return result;
}
