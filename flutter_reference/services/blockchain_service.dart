import 'dart:convert';
import 'package:dio/dio.dart';
import '../models/token.dart';
import '../models/wallet_account.dart';

class BlockchainService {
  static const String _baseUrl = 'https://uxjpbjkgyphhbycrldui.supabase.co/functions/v1/blockchain';
  static const String _anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Your Supabase anon key
  
  late final Dio _dio;

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

    // Fetch in parallel
    final futures = <Future>[];

    if (evmAddress != null) {
      futures.add(_fetchEvmBalances(evmAddress, ChainType.ethereum));
      futures.add(_fetchEvmBalances(evmAddress, ChainType.polygon));
    }
    if (solanaAddress != null) {
      futures.add(_fetchSolanaBalances(solanaAddress));
    }
    if (tronAddress != null) {
      futures.add(_fetchTronBalances(tronAddress));
    }

    final results = await Future.wait(futures, eagerError: false);
    for (final result in results) {
      if (result is List<Token>) {
        allTokens.addAll(result);
      }
    }

    return allTokens;
  }

  /// Fetch EVM chain balances (Ethereum, Polygon)
  Future<List<Token>> _fetchEvmBalances(String address, ChainType chain) async {
    try {
      final chainName = chain == ChainType.ethereum ? 'ethereum' : 'polygon';
      final response = await _dio.post('', data: {
        'action': 'getBalance',
        'chain': chainName,
        'address': address,
      });

      if (response.statusCode == 200 && response.data != null) {
        final List<dynamic> tokens = response.data['tokens'] ?? [];
        return tokens.map((t) => Token.fromJson(t, chain)).toList();
      }
    } catch (e) {
      print('Error fetching $chain balances: $e');
    }
    return [];
  }

  /// Fetch Solana balances
  Future<List<Token>> _fetchSolanaBalances(String address) async {
    try {
      final response = await _dio.post('', data: {
        'action': 'getBalance',
        'chain': 'solana',
        'address': address,
      });

      if (response.statusCode == 200 && response.data != null) {
        final List<dynamic> tokens = response.data['tokens'] ?? [];
        return tokens.map((t) => Token.fromJson(t, ChainType.solana)).toList();
      }
    } catch (e) {
      print('Error fetching Solana balances: $e');
    }
    return [];
  }

  /// Fetch Tron balances
  Future<List<Token>> _fetchTronBalances(String address) async {
    try {
      final response = await _dio.post('', data: {
        'action': 'getBalance',
        'chain': 'tron',
        'address': address,
      });

      if (response.statusCode == 200 && response.data != null) {
        final List<dynamic> tokens = response.data['tokens'] ?? [];
        return tokens.map((t) => Token.fromJson(t, ChainType.tron)).toList();
      }
    } catch (e) {
      print('Error fetching Tron balances: $e');
    }
    return [];
  }

  /// Fetch transaction history
  Future<List<Transaction>> fetchTransactions({
    String? evmAddress,
    String? solanaAddress,
    String? tronAddress,
  }) async {
    final List<Transaction> allTx = [];

    if (evmAddress != null) {
      allTx.addAll(await _fetchEvmTransactions(evmAddress, ChainType.ethereum));
      allTx.addAll(await _fetchEvmTransactions(evmAddress, ChainType.polygon));
    }
    if (solanaAddress != null) {
      allTx.addAll(await _fetchSolanaTransactions(solanaAddress));
    }
    if (tronAddress != null) {
      allTx.addAll(await _fetchTronTransactions(tronAddress));
    }

    // Sort by timestamp descending
    allTx.sort((a, b) => b.timestamp.compareTo(a.timestamp));
    return allTx;
  }

  Future<List<Transaction>> _fetchEvmTransactions(String address, ChainType chain) async {
    try {
      final chainName = chain == ChainType.ethereum ? 'ethereum' : 'polygon';
      final response = await _dio.post('', data: {
        'action': 'getTransactions',
        'chain': chainName,
        'address': address,
      });

      if (response.statusCode == 200 && response.data != null) {
        final List<dynamic> txList = response.data['transactions'] ?? [];
        return txList.map((t) => Transaction.fromJson({...t, 'chain': chain.name})).toList();
      }
    } catch (e) {
      print('Error fetching $chain transactions: $e');
    }
    return [];
  }

  Future<List<Transaction>> _fetchSolanaTransactions(String address) async {
    try {
      final response = await _dio.post('', data: {
        'action': 'getTransactions',
        'chain': 'solana',
        'address': address,
      });

      if (response.statusCode == 200 && response.data != null) {
        final List<dynamic> txList = response.data['transactions'] ?? [];
        return txList.map((t) => Transaction.fromJson({...t, 'chain': 'solana'})).toList();
      }
    } catch (e) {
      print('Error fetching Solana transactions: $e');
    }
    return [];
  }

  Future<List<Transaction>> _fetchTronTransactions(String address) async {
    try {
      final response = await _dio.post('', data: {
        'action': 'getTransactions',
        'chain': 'tron',
        'address': address,
      });

      if (response.statusCode == 200 && response.data != null) {
        final List<dynamic> txList = response.data['transactions'] ?? [];
        return txList.map((t) => Transaction.fromJson({...t, 'chain': 'tron'})).toList();
      }
    } catch (e) {
      print('Error fetching Tron transactions: $e');
    }
    return [];
  }

  /// Broadcast a signed transaction
  Future<String?> broadcastTransaction({
    required ChainType chain,
    required String signedTx,
  }) async {
    try {
      final chainName = chain.name;
      final response = await _dio.post('', data: {
        'action': 'broadcast',
        'chain': chainName,
        'signedTx': signedTx,
      });

      if (response.statusCode == 200 && response.data != null) {
        return response.data['txHash'] as String?;
      }
    } catch (e) {
      print('Error broadcasting transaction: $e');
    }
    return null;
  }

  /// Fetch gas/fee estimates
  Future<Map<String, dynamic>?> fetchFeeEstimate(ChainType chain) async {
    try {
      final response = await _dio.post('', data: {
        'action': 'getFees',
        'chain': chain.name,
      });

      if (response.statusCode == 200) {
        return response.data as Map<String, dynamic>?;
      }
    } catch (e) {
      print('Error fetching fees: $e');
    }
    return null;
  }
}
