import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:timetrade_wallet/services/staking_service.dart';
import 'package:timetrade_wallet/theme/app_theme.dart';
import 'package:timetrade_wallet/config/constants.dart';

class StakingTab extends StatelessWidget {
  const StakingTab({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<StakingService>(
      builder: (context, staking, _) {
        return SafeArea(
          child: ListView(
            padding: const EdgeInsets.only(bottom: 100),
            children: [
              const Padding(
                padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
                child: Text('Staking', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
              ),
              // APY banner
              Container(
                margin: const EdgeInsets.all(16),
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [AppColors.primary.withOpacity(0.15), AppColors.primary.withOpacity(0.05)],
                  ),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.primary.withOpacity(0.2)),
                ),
                child: Column(
                  children: [
                    const Text('Earn up to', style: TextStyle(color: AppColors.mutedForeground, fontSize: 14)),
                    const SizedBox(height: 4),
                    Text(
                      '${AppConstants.stakingApyRate.toStringAsFixed(0)}% APY',
                      style: const TextStyle(fontSize: 36, fontWeight: FontWeight.w700, color: AppColors.primary),
                    ),
                    const SizedBox(height: 4),
                    const Text('on stablecoin staking', style: TextStyle(color: AppColors.mutedForeground, fontSize: 13)),
                  ],
                ),
              ),
              // Stats
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  children: [
                    _statCard('Total Staked', '\$${staking.totalStaked.toStringAsFixed(2)}'),
                    const SizedBox(width: 12),
                    _statCard('Rewards', '\$${staking.totalRewards.toStringAsFixed(2)}'),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              // Positions
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16),
                child: Text('Active Positions', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
              ),
              const SizedBox(height: 8),
              if (staking.positions.isEmpty)
                const Padding(
                  padding: EdgeInsets.all(40),
                  child: Center(child: Text('No staking positions yet', style: TextStyle(color: AppColors.mutedForeground))),
                )
              else
                ...staking.positions.map((p) => ListTile(
                  title: Text('${p.amount.toStringAsFixed(2)} ${p.tokenSymbol}'),
                  subtitle: Text('${p.apyRate}% APY · ${p.chain.toUpperCase()}',
                    style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground)),
                  trailing: Text('+\$${p.earnedRewards.toStringAsFixed(4)}',
                    style: const TextStyle(color: AppColors.success, fontWeight: FontWeight.w600)),
                )),
            ],
          ),
        );
      },
    );
  }

  Widget _statCard(String label, String value) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground)),
            const SizedBox(height: 4),
            Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
          ],
        ),
      ),
    );
  }
}
