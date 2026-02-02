import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:bip39/bip39.dart' as bip39;
import '../models/wallet_account.dart';

class WalletService extends ChangeNotifier {
  static const _storage = FlutterSecureStorage();
  
  // Storage keys (mirrors React localStorage keys)
  static const String _keyWalletCreated = 'timetrade_wallet_created';
  static const String _keyPin = 'timetrade_pin';
  static const String _keySeedPhrase = 'timetrade_seed_phrase';
  static const String _keyBiometric = 'timetrade_biometric';
  static const String _keyUserAccounts = 'timetrade_user_accounts';
  static const String _keyActiveAccountId = 'timetrade_active_account_id';
  static const String _keyAddressEvm = 'timetrade_wallet_address_evm';
  static const String _keyAddressSolana = 'timetrade_wallet_address_solana';
  static const String _keyAddressTron = 'timetrade_wallet_address_tron';

  bool _isInitialized = false;
  bool _hasWallet = false;
  bool _hasPin = false;
  bool _biometricEnabled = false;
  String? _storedPin;
  WalletAccount? _activeAccount;
  List<WalletAccount> _accounts = [];

  // Getters
  bool get isInitialized => _isInitialized;
  bool get hasWallet => _hasWallet;
  bool get hasPin => _hasPin;
  bool get biometricEnabled => _biometricEnabled;
  WalletAccount? get activeAccount => _activeAccount;
  List<WalletAccount> get accounts => _accounts;

  String? get evmAddress => _activeAccount?.evmAddress;
  String? get solanaAddress => _activeAccount?.solanaAddress;
  String? get tronAddress => _activeAccount?.tronAddress;

  /// Initialize wallet service - check stored state
  Future<void> initialize() async {
    try {
      final walletCreated = await _storage.read(key: _keyWalletCreated);
      final pin = await _storage.read(key: _keyPin);
      final biometric = await _storage.read(key: _keyBiometric);
      final accountsJson = await _storage.read(key: _keyUserAccounts);

      _hasWallet = walletCreated == 'true';
      _hasPin = pin != null && pin.isNotEmpty;
      _storedPin = pin;
      _biometricEnabled = biometric == 'true';

      if (accountsJson != null) {
        final List<dynamic> decoded = jsonDecode(accountsJson);
        _accounts = decoded.map((e) => WalletAccount.fromJson(e)).toList();
        
        // Load active account
        final activeId = await _storage.read(key: _keyActiveAccountId);
        if (activeId != null && _accounts.isNotEmpty) {
          _activeAccount = _accounts.firstWhere(
            (a) => a.id == activeId,
            orElse: () => _accounts.first,
          );
        } else if (_accounts.isNotEmpty) {
          _activeAccount = _accounts.first;
        }

        // Load addresses for active account
        await _loadActiveAddresses();
      }

      _isInitialized = true;
      notifyListeners();
    } catch (e) {
      debugPrint('WalletService initialization error: $e');
      _isInitialized = true;
      notifyListeners();
    }
  }

  Future<void> _loadActiveAddresses() async {
    if (_activeAccount == null) return;

    final evmAddr = await _storage.read(key: _keyAddressEvm);
    final solanaAddr = await _storage.read(key: _keyAddressSolana);
    final tronAddr = await _storage.read(key: _keyAddressTron);

    _activeAccount = _activeAccount!.copyWith(
      evmAddress: evmAddr,
      solanaAddress: solanaAddr,
      tronAddress: tronAddr,
    );
  }

  /// Generate a new 12 or 24 word mnemonic
  List<String> generateSeedPhrase({int wordCount = 12}) {
    final strength = wordCount == 24 ? 256 : 128;
    final mnemonic = bip39.generateMnemonic(strength: strength);
    return mnemonic.split(' ');
  }

  /// Validate a mnemonic phrase
  bool validateSeedPhrase(List<String> words) {
    final mnemonic = words.join(' ');
    return bip39.validateMnemonic(mnemonic);
  }

  /// Validate mnemonic string (async version for compatibility)
  Future<bool> validateMnemonic(String mnemonic) async {
    return bip39.validateMnemonic(mnemonic);
  }

  /// Store mnemonic temporarily (to be encrypted with PIN later)
  String? _tempMnemonic;
  Future<void> storeMnemonic(String mnemonic) async {
    _tempMnemonic = mnemonic;
  }

