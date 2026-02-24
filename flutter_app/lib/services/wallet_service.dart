import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:bip39/bip39.dart' as bip39;
import 'package:timetrade_wallet/config/constants.dart';

class WalletAccount {
  final String name;
  final String evmAddress;
  final String solanaAddress;
  final String tronAddress;
  final String btcAddress;

  WalletAccount({
    required this.name,
    this.evmAddress = '',
    this.solanaAddress = '',
    this.tronAddress = '',
    this.btcAddress = '',
  });

  Map<String, dynamic> toJson() => {
    'name': name,
    'evmAddress': evmAddress,
    'solanaAddress': solanaAddress,
    'tronAddress': tronAddress,
    'btcAddress': btcAddress,
  };

  factory WalletAccount.fromJson(Map<String, dynamic> json) => WalletAccount(
    name: json['name'] ?? 'Wallet',
    evmAddress: json['evmAddress'] ?? '',
    solanaAddress: json['solanaAddress'] ?? '',
    tronAddress: json['tronAddress'] ?? '',
    btcAddress: json['btcAddress'] ?? '',
  );
}

class WalletService extends ChangeNotifier {
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();
  bool _hasWallet = false;
  bool _isLocked = true;
  String _pin = '';
  List<WalletAccount> _accounts = [];
  int _activeAccountIndex = 0;

  bool get hasWallet => _hasWallet;
  bool get isLocked => _isLocked;
  List<WalletAccount> get accounts => _accounts;
  int get activeAccountIndex => _activeAccountIndex;
  WalletAccount? get activeAccount =>
      _accounts.isNotEmpty ? _accounts[_activeAccountIndex] : null;

  WalletService() {
    _init();
  }

  Future<void> _init() async {
    final prefs = await SharedPreferences.getInstance();
    _hasWallet = prefs.getBool(AppConstants.walletCreatedKey) ?? false;
    _pin = prefs.getString(AppConstants.walletPinKey) ?? '';
    _isLocked = _hasWallet && _pin.isNotEmpty;

    if (_hasWallet) {
      await _loadAccounts();
      
      // If wallet is marked as created but no accounts exist, auto-reset
      if (_accounts.isEmpty) {
        debugPrint('[WALLET] ⚠️ Wallet marked created but no accounts — resetting');
        await resetWallet();
        return;
      }
    }
    notifyListeners();
  }

  Future<void> _loadAccounts() async {
    final prefs = await SharedPreferences.getInstance();
    final accountsJson = prefs.getString('timetrade_user_accounts');
    if (accountsJson != null) {
      final List<dynamic> decoded = jsonDecode(accountsJson);
      _accounts = decoded.map((a) => WalletAccount.fromJson(a)).toList();
    } else {
      // Legacy single-account fallback
      final evm = prefs.getString('timetrade_wallet_address_evm') ?? '';
      final sol = prefs.getString('timetrade_wallet_address_solana') ?? '';
      final tron = prefs.getString('timetrade_wallet_address_tron') ?? '';
      final btc = prefs.getString('timetrade_wallet_address_btc') ?? '';
      final name = prefs.getString(AppConstants.walletNameKey) ?? 'Wallet';
      _accounts = [
        WalletAccount(
          name: name,
          evmAddress: evm,
          solanaAddress: sol,
          tronAddress: tron,
          btcAddress: btc,
        ),
      ];
    }
  }

  Future<void> _saveAccounts() async {
    final prefs = await SharedPreferences.getInstance();
    final json = jsonEncode(_accounts.map((a) => a.toJson()).toList());
    await prefs.setString('timetrade_user_accounts', json);
  }

  bool validatePin(String input) => input == _pin;

  Future<void> setPin(String pin) async {
    _pin = pin;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(AppConstants.walletPinKey, pin);
    notifyListeners();
  }

  Future<void> unlock() async {
    _isLocked = false;
    notifyListeners();
  }

  String generateSeedPhrase({int wordCount = 12}) {
    final strength = wordCount == 12 ? 128 : 256;
    return bip39.generateMnemonic(strength: strength);
  }

  bool validateSeedPhrase(String phrase) {
    return bip39.validateMnemonic(phrase.trim().toLowerCase());
  }

  Future<void> createWallet({
    required String pin,
    required String seedPhrase,
    String name = 'Wallet',
  }) async {
    await setPin(pin);
    await _secureStorage.write(key: 'seed_phrase', value: seedPhrase);

    _accounts = [
      WalletAccount(name: name),
    ];
    await _saveAccounts();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(AppConstants.walletCreatedKey, true);
    await prefs.setString(AppConstants.walletNameKey, name);

    _hasWallet = true;
    _isLocked = false;
    notifyListeners();
  }

  Future<void> importWallet({
    required String pin,
    required String seedPhrase,
    String name = 'Imported Wallet',
  }) async {
    await createWallet(pin: pin, seedPhrase: seedPhrase, name: name);
  }

  Future<void> deleteAccount(int index) async {
    _accounts.removeAt(index);
    
    // If no accounts remain, trigger full wallet reset
    if (_accounts.isEmpty) {
      debugPrint('[WALLET] 🗑️ Last account deleted — triggering full reset');
      await resetWallet();
      return;
    }
    
    if (_activeAccountIndex >= _accounts.length) {
      _activeAccountIndex = _accounts.length - 1;
    }
    await _saveAccounts();
    notifyListeners();
  }

  void switchAccount(int index) {
    if (index >= 0 && index < _accounts.length) {
      _activeAccountIndex = index;
      notifyListeners();
    }
  }

  Future<void> resetWallet() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    await _secureStorage.deleteAll();
    _hasWallet = false;
    _isLocked = true;
    _pin = '';
    _accounts = [];
    _activeAccountIndex = 0;
    notifyListeners();
  }

  Future<String?> getSeedPhrase(String pin) async {
    if (!validatePin(pin)) return null;
    return await _secureStorage.read(key: 'seed_phrase');
  }
}
