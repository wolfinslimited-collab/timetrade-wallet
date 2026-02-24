import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:timetrade_wallet/config/constants.dart';

class TokenBalance {
  final String symbol;
  final String name;
  final String network;
  final double balance;
  final double usdValue;
  final double? change24h;
  final String? iconUrl;

  TokenBalance({
    required this.symbol,
    required this.name,
    required this.network,
    required this.balance,
    required this.usdValue,
    this.change24h,
    this.iconUrl,
  });

  factory TokenBalance.fromJson(Map<String, dynamic> json) => TokenBalance(
    symbol: json['symbol'] ?? '',
    name: json['name'] ?? '',
    network: json['network'] ?? '',
    balance: (json['balance'] ?? 0).toDouble(),
    usdValue: (json['usdValue'] ?? 0).toDouble(),
    change24h: json['change24h']?.toDouble(),
    iconUrl: json['iconUrl'],
  );
}

class Transaction {
  final String hash;
  final String type;
  final String network;
  final double amount;
  final String symbol;
  final String? from;
  final String? to;
  final DateTime timestamp;
  final String status;

  Transaction({
    required this.hash,
    required this.type,
    required this.network,
    required this.amount,
    required this.symbol,
    this.from,
    this.to,
    required this.timestamp,
    required this.status,
  });

  factory Transaction.fromJson(Map<String, dynamic> json) => Transaction(
    hash: json['hash'] ?? '',
    type: json['type'] ?? 'transfer',
    network: json['network'] ?? '',
    amount: (json['amount'] ?? 0).toDouble(),
    symbol: json['symbol'] ?? '',
    from: json['from'],
    to: json['to'],
    timestamp: json['timestamp'] is int
        ? DateTime.fromMillisecondsSinceEpoch(json['timestamp'] * 1000)
        : DateTime.tryParse(json['timestamp']?.toString() ?? '') ?? DateTime.now(),
    status: json['status'] ?? 'confirmed',
  );
}

class BlockchainService extends ChangeNotifier {
  List<TokenBalance> _balances = [];
  List<Transaction> _transactions = [];
  double _totalBalanceUsd = 0;
  bool _isLoading = false;
  bool _isConnected = false;

  List<TokenBalance> get balances => _balances;
  List<Transaction> get transactions => _transactions;
  double get totalBalanceUsd => _totalBalanceUsd;
  bool get isLoading => _isLoading;
  bool get isConnected => _isConnected;

  Future<void> fetchBalances(Map<String, String> addresses) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await http.post(
        Uri.parse('${AppConstants.supabaseUrl}/functions/v1/wallet-blockchain'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${AppConstants.supabaseAnonKey}',
        },
        body: jsonEncode({
          'action': 'getBalances',
          'addresses': addresses,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['balances'] != null) {
          _balances = (data['balances'] as List)
              .map((b) => TokenBalance.fromJson(b))
              .toList();
          _totalBalanceUsd = _balances.fold(0.0, (sum, b) => sum + b.usdValue);
        }
        _isConnected = true;
      }
    } catch (e) {
      debugPrint('Error fetching balances: $e');
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> fetchTransactions(Map<String, String> addresses) async {
    try {
      final response = await http.post(
        Uri.parse('${AppConstants.supabaseUrl}/functions/v1/wallet-blockchain'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${AppConstants.supabaseAnonKey}',
        },
        body: jsonEncode({
          'action': 'getTransactions',
          'addresses': addresses,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['transactions'] != null) {
          _transactions = (data['transactions'] as List)
              .map((t) => Transaction.fromJson(t))
              .toList();
          notifyListeners();
        }
      }
    } catch (e) {
      debugPrint('Error fetching transactions: $e');
    }
  }

  Future<void> refreshAll(Map<String, String> addresses) async {
    await Future.wait([
      fetchBalances(addresses),
      fetchTransactions(addresses),
    ]);
  }
}