  /// Set PIN and complete wallet setup
  Future<void> setPin(String pin) async {
    if (_tempMnemonic == null) {
      throw Exception('No mnemonic stored');
    }
    
    // Store PIN
    await _storage.write(key: _keyPin, value: pin);
    _storedPin = pin;
    _hasPin = true;

    // Encrypt and store seed phrase
    final encryptedPhrase = _encryptWithPin(_tempMnemonic!, pin);
    await _storage.write(key: _keySeedPhrase, value: encryptedPhrase);

    // Derive addresses
    final words = _tempMnemonic!.split(' ');
    final addresses = await _deriveAddresses(words, 0);

    // Create main account
    final mainAccount = WalletAccount(
      id: 'main',
      name: 'Main Wallet',
      type: AccountType.mnemonic,
      createdAt: DateTime.now(),
      evmAddress: addresses['evm'],
      solanaAddress: addresses['solana'],
      tronAddress: addresses['tron'],
    );

    _accounts = [mainAccount];
    _activeAccount = mainAccount;

    // Persist
    await _storage.write(key: _keyWalletCreated, value: 'true');
    await _storage.write(
      key: _keyUserAccounts,
      value: jsonEncode(_accounts.map((a) => a.toJson()).toList()),
    );
    await _storage.write(key: _keyActiveAccountId, value: mainAccount.id);
    await _storage.write(key: _keyAddressEvm, value: addresses['evm']);
    await _storage.write(key: _keyAddressSolana, value: addresses['solana']);
    await _storage.write(key: _keyAddressTron, value: addresses['tron']);

    _hasWallet = true;
    _tempMnemonic = null;
    notifyListeners();
  }

  /// Check if biometric is enabled
  Future<bool> isBiometricEnabled() async {
    return _biometricEnabled;
  }

  /// Set biometric enabled status
  Future<void> setBiometricEnabled(bool enabled) async {
    await setBiometric(enabled);
  }

  /// Get count of stored keys
  Future<int> getStoredKeysCount() async {
    // Return 0 for now - implement key storage later
    return 0;
  }

  /// Get wallet name
  Future<String?> getWalletName() async {
    return _activeAccount?.name;
  }

  /// Get active account index
  Future<int> getActiveAccountIndex() async {
    if (_activeAccount == null) return 0;
    final index = _accounts.indexWhere((a) => a.id == _activeAccount!.id);
    return index >= 0 ? index : 0;
  }

  /// Get all addresses for the active account
  Future<Map<String, String>> getAllAddresses() async {
    return {
      'evm': _activeAccount?.evmAddress ?? '',
      'solana': _activeAccount?.solanaAddress ?? '',
      'tron': _activeAccount?.tronAddress ?? '',
      'btc': _activeAccount?.btcAddress ?? '',
    };
  }

  /// Verify PIN
  bool verifyPin(String pin) {
    return pin == _storedPin;
  }

  /// Complete onboarding with seed phrase and PIN
  Future<void> completeOnboarding({
    required List<String> seedPhrase,
    required String pin,
    required String walletName,
  }) async {
    try {
      // Store PIN
      await _storage.write(key: _keyPin, value: pin);
      _storedPin = pin;
      _hasPin = true;

      // Encrypt and store seed phrase
      // In production, use proper encryption with the PIN as key
      final encryptedPhrase = _encryptWithPin(seedPhrase.join(' '), pin);
      await _storage.write(key: _keySeedPhrase, value: encryptedPhrase);

      // Derive addresses for all chains
      final addresses = await _deriveAddresses(seedPhrase, 0);

      // Create main account
      final mainAccount = WalletAccount(
        id: 'main',
        name: walletName,
        type: AccountType.mnemonic,
        createdAt: DateTime.now(),
        evmAddress: addresses['evm'],
        solanaAddress: addresses['solana'],
        tronAddress: addresses['tron'],
      );

      _accounts = [mainAccount];
      _activeAccount = mainAccount;

      // Persist
      await _storage.write(key: _keyWalletCreated, value: 'true');
      await _storage.write(
        key: _keyUserAccounts,
        value: jsonEncode(_accounts.map((a) => a.toJson()).toList()),
      );
      await _storage.write(key: _keyActiveAccountId, value: mainAccount.id);
      await _storage.write(key: _keyAddressEvm, value: addresses['evm']);
      await _storage.write(key: _keyAddressSolana, value: addresses['solana']);
      await _storage.write(key: _keyAddressTron, value: addresses['tron']);

      _hasWallet = true;
      notifyListeners();
    } catch (e) {
      debugPrint('Onboarding error: $e');
      rethrow;
    }
  }

  /// Derive multi-chain addresses from seed phrase
  Future<Map<String, String?>> _deriveAddresses(
    List<String> seedPhrase,
    int accountIndex,
  ) async {
    // This is a placeholder - implement actual derivation using:
    // - bip32/bip39 for EVM (m/44'/60'/0'/0/index)
    // - ed25519-hd-key for Solana (m/44'/501'/index'/0')
    // - bip32 for Tron (m/44'/195'/0'/0/index)
    
    // For now, return mock addresses
    return {
      'evm': '0x${_generateMockAddress(40)}',
      'solana': _generateMockSolanaAddress(),
      'tron': 'T${_generateMockAddress(33)}',
    };
  }

