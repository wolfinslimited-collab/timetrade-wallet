import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:timetrade_wallet/config/constants.dart';

class StakingPosition {
  final String id;
  final double amount;
  final String tokenSymbol;
  final String chain;
  final double apyRate;
  final double earnedRewards;
  final DateTime stakedAt;
  final DateTime unlockAt;
  final bool isActive;

  StakingPosition({
    required this.id,
    required this.amount,
    required this.tokenSymbol,
    required this.chain,
    required this.apyRate,
    required this.earnedRewards,
    required this.stakedAt,
    required this.unlockAt,
    required this.isActive,
  });

  factory StakingPosition.fromJson(Map<String, dynamic> json) => StakingPosition(
    id: json['id'] ?? '',
    amount: (json['amount'] ?? 0).toDouble(),
    tokenSymbol: json['token_symbol'] ?? 'USDT',
    chain: json['chain'] ?? 'tron',
    apyRate: (json['apy_rate'] ?? AppConstants.stakingApyRate).toDouble(),
    earnedRewards: (json['earned_rewards'] ?? 0).toDouble(),
    stakedAt: DateTime.tryParse(json['staked_at'] ?? '') ?? DateTime.now(),
    unlockAt: DateTime.tryParse(json['unlock_at'] ?? '') ?? DateTime.now(),
    isActive: json['is_active'] ?? true,
  );
}

class StakingService extends ChangeNotifier {
  List<StakingPosition> _positions = [];
  bool _isLoading = false;

  List<StakingPosition> get positions => _positions;
  bool get isLoading => _isLoading;
  double get totalStaked => _positions.fold(0.0, (s, p) => s + p.amount);
  double get totalRewards => _positions.fold(0.0, (s, p) => s + p.earnedRewards);

  Future<void> fetchPositions(String walletAddress) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await http.post(
        Uri.parse('${AppConstants.supabaseUrl}/functions/v1/staking'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${AppConstants.supabaseAnonKey}',
        },
        body: jsonEncode({
          'action': 'getPositions',
          'walletAddress': walletAddress,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['positions'] != null) {
          _positions = (data['positions'] as List)
              .map((p) => StakingPosition.fromJson(p))
              .toList();
        }
      }
    } catch (e) {
      debugPrint('Error fetching staking positions: $e');
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<bool> stake({
    required String walletAddress,
    required double amount,
    required String tokenSymbol,
    required String chain,
    required int lockDays,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('${AppConstants.supabaseUrl}/functions/v1/staking'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${AppConstants.supabaseAnonKey}',
        },
        body: jsonEncode({
          'action': 'stake',
          'walletAddress': walletAddress,
          'amount': amount,
          'tokenSymbol': tokenSymbol,
          'chain': chain,
          'lockDays': lockDays,
        }),
      );
      if (response.statusCode == 200) {
        await fetchPositions(walletAddress);
        return true;
      }
    } catch (e) {
      debugPrint('Error staking: $e');
    }
    return false;
  }
}
