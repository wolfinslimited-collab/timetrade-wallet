import 'package:dio/dio.dart';
import '../models/staking_position.dart';

class StakingService {
  static const String _baseUrl = 'https://mrdnogctgvzhuqlfervb.supabase.co/rest/v1';
  static const String _anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yZG5vZ2N0Z3Z6aHVxbGZlcnZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NTUxOTUsImV4cCI6MjA4NDQzMTE5NX0.0cxHNzqj5jQg6vQrZ31efQSJ_Tw8E95uQyLDTudTyAE';
  
  late final Dio _dio;

  StakingService() {
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

  /// Fetch staking positions for a wallet address
  Future<List<StakingPosition>> fetchPositions(String walletAddress) async {
    try {
      final response = await _dio.get(
        '/staking_positions',
        queryParameters: {
          'wallet_address': 'eq.${walletAddress.toLowerCase()}',
          'is_active': 'eq.true',
          'order': 'staked_at.desc',
        },
      );

      if (response.statusCode == 200 && response.data != null) {
        final List<dynamic> data = response.data as List;
        return data.map((item) => StakingPosition.fromJson(item)).toList();
      }
    } catch (e) {
      print('Error fetching staking positions: $e');
    }
    return [];
  }

  /// Create a new staking position
  Future<StakingPosition?> createPosition({
    required String walletAddress,
    required String tokenSymbol,
    required String chain,
    required double amount,
    required double apyRate,
    required DateTime unlockAt,
    String? txHash,
  }) async {
    try {
      final response = await _dio.post(
        '/staking_positions',
        data: {
          'wallet_address': walletAddress.toLowerCase(),
          'token_symbol': tokenSymbol,
          'chain': chain,
          'amount': amount,
          'apy_rate': apyRate,
          'unlock_at': unlockAt.toIso8601String(),
          'tx_hash': txHash,
        },
        options: Options(
          headers: {
            'Prefer': 'return=representation',
          },
        ),
      );

      if (response.statusCode == 201 && response.data != null) {
        final List<dynamic> data = response.data as List;
        if (data.isNotEmpty) {
          return StakingPosition.fromJson(data.first);
        }
      }
    } catch (e) {
      print('Error creating staking position: $e');
    }
    return null;
  }

  /// Unstake a position
  Future<bool> unstakePosition(String positionId) async {
    try {
      final response = await _dio.patch(
        '/staking_positions',
        queryParameters: {
          'id': 'eq.$positionId',
        },
        data: {
          'is_active': false,
        },
      );

      return response.statusCode == 200 || response.statusCode == 204;
    } catch (e) {
      print('Error unstaking position: $e');
      return false;
    }
  }

  /// Get stake wallet address for a chain
  Future<String?> getStakeWalletAddress(String chain) async {
    try {
      final response = await _dio.get(
        '/stake_wallets',
        queryParameters: {
          'chain': 'eq.$chain',
          'is_active': 'eq.true',
          'limit': '1',
        },
      );

      if (response.statusCode == 200 && response.data != null) {
        final List<dynamic> data = response.data as List;
        if (data.isNotEmpty) {
          return data.first['wallet_address'] as String?;
        }
      }
    } catch (e) {
      print('Error fetching stake wallet: $e');
    }
    return null;
  }
}
