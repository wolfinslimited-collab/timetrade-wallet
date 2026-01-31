import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';
import '../models/token.dart';
import '../models/wallet_account.dart';

class BlockchainService {
  static const String _baseUrl = 'https://mrdnogctgvzhuqlfervb.supabase.co/functions/v1/wallet-blockchain';
  static const String _anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yZG5vZ2N0Z3Z6aHVxbGZlcnZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NTUxOTUsImV4cCI6MjA4NDQzMTE5NX0.0cxHNzqj5jQg6vQrZ31efQSJ_Tw8E95uQyLDTudTyAE';
  
  late final Dio _dio;

  // Price cache
  final Map<String, double> _priceCache = {};

  BlockchainService() {
    _dio = Dio(BaseOptions(
      baseUrl: _baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'apikey': _anonKey,
        'Authorization': 'Bearer $_anonKey',
      },
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
    ));
  }

  /// Fetch balances for all chains
  Future<List<Token>> fetchAllBalances({
    String? evmAddress,
    String? solanaAddress,
    String? tronAddress,
  }) async {
    final List<Token> allTokens = [];

    // First fetch prices
    await _fetchPrices();

    // Fetch balances in parallel
    final futures = <Future<List<Token>>>[];

    if (evmAddress != null && evmAddress.isNotEmpty) {
      futures.add(_fetchChainBalances(evmAddress, 'ethereum', ChainType.ethereum));
      futures.add(_fetchChainBalances(evmAddress, 'polygon', ChainType.polygon));
    }
    if (solanaAddress != null && solanaAddress.isNotEmpty) {
      futures.add(_fetchChainBalances(solanaAddress, 'solana', ChainType.solana));
    }
    if (tronAddress != null && tronAddress.isNotEmpty) {
      futures.add(_fetchChainBalances(tronAddress, 'tron', ChainType.tron));
    }

    final results = await Future.wait(futures, eagerError: false);
    for (final result in results) {
      allTokens.addAll(result);
    }

    // Sort by USD value descending, filter out zero balances and unknown tokens
    allTokens.sort((a, b) => b.usdValue.compareTo(a.usdValue));
    return allTokens.where((t) => t.balance > 0 && t.symbol != 'UNKNOWN').toList();
  }

  /// Fetch prices for common symbols
  Future<void> _fetchPrices() async {
    try {
      final response = await _dio.post('', data: {
        'action': 'getPrices',
        'chain': 'ethereum',
        'address': '',
        'symbols': ['BTC', 'ETH', 'MATIC', 'POL', 'SOL', 'TRX', 'USDC', 'USDT', 'DAI'],
      });

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data;
        final List<dynamic> prices = data['data'] ?? data;
        
        for (final p in prices) {
          final symbol = p['symbol'] as String?;
          final price = (p['price'] as num?)?.toDouble() ?? 0.0;
          if (symbol != null) {
            _priceCache[symbol.toUpperCase()] = price;
          }
        }
      }
    } catch (e) {
      debugPrint('Error fetching prices: $e');
    }
  }

  /// Fetch chain balances (handles native + tokens)
  Future<List<Token>> _fetchChainBalances(String address, String chainName, ChainType chain) async {
    final List<Token> tokens = [];
    
    try {
      final response = await _dio.post('', data: {
        'action': 'getBalance',
        'chain': chainName,
        'address': address,
      });

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data['data'] ?? response.data;
        
        // Parse native token
        final native = data['native'];
        if (native != null) {
          final symbol = native['symbol'] as String? ?? '';
          final balanceRaw = native['balance'] as String? ?? '0';
          final decimals = native['decimals'] as int? ?? 18;
          final balance = _parseBalance(balanceRaw, decimals);
          final price = _priceCache[symbol.toUpperCase()] ?? 0.0;
          final usdValue = balance * price;

          if (balance > 0) {
            tokens.add(Token(
              symbol: symbol,
              name: _getTokenName(symbol),
              chain: chain,
              balance: balance,
              usdValue: usdValue,
              price: price,
              change24h: 0.0,
              decimals: decimals,
              isNative: true,
            ));
          }
        }

        // Parse ERC20/SPL/TRC20 tokens
        final List<dynamic> tokenList = data['tokens'] ?? [];
        for (final t in tokenList) {
          final symbol = t['symbol'] as String? ?? 'UNKNOWN';
          if (symbol == 'UNKNOWN') continue;
          
          final balanceRaw = t['balance'] as String? ?? '0';
          final decimals = t['decimals'] as int? ?? 18;
          final balance = _parseBalance(balanceRaw, decimals);
          final price = _priceCache[symbol.toUpperCase()] ?? 0.0;
          final usdValue = balance * price;

          if (balance > 0) {
            tokens.add(Token(
              symbol: symbol,
              name: t['name'] as String? ?? symbol,
              chain: chain,
              balance: balance,
              usdValue: usdValue,
              price: price,
              change24h: 0.0,
              decimals: decimals,
              contractAddress: t['contractAddress'] as String?,
              isNative: false,
            ));
          }
        }
      }
    } catch (e) {
      debugPrint('Error fetching $chainName balances: $e');
    }
    
    return tokens;
  }

  /// Parse balance string with decimals
  double _parseBalance(String balanceRaw, int decimals) {
    try {
      final bigBalance = BigInt.tryParse(balanceRaw) ?? BigInt.zero;
      final divisor = BigInt.from(10).pow(decimals);
      return bigBalance / divisor;
    } catch (e) {
      return 0.0;
    }
  }

  String _getTokenName(String symbol) {
    const names = {
      'ETH': 'Ethereum',
      'MATIC': 'Polygon',
      'POL': 'Polygon',
      'SOL': 'Solana',
      'TRX': 'Tron',
      'BTC': 'Bitcoin',
      'USDC': 'USD Coin',
      'USDT': 'Tether USD',
      'DAI': 'Dai Stablecoin',
    };
    return names[symbol.toUpperCase()] ?? symbol;
  }

  /// Fetch transaction history
  Future<List<Transaction>> fetchTransactions({
    String? evmAddress,
    String? solanaAddress,
    String? tronAddress,
  }) async {
    final List<Transaction> allTx = [];

    if (evmAddress != null && evmAddress.isNotEmpty) {
      allTx.addAll(await _fetchChainTransactions(evmAddress, 'ethereum', ChainType.ethereum));
      allTx.addAll(await _fetchChainTransactions(evmAddress, 'polygon', ChainType.polygon));
    }
    if (solanaAddress != null && solanaAddress.isNotEmpty) {
      allTx.addAll(await _fetchChainTransactions(solanaAddress, 'solana', ChainType.solana));
    }
    if (tronAddress != null && tronAddress.isNotEmpty) {
      allTx.addAll(await _fetchChainTransactions(tronAddress, 'tron', ChainType.tron));
    }

    // Sort by timestamp descending
    allTx.sort((a, b) => b.timestamp.compareTo(a.timestamp));
    return allTx;
  }

  Future<List<Transaction>> _fetchChainTransactions(String address, String chainName, ChainType chain) async {
    try {
      final response = await _dio.post('', data: {
        'action': 'getTransactions',
        'chain': chainName,
        'address': address,
      });

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data['data'] ?? response.data;
        final List<dynamic> txList = data['transactions'] ?? [];
        
        return txList.map((t) {
          // Determine transaction type
          final from = (t['from'] as String? ?? '').toLowerCase();
          final to = (t['to'] as String? ?? '').toLowerCase();
          final userAddr = address.toLowerCase();
          
          TransactionType type;
          if (from == userAddr) {
            type = TransactionType.send;
          } else if (to == userAddr) {
            type = TransactionType.receive;
          } else {
            type = TransactionType.contract;
          }

          return Transaction(
            hash: t['hash'] as String? ?? '',
            chain: chain,
            type: type,
            from: t['from'] as String? ?? '',
            to: t['to'] as String? ?? '',
            amount: (t['value'] as num?)?.toDouble() ?? 0.0,
            symbol: t['symbol'] as String? ?? chain.symbol,
            fee: (t['fee'] as num?)?.toDouble() ?? 0.0,
            feeSymbol: chain.symbol,
            timestamp: DateTime.tryParse(t['timestamp'] as String? ?? '') ?? DateTime.now(),
            status: TransactionStatus.confirmed,
          );
        }).toList();
      }
    } catch (e) {
      debugPrint('Error fetching $chainName transactions: $e');
    }
    return [];
  }

  /// Get unified transactions from all chains
  Future<List<Transaction>> getUnifiedTransactions() async {
    // This would require addresses - implement when called with proper context
    return [];
  }

  /// Broadcast a signed transaction
  Future<String?> broadcastTransaction({
    required ChainType chain,
    required String signedTx,
  }) async {
    try {
      final response = await _dio.post('', data: {
        'action': 'broadcast',
        'chain': chain.name,
        'signedTx': signedTx,
      });

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data['data'] ?? response.data;
        return data['txHash'] as String?;
      }
    } catch (e) {
      debugPrint('Error broadcasting transaction: $e');
    }
    return null;
  }

  /// Fetch gas/fee estimates
  Future<Map<String, dynamic>?> fetchFeeEstimate(ChainType chain) async {
    try {
      final response = await _dio.post('', data: {
        'action': 'estimateGas',
        'chain': chain.name,
        'address': '',
      });

      if (response.statusCode == 200) {
        return response.data['data'] as Map<String, dynamic>?;
      }
    } catch (e) {
      debugPrint('Error fetching fees: $e');
    }
    return null;
  }
}

extension on BigInt {
  double operator /(BigInt other) {
    return this.toDouble() / other.toDouble();
  }
}
