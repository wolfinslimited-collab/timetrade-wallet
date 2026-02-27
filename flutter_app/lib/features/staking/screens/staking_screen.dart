import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/config/networks.dart';

class StakingScreen extends StatefulWidget {
  const StakingScreen({super.key});
  @override
  State<StakingScreen> createState() => _StakingScreenState();
}

class _StakingScreenState extends State<StakingScreen> {
  final _stablecoins = [
    _Stablecoin(symbol: 'USDT', name: 'Tether USD', balance: 0),
    _Stablecoin(symbol: 'USDC', name: 'USD Coin', balance: 0),
    _Stablecoin(symbol: 'DAI', name: 'Dai Stablecoin', balance: 0),
  ];

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: CustomScrollView(
        slivers: [
          // Header
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Staking', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
                      Text('Earn 15% monthly on stablecoins', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                    ],
                  ),
                  GestureDetector(
                    onTap: () {}, // TODO: Open stake sheet
                    child: Container(
                      width: 40, height: 40,
                      decoration: BoxDecoration(shape: BoxShape.circle, color: AppColors.textPrimary),
                      child: const Icon(Icons.add, color: AppColors.background),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Hero stats card
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  gradient: LinearGradient(
                    colors: [AppColors.card.withOpacity(0.9), AppColors.card.withOpacity(0.4)],
                    begin: Alignment.topLeft, end: Alignment.bottomRight,
                  ),
                  border: Border.all(color: AppColors.border.withOpacity(0.3)),
                ),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                          decoration: BoxDecoration(borderRadius: BorderRadius.circular(20), color: AppColors.textPrimary.withOpacity(0.1), border: Border.all(color: AppColors.textPrimary.withOpacity(0.1))),
                          child: Text('Fixed 15% /month', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textPrimary.withOpacity(0.8))),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                          decoration: BoxDecoration(borderRadius: BorderRadius.circular(20), color: AppColors.success.withOpacity(0.1), border: Border.all(color: AppColors.success.withOpacity(0.2))),
                          child: Text('Active', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.success)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('TOTAL STAKED', style: TextStyle(fontSize: 11, letterSpacing: 1, color: AppColors.textMuted, fontWeight: FontWeight.w500)),
                              const SizedBox(height: 4),
                              const Text('\$0.00', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, fontFamily: 'monospace')),
                            ],
                          ),
                        ),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('TOTAL EARNED', style: TextStyle(fontSize: 11, letterSpacing: 1, color: AppColors.textMuted, fontWeight: FontWeight.w500)),
                              const SizedBox(height: 4),
                              Text('+\$0.00', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, fontFamily: 'monospace', color: AppColors.success)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),

          // Available stablecoins
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
              child: Text('AVAILABLE TO STAKE', style: TextStyle(fontSize: 11, letterSpacing: 1.5, fontWeight: FontWeight.w600, color: AppColors.textMuted)),
            ),
          ),

          SliverList(
            delegate: SliverChildBuilderDelegate(
              (_, i) {
                final coin = _stablecoins[i];
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border.withOpacity(0.3))),
                    child: Row(
                      children: [
                        ClipOval(child: CachedNetworkImage(imageUrl: getCryptoLogoUrl(coin.symbol), width: 40, height: 40, errorWidget: (_, __, ___) => Container(width: 40, height: 40, color: AppColors.surfaceLight))),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(coin.symbol, style: const TextStyle(fontWeight: FontWeight.w600)),
                              Text(coin.name, style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                            ],
                          ),
                        ),
                        Text('${coin.balance}', style: const TextStyle(fontWeight: FontWeight.w500)),
                      ],
                    ),
                  ),
                );
              },
              childCount: _stablecoins.length,
            ),
          ),

          // Active positions placeholder
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
              child: Text('ACTIVE POSITIONS', style: TextStyle(fontSize: 11, letterSpacing: 1.5, fontWeight: FontWeight.w600, color: AppColors.textMuted)),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Center(child: Text('No active staking positions', style: TextStyle(color: AppColors.textMuted, fontSize: 13))),
            ),
          ),

          const SliverToBoxAdapter(child: SizedBox(height: 100)),
        ],
      ),
    );
  }
}

class _Stablecoin {
  final String symbol;
  final String name;
  final double balance;
  const _Stablecoin({required this.symbol, required this.name, required this.balance});
}
