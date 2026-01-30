class StakingPosition {
  final String id;
  final String walletAddress;
  final String tokenSymbol;
  final String chain;
  final double amount;
  final double apyRate;
  final DateTime stakedAt;
  final DateTime unlockAt;
  final bool isActive;
  final double earnedRewards;
  final String? txHash;

  StakingPosition({
    required this.id,
    required this.walletAddress,
    required this.tokenSymbol,
    required this.chain,
    required this.amount,
    required this.apyRate,
    required this.stakedAt,
    required this.unlockAt,
    required this.isActive,
    required this.earnedRewards,
    this.txHash,
  });

  factory StakingPosition.fromJson(Map<String, dynamic> json) {
    return StakingPosition(
      id: json['id'] as String,
      walletAddress: json['wallet_address'] as String,
      tokenSymbol: json['token_symbol'] as String,
      chain: json['chain'] as String,
      amount: (json['amount'] as num).toDouble(),
      apyRate: (json['apy_rate'] as num).toDouble(),
      stakedAt: DateTime.parse(json['staked_at'] as String),
      unlockAt: DateTime.parse(json['unlock_at'] as String),
      isActive: json['is_active'] as bool? ?? true,
      earnedRewards: (json['earned_rewards'] as num?)?.toDouble() ?? 0.0,
      txHash: json['tx_hash'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'wallet_address': walletAddress,
      'token_symbol': tokenSymbol,
      'chain': chain,
      'amount': amount,
      'apy_rate': apyRate,
      'staked_at': stakedAt.toIso8601String(),
      'unlock_at': unlockAt.toIso8601String(),
      'is_active': isActive,
      'earned_rewards': earnedRewards,
      'tx_hash': txHash,
    };
  }
}
