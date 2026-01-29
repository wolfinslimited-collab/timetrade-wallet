import 'wallet_account.dart';

class Token {
  final String symbol;
  final String name;
  final ChainType chain;
  final double balance;
  final double usdValue;
  final double price;
  final double change24h;
  final int decimals;
  final String? contractAddress;
  final bool isNative;

  Token({
    required this.symbol,
    required this.name,
    required this.chain,
    required this.balance,
    required this.usdValue,
    required this.price,
    required this.change24h,
    required this.decimals,
    this.contractAddress,
    this.isNative = false,
  });

  String get logoUrl {
    return 'https://api.elbstream.com/logos/crypto/${symbol.toLowerCase()}';
  }

  String get uniqueKey {
    // Composite key for multi-chain deduplication
    return '${chain.name}:$symbol:${contractAddress ?? 'native'}';
  }

  String get formattedBalance {
    if (balance >= 1000000) {
      return '${(balance / 1000000).toStringAsFixed(2)}M';
    } else if (balance >= 1000) {
      return '${(balance / 1000).toStringAsFixed(2)}K';
    } else if (balance >= 1) {
      return balance.toStringAsFixed(4);
    } else {
      return balance.toStringAsFixed(6);
    }
  }

  String get formattedUsdValue {
    return '\$${usdValue.toStringAsFixed(2)}';
  }

  String get formattedChange24h {
    final prefix = change24h >= 0 ? '+' : '';
    return '$prefix${change24h.toStringAsFixed(2)}%';
  }

  bool get isPositiveChange => change24h >= 0;

  factory Token.fromJson(Map<String, dynamic> json, ChainType chain) {
    return Token(
      symbol: json['symbol'] as String,
      name: json['name'] as String? ?? json['symbol'] as String,
      chain: chain,
      balance: (json['balance'] as num).toDouble(),
      usdValue: (json['usdValue'] as num?)?.toDouble() ?? 0.0,
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      change24h: (json['change24h'] as num?)?.toDouble() ?? 0.0,
      decimals: json['decimals'] as int? ?? 18,
      contractAddress: json['contractAddress'] as String?,
      isNative: json['isNative'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'symbol': symbol,
      'name': name,
      'chain': chain.name,
      'balance': balance,
      'usdValue': usdValue,
      'price': price,
      'change24h': change24h,
      'decimals': decimals,
      'contractAddress': contractAddress,
      'isNative': isNative,
    };
  }
}

class Transaction {
  final String hash;
  final ChainType chain;
  final TransactionType type;
  final String from;
  final String to;
  final double amount;
  final String symbol;
  final double? usdValue;
  final double fee;
  final String feeSymbol;
  final DateTime timestamp;
  final TransactionStatus status;

  Transaction({
    required this.hash,
    required this.chain,
    required this.type,
    required this.from,
    required this.to,
    required this.amount,
    required this.symbol,
    this.usdValue,
    required this.fee,
    required this.feeSymbol,
    required this.timestamp,
    required this.status,
  });

  bool get isSend => type == TransactionType.send;
  bool get isReceive => type == TransactionType.receive;

  String get formattedAmount {
    final prefix = isSend ? '-' : '+';
    return '$prefix${amount.toStringAsFixed(6)} $symbol';
  }

  String get shortHash {
    if (hash.length <= 16) return hash;
    return '${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}';
  }

  String get explorerUrl {
    switch (chain) {
      case ChainType.ethereum:
        return 'https://etherscan.io/tx/$hash';
      case ChainType.polygon:
        return 'https://polygonscan.com/tx/$hash';
      case ChainType.solana:
        return 'https://solscan.io/tx/$hash';
      case ChainType.tron:
        return 'https://tronscan.org/#/transaction/$hash';
      case ChainType.bitcoin:
        return 'https://blockstream.info/tx/$hash';
    }
  }

  factory Transaction.fromJson(Map<String, dynamic> json) {
    return Transaction(
      hash: json['hash'] as String,
      chain: ChainType.values.firstWhere(
        (e) => e.name == json['chain'],
        orElse: () => ChainType.ethereum,
      ),
      type: TransactionType.values.firstWhere(
        (e) => e.name == json['type'],
        orElse: () => TransactionType.send,
      ),
      from: json['from'] as String,
      to: json['to'] as String,
      amount: (json['amount'] as num).toDouble(),
      symbol: json['symbol'] as String,
      usdValue: (json['usdValue'] as num?)?.toDouble(),
      fee: (json['fee'] as num).toDouble(),
      feeSymbol: json['feeSymbol'] as String,
      timestamp: DateTime.parse(json['timestamp'] as String),
      status: TransactionStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => TransactionStatus.confirmed,
      ),
    );
  }
}

enum TransactionType {
  send,
  receive,
  swap,
  contract,
}

enum TransactionStatus {
  pending,
  confirmed,
  failed,
}
