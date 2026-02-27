/// Single source of truth for supported blockchain networks.

enum AddressKey { evm, solana, tron, btc }

class NetworkConfig {
  final String id;
  final String name;
  final String symbol;
  final String logoSymbol;
  final int color;
  final int decimals;
  final AddressKey addressKey;
  final String explorerUrl;
  final bool isEvm;

  const NetworkConfig({
    required this.id,
    required this.name,
    required this.symbol,
    required this.logoSymbol,
    required this.color,
    required this.decimals,
    required this.addressKey,
    required this.explorerUrl,
    required this.isEvm,
  });

  String get logoUrl => 'https://api.elbstream.com/logos/crypto/$logoSymbol';
}

const List<NetworkConfig> networks = [
  NetworkConfig(id: 'ethereum', name: 'Ethereum', symbol: 'ETH', logoSymbol: 'eth', color: 0xFF627EEA, decimals: 18, addressKey: AddressKey.evm, explorerUrl: 'https://etherscan.io', isEvm: true),
  NetworkConfig(id: 'polygon', name: 'Polygon', symbol: 'POL', logoSymbol: 'matic', color: 0xFF8247E5, decimals: 18, addressKey: AddressKey.evm, explorerUrl: 'https://polygonscan.com', isEvm: true),
  NetworkConfig(id: 'arbitrum', name: 'Arbitrum One', symbol: 'ETH', logoSymbol: 'arb', color: 0xFF28A0F0, decimals: 18, addressKey: AddressKey.evm, explorerUrl: 'https://arbiscan.io', isEvm: true),
  NetworkConfig(id: 'bsc', name: 'BNB Chain', symbol: 'BNB', logoSymbol: 'bnb', color: 0xFFF3BA2F, decimals: 18, addressKey: AddressKey.evm, explorerUrl: 'https://bscscan.com', isEvm: true),
  NetworkConfig(id: 'solana', name: 'Solana', symbol: 'SOL', logoSymbol: 'sol', color: 0xFF9945FF, decimals: 9, addressKey: AddressKey.solana, explorerUrl: 'https://explorer.solana.com', isEvm: false),
  NetworkConfig(id: 'tron', name: 'Tron', symbol: 'TRX', logoSymbol: 'trx', color: 0xFFFF0013, decimals: 6, addressKey: AddressKey.tron, explorerUrl: 'https://tronscan.org', isEvm: false),
  NetworkConfig(id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', logoSymbol: 'btc', color: 0xFFF7931A, decimals: 8, addressKey: AddressKey.btc, explorerUrl: 'https://blockstream.info', isEvm: false),
];

NetworkConfig getNetwork(String id) => networks.firstWhere((n) => n.id == id, orElse: () => networks[0]);
String getNetworkLogoUrl(String id) => getNetwork(id).logoUrl;
String getCryptoLogoUrl(String symbol) => 'https://api.elbstream.com/logos/crypto/${symbol.toLowerCase()}';
