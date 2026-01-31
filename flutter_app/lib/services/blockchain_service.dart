import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';
import '../models/token.dart';
import '../models/wallet_account.dart';

/// Known SPL tokens (Solana) - for symbol/decimal lookup in history
const _knownSpl = <String, Map<String, dynamic>>{
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': {'symbol': 'USDC', 'decimals': 6},
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': {'symbol': 'USDT', 'decimals': 6},
  'So11111111111111111111111111111111111111112': {'symbol': 'SOL', 'decimals': 9},
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': {'symbol': 'mSOL', 'decimals': 9},
};

/// Known TRC-20 tokens (Tron)
const _knownTrc20 = <String, Map<String, dynamic>>{
  'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t': {'symbol': 'USDT', 'decimals': 6},
  'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8': {'symbol': 'USDC', 'decimals': 6},
  'TNUC9Qb1rRpS5CbWLmNMxXBjyFoydXjWFR': {'symbol': 'WTRX', 'decimals': 6},
  'TSSMHYeV2uE9qYH95DqyoCuNCzEL1NvU3S': {'symbol': 'SUN', 'decimals': 18},
};

class BlockchainService {
  static const String _baseUrl =
      'https://mrdnogctgvzhuqlfervb.supabase.co/functions/v1/wallet-blockchain';
  static const String _anonKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yZG5vZ2N0Z3Z6aHVxbGZlcnZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NTUxOTUsImV4cCI6MjA4NDQzMTE5NX0.0cxHNzqj5jQg6vQrZ31efQSJ_Tw8E95uQyLDTudTyAE';

  late final Dio _dio;

  // Price cache for USD valuation
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

  //----------------------------------------------------------------------------
  // BALANCES
  //----------------------------------------------------------------------------

  /// Fetch balances across all chains
  Future<List<Token>> fetchAllBalances({
    String? evmAddress,
    String? solanaAddress,
    String? tronAddress,
  }) async {
    final List<Token> allTokens = [];

    // Fetch prices first
    await _fetchPrices();

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

    // Sort by USD value descending, filter zero and unknown
    allTokens.sort((a, b) => b.usdValue.compareTo(a.usdValue));
    return allTokens.where((t) => t.balance > 0 && t.symbol != 'UNKNOWN').toList();
  }

  /// Fetch live prices
  Future<void> _fetchPrices() async {
    try {
      debugPrint('[BLOCKCHAIN] 📡 Fetching prices...');
      final response = await _dio.post('', data: {
        'action': 'getPrices',
        'chain': 'ethereum',
        'address': '',
        'symbols': ['BTC', 'ETH', 'MATIC', 'POL', 'SOL', 'TRX', 'USDC', 'USDT', 'DAI'],
      });
      debugPrint('[BLOCKCHAIN] ✅ getPrices response: ${response.statusCode}');
      if (response.statusCode == 200 && response.data != null) {
        final List<dynamic> prices = response.data['data'] ?? response.data;
        for (final p in prices) {
          final symbol = p['symbol'] as String?;
          final price = (p['price'] as num?)?.toDouble() ?? 0.0;
          if (symbol != null) {
            _priceCache[symbol.toUpperCase()] = price;
          }
        }
      }
    } catch (e) {
      debugPrint('[BLOCKCHAIN] ❌ getPrices error: $e');
    }
  }