  String _generateMockAddress(int length) {
    const chars = '0123456789abcdef';
    return List.generate(length, (i) => chars[i % chars.length]).join();
  }

  String _generateMockSolanaAddress() {
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    return List.generate(44, (i) => chars[i % chars.length]).join();
  }

  /// Simple XOR encryption with PIN (use proper encryption in production)
  String _encryptWithPin(String data, String pin) {
    // In production, use AES-GCM with PBKDF2 key derivation
    // This is just a placeholder
    return base64Encode(utf8.encode(data));
  }

  String? _decryptWithPin(String encrypted, String pin) {
    try {
      return utf8.decode(base64Decode(encrypted));
    } catch (e) {
      return null;
    }
  }

  /// Enable/disable biometric authentication
  Future<void> setBiometric(bool enabled) async {
    await _storage.write(key: _keyBiometric, value: enabled ? 'true' : 'false');
    _biometricEnabled = enabled;
    notifyListeners();
  }

  /// Switch active account
  Future<void> switchAccount(String accountId) async {
    final account = _accounts.firstWhere((a) => a.id == accountId);
    _activeAccount = account;
    
    await _storage.write(key: _keyActiveAccountId, value: accountId);
    await _storage.write(key: _keyAddressEvm, value: account.evmAddress);
    await _storage.write(key: _keyAddressSolana, value: account.solanaAddress);
    await _storage.write(key: _keyAddressTron, value: account.tronAddress);
    
    notifyListeners();
  }

  /// Add a new account from the same seed phrase (next derivation index)
  Future<WalletAccount?> addAccountFromSeed({String? name, required String pin}) async {
    if (!verifyPin(pin)) return null;
    
    final encrypted = await _storage.read(key: _keySeedPhrase);
    if (encrypted == null) return null;
    
    final decrypted = _decryptWithPin(encrypted, pin);
    if (decrypted == null) return null;
    
    final words = decrypted.split(' ');
    final nextIndex = _accounts.length;
    final accountName = name ?? 'Account ${nextIndex + 1}';
    
    // Derive addresses for new index
    final addresses = await _deriveAddresses(words, nextIndex);
    
    final newAccount = WalletAccount(
      id: 'account_$nextIndex',
      name: accountName,
      type: AccountType.mnemonic,
      createdAt: DateTime.now(),
      evmAddress: addresses['evm'],
      solanaAddress: addresses['solana'],
      tronAddress: addresses['tron'],
    );
    
    _accounts.add(newAccount);
    
    // Persist updated accounts list
    await _storage.write(
      key: _keyUserAccounts,
      value: jsonEncode(_accounts.map((a) => a.toJson()).toList()),
    );
    
    notifyListeners();
    return newAccount;
  }

  /// Import account from a new seed phrase
  Future<WalletAccount?> importFromSeedPhrase(List<String> words, {String? name, required String pin}) async {
    if (!verifyPin(pin)) return null;
    if (!validateSeedPhrase(words)) return null;
    
    final nextIndex = _accounts.length;
    final accountName = name ?? 'Imported ${nextIndex + 1}';
    
    // Derive addresses for this new seed
    final addresses = await _deriveAddresses(words, 0);
    
    final newAccount = WalletAccount(
      id: 'imported_${DateTime.now().millisecondsSinceEpoch}',
      name: accountName,
      type: AccountType.mnemonic,
      createdAt: DateTime.now(),
      evmAddress: addresses['evm'],
      solanaAddress: addresses['solana'],
      tronAddress: addresses['tron'],
    );
    
    _accounts.add(newAccount);
    
    // Persist updated accounts list
    await _storage.write(
      key: _keyUserAccounts,
      value: jsonEncode(_accounts.map((a) => a.toJson()).toList()),
    );
    
    notifyListeners();
    return newAccount;
  }

