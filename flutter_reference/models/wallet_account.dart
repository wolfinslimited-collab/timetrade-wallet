class WalletAccount {
  final String id;
  final String name;
  final AccountType type;
  final DateTime createdAt;
  
  // Chain addresses derived from this account
  String? evmAddress;
  String? solanaAddress;
  String? tronAddress;
  String? btcAddress;

  WalletAccount({
    required this.id,
    required this.name,
    required this.type,
    required this.createdAt,
    this.evmAddress,
    this.solanaAddress,
    this.tronAddress,
    this.btcAddress,
  });

  factory WalletAccount.fromJson(Map<String, dynamic> json) {
    return WalletAccount(
      id: json['id'] as String,
      name: json['name'] as String,
      type: AccountType.values.firstWhere(
        (e) => e.name == json['type'],
        orElse: () => AccountType.mnemonic,
      ),
      createdAt: DateTime.parse(json['createdAt'] as String),
      evmAddress: json['evmAddress'] as String?,
      solanaAddress: json['solanaAddress'] as String?,
      tronAddress: json['tronAddress'] as String?,
      btcAddress: json['btcAddress'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'type': type.name,
      'createdAt': createdAt.toIso8601String(),
      'evmAddress': evmAddress,
      'solanaAddress': solanaAddress,
      'tronAddress': tronAddress,
      'btcAddress': btcAddress,
    };
  }

  WalletAccount copyWith({
    String? id,
    String? name,
    AccountType? type,
    DateTime? createdAt,
    String? evmAddress,
    String? solanaAddress,
    String? tronAddress,
    String? btcAddress,
  }) {
    return WalletAccount(
      id: id ?? this.id,
      name: name ?? this.name,
      type: type ?? this.type,
      createdAt: createdAt ?? this.createdAt,
      evmAddress: evmAddress ?? this.evmAddress,
      solanaAddress: solanaAddress ?? this.solanaAddress,
      tronAddress: tronAddress ?? this.tronAddress,
      btcAddress: btcAddress ?? this.btcAddress,
    );
  }
}

enum AccountType {
  mnemonic,    // Derived from seed phrase
  privateKey,  // Imported private key (EVM only)
}

enum ChainType {
  ethereum,
  polygon,
  solana,
  tron,
  bitcoin,
}

extension ChainTypeExtension on ChainType {
  String get displayName {
    switch (this) {
      case ChainType.ethereum:
        return 'Ethereum';
      case ChainType.polygon:
        return 'Polygon';
      case ChainType.solana:
        return 'Solana';
      case ChainType.tron:
        return 'Tron';
      case ChainType.bitcoin:
        return 'Bitcoin';
    }
  }

  String get symbol {
    switch (this) {
      case ChainType.ethereum:
        return 'ETH';
      case ChainType.polygon:
        return 'POL';
      case ChainType.solana:
        return 'SOL';
      case ChainType.tron:
        return 'TRX';
      case ChainType.bitcoin:
        return 'BTC';
    }
  }

  String get logoUrl {
    final symbol = this.symbol.toLowerCase();
    return 'https://api.elbstream.com/logos/crypto/$symbol';
  }
}