  Future<List<Token>> _fetchChainBalances(
    String address,
    String chainName,
    ChainType chain,
  ) async {
    final List<Token> tokens = [];
    try {
      debugPrint('[BLOCKCHAIN] 📡 getBalance $chainName address=$address');
      final response = await _dio.post('', data: {
        'action': 'getBalance',
        'chain': chainName,
        'address': address,
      });
      debugPrint('[BLOCKCHAIN] ✅ getBalance $chainName: ${response.statusCode}');
      if (response.statusCode == 200 && response.data != null) {
        final data = response.data['data'] ?? response.data;
        // Native token
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
        // ERC20 / SPL / TRC20 tokens
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
      debugPrint('[BLOCKCHAIN] ❌ getBalance $chainName error: $e');
    }
    return tokens;
  }

  double _parseBalance(String raw, int decimals) {
    try {
      final big = BigInt.tryParse(raw) ?? BigInt.zero;
      final divisor = BigInt.from(10).pow(decimals);
      return big / divisor;
    } catch (_) {
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

  //----------------------------------------------------------------------------
  // TRANSACTIONS (matches web logic)
  //----------------------------------------------------------------------------

  /// Fetch transaction history across chains
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

    // Sort descending by timestamp
    allTx.sort((a, b) => b.timestamp.compareTo(a.timestamp));
    return allTx;
  }

  Future<List<Transaction>> _fetchChainTransactions(
    String userAddress,
    String chainName,
    ChainType chain,
  ) async {
    try {
      debugPrint('[BLOCKCHAIN] 📡 getTransactions $chainName address=$userAddress');
      final response = await _dio.post('', data: {
        'action': 'getTransactions',
        'chain': chainName,
        'address': userAddress,
      });
      debugPrint('[BLOCKCHAIN] ✅ getTransactions $chainName: ${response.statusCode}');

      if (response.statusCode != 200 || response.data == null) return [];

      final data = response.data['data'] ?? response.data;
      final List<dynamic> txList = data['transactions'] ?? [];
      final explorerUrl = data['explorerUrl'] as String? ?? '';

      debugPrint('[BLOCKCHAIN] ℹ️ $chainName returned ${txList.length} transactions');

      return txList.map((t) {
        return _parseTx(t, userAddress, chain, explorerUrl);
      }).toList();
    } catch (e) {
      debugPrint('[BLOCKCHAIN] ❌ getTransactions $chainName error: $e');
      return [];
    }
  }

  /// Parse a single raw tx from API into our Transaction model
  Transaction _parseTx(
    Map<String, dynamic> t,
    String userAddress,
    ChainType chain,
    String explorerUrl,
  ) {
    final hash = t['hash'] as String? ?? '';
    final fromRaw = t['from'] as String? ?? '';
    final toRaw = t['to'] as String? ?? '';

    // Normalize for case-insensitive comparison (EVM)
    String from = fromRaw;
    String to = toRaw;
    String user = userAddress;
    if (chain != ChainType.solana && chain != ChainType.tron) {
      from = from.toLowerCase();
      to = to.toLowerCase();
      user = user.toLowerCase();
    }

    // Determine direction
    TransactionType type;
    if (from == user) {
      type = TransactionType.send;
    } else if (to == user) {
      type = TransactionType.receive;
    } else {
      type = TransactionType.contract;
    }

    // Symbol/decimals detection (TRC-20, SPL)
    String symbol = chain.symbol;
    int decimals = _chainDecimals(chain);

    // TRC-20 handling
    if (chain == ChainType.tron && t['contractType'] == 'TriggerSmartContract') {
      final contractAddr = t['contractAddressBase58'] ?? t['contractAddress'];
      final known = _knownTrc20[contractAddr];
      if (known != null) {
        symbol = known['symbol'] as String;
        decimals = known['decimals'] as int;
      } else {
        symbol = 'TRC20';
      }
    }

    // SPL handling (Solana tokenTransfers array)
    final tokenTransfers = t['tokenTransfers'] as List<dynamic>?;
    if (chain == ChainType.solana && tokenTransfers != null && tokenTransfers.isNotEmpty) {
      // Find most relevant transfer (where user is source or destination)
      final relevant = tokenTransfers.firstWhere(
        (tt) => tt['source'] == userAddress || tt['destination'] == userAddress,
        orElse: () => tokenTransfers.first,
      );
      final mint = relevant['mint'] as String?;
      final known = mint != null ? _knownSpl[mint] : null;
      if (known != null) {
        symbol = known['symbol'] as String;
        decimals = known['decimals'] as int;
      } else if (relevant['symbol'] != null) {
        symbol = relevant['symbol'] as String;
        decimals = relevant['decimals'] as int? ?? 6;
      }
      // If it's a token transfer, parse amount directly from transfer
      final rawAmt = relevant['amount'] as String?;
      if (rawAmt != null && symbol != 'SOL') {
        final tokenAmount = _parseBalance(rawAmt, decimals);
        final addr = type == TransactionType.send
            ? (relevant['destination'] as String? ?? toRaw)
            : (relevant['source'] as String? ?? fromRaw);

        return Transaction(
          hash: hash,
          chain: chain,
          type: type,
          from: fromRaw,
          to: toRaw,
          amount: tokenAmount,
          symbol: symbol,
          fee: (t['fee'] as num?)?.toDouble() ?? 0.0,
          feeSymbol: chain.symbol,
          timestamp: _parseTimestamp(t['timestamp']),
          status: _parseStatus(t['status']),
        );
      }
    }

    // Parse native value from API (comes as string in base units or sometimes as numeric)
    final valueField = t['value'];
    double amount = 0;
    if (valueField is String) {
      amount = _parseBalance(valueField, decimals);
    } else if (valueField is num) {
      // If API returns pre-parsed float (rare), use directly
      amount = valueField.toDouble();
    }

    return Transaction(
      hash: hash,
      chain: chain,
      type: type,
      from: fromRaw,
      to: toRaw,
      amount: amount,
      symbol: symbol,
      fee: (t['fee'] as num?)?.toDouble() ?? 0.0,
      feeSymbol: chain.symbol,
      timestamp: _parseTimestamp(t['timestamp']),
      status: _parseStatus(t['status']),
    );
  }

  int _chainDecimals(ChainType chain) {
    switch (chain) {
      case ChainType.ethereum:
      case ChainType.polygon:
        return 18;
      case ChainType.solana:
        return 9;
      case ChainType.tron:
        return 6;
      case ChainType.bitcoin:
        return 8;
    }
  }

  DateTime _parseTimestamp(dynamic raw) {
    if (raw == null) return DateTime.now();
    if (raw is int) {
      // Unix seconds
      return DateTime.fromMillisecondsSinceEpoch(raw * 1000);
    }
    if (raw is String) {
      final parsed = int.tryParse(raw);
      if (parsed != null) {
        return DateTime.fromMillisecondsSinceEpoch(parsed * 1000);
      }
      return DateTime.tryParse(raw) ?? DateTime.now();
    }
    return DateTime.now();
  }

  TransactionStatus _parseStatus(dynamic raw) {
    if (raw == null) return TransactionStatus.confirmed;
    final s = raw.toString().toLowerCase();
    if (s == 'pending') return TransactionStatus.pending;
    if (s == 'failed') return TransactionStatus.failed;
    return TransactionStatus.confirmed;
  }

  //----------------------------------------------------------------------------
  // BROADCAST / FEES
  //----------------------------------------------------------------------------

  /// Broadcast a signed transaction
  Future<String?> broadcastTransaction({
    required ChainType chain,
    required String signedTx,
  }) async {
    try {
      debugPrint('[BLOCKCHAIN] 📡 broadcast $chain');
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
      debugPrint('[BLOCKCHAIN] ❌ broadcast error: $e');
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
      debugPrint('[BLOCKCHAIN] ❌ estimateGas error: $e');
    }
    return null;
  }
}

extension on BigInt {
  double operator /(BigInt other) {
    return toDouble() / other.toDouble();
  }
}