  /// Import account from a private key (EVM only)
  Future<WalletAccount?> importFromPrivateKey(String privateKey, {String? name, required String pin}) async {
    if (!verifyPin(pin)) return null;
    
    // Validate private key format (0x prefix + 64 hex chars)
    final cleanKey = privateKey.startsWith('0x') ? privateKey.substring(2) : privateKey;
    if (cleanKey.length != 64 || !RegExp(r'^[0-9a-fA-F]+$').hasMatch(cleanKey)) {
      return null;
    }
    
    final nextIndex = _accounts.length;
    final accountName = name ?? 'Imported Key ${nextIndex + 1}';
    
    // Derive EVM address from private key
    // TODO: Implement actual private key to address derivation
    final evmAddress = '0x${cleanKey.substring(0, 40)}'; // Placeholder
    
    final newAccount = WalletAccount(
      id: 'pk_${DateTime.now().millisecondsSinceEpoch}',
      name: accountName,
      type: AccountType.privateKey,
      createdAt: DateTime.now(),
      evmAddress: evmAddress,
    );
    
    _accounts.add(newAccount);
    
    // Persist updated accounts list
    await _storage.write(
      key: _keyUserAccounts,
      value: jsonEncode(_accounts.map((a) => a.toJson()).toList()),
    );
    
    notifyListeners();
    return newAccount;
  }

  /// Delete an account (cannot delete last account)
  Future<bool> deleteAccount(String accountId, String pin) async {
    if (!verifyPin(pin)) return false;
    if (_accounts.length <= 1) return false;
    
    final index = _accounts.indexWhere((a) => a.id == accountId);
    if (index == -1) return false;
    
    _accounts.removeAt(index);
    
    // If deleted account was active, switch to first available
    if (_activeAccount?.id == accountId) {
      _activeAccount = _accounts.first;
      await _storage.write(key: _keyActiveAccountId, value: _activeAccount!.id);
      await _storage.write(key: _keyAddressEvm, value: _activeAccount!.evmAddress);
      await _storage.write(key: _keyAddressSolana, value: _activeAccount!.solanaAddress);
      await _storage.write(key: _keyAddressTron, value: _activeAccount!.tronAddress);
    }
    
    // Persist updated accounts list
    await _storage.write(
      key: _keyUserAccounts,
      value: jsonEncode(_accounts.map((a) => a.toJson()).toList()),
    );
    
    notifyListeners();
    return true;
  }

  /// Force reload accounts from storage (useful for sync)
  Future<void> reloadAccounts() async {
    final accountsJson = await _storage.read(key: _keyUserAccounts);
    if (accountsJson != null) {
      try {
        final List<dynamic> decoded = jsonDecode(accountsJson);
        _accounts = decoded.map((e) => WalletAccount.fromJson(e)).toList();
        
        // Reload active account
        final activeId = await _storage.read(key: _keyActiveAccountId);
        if (activeId != null && _accounts.isNotEmpty) {
          _activeAccount = _accounts.firstWhere(
            (a) => a.id == activeId,
            orElse: () => _accounts.first,
          );
        } else if (_accounts.isNotEmpty) {
          _activeAccount = _accounts.first;
        }
        
        await _loadActiveAddresses();
        notifyListeners();
      } catch (e) {
        debugPrint('Error reloading accounts: $e');
      }
    }
  }

  /// Rename an account
  Future<void> renameAccount(String accountId, String newName) async {
    final index = _accounts.indexWhere((a) => a.id == accountId);
    if (index != -1) {
      _accounts[index] = _accounts[index].copyWith(name: newName);
      await _storage.write(
        key: _keyUserAccounts,
        value: jsonEncode(_accounts.map((a) => a.toJson()).toList()),
      );
      
      if (_activeAccount?.id == accountId) {
        _activeAccount = _accounts[index];
      }
      notifyListeners();
    }
  }

  /// Complete wallet reset
  Future<void> resetWallet() async {
    await _storage.deleteAll();
    
    _hasWallet = false;
    _hasPin = false;
    _storedPin = null;
    _biometricEnabled = false;
    _accounts = [];
    _activeAccount = null;
    
    notifyListeners();
  }

  /// Change PIN
  Future<void> changePin(String oldPin, String newPin) async {
    if (!verifyPin(oldPin)) {
      throw Exception('Invalid current PIN');
    }

    // Re-encrypt seed phrase with new PIN
    final encryptedPhrase = await _storage.read(key: _keySeedPhrase);
    if (encryptedPhrase != null) {
      final decrypted = _decryptWithPin(encryptedPhrase, oldPin);
      if (decrypted != null) {
        final reEncrypted = _encryptWithPin(decrypted, newPin);
        await _storage.write(key: _keySeedPhrase, value: reEncrypted);
      }
    }

    await _storage.write(key: _keyPin, value: newPin);
    _storedPin = newPin;
    notifyListeners();
  }

  /// Get decrypted seed phrase (requires PIN)
  Future<List<String>?> getSeedPhrase(String pin) async {
    if (!verifyPin(pin)) return null;

    final encrypted = await _storage.read(key: _keySeedPhrase);
    if (encrypted == null) return null;

    final decrypted = _decryptWithPin(encrypted, pin);
    return decrypted?.split(' ');
  }
}
