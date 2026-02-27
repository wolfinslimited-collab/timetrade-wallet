import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../widgets/wallet_header.dart';
import '../widgets/balance_card.dart';
import '../widgets/quick_actions.dart';
import '../widgets/token_list.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: RefreshIndicator(
        onRefresh: () async {
          await Future.delayed(const Duration(seconds: 1));
        },
        color: AppColors.primary,
        backgroundColor: AppColors.surface,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
          slivers: [
            // Header
            const SliverToBoxAdapter(child: WalletHeader()),

            // Balance
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 32),
                child: Column(
                  children: [
                    Text('Current balance', style: TextStyle(fontSize: 14, color: AppColors.textMuted)),
                    const SizedBox(height: 8),
                    const Text(
                      '\$0.00',
                      style: TextStyle(fontSize: 42, fontWeight: FontWeight.w700, letterSpacing: -1),
                    ),
                  ],
                ),
              ),
            ),

            // Quick Actions
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.symmetric(horizontal: 24),
                child: QuickActions(),
              ),
            ),

            // My Assets section
            SliverToBoxAdapter(
              child: Container(
                margin: const EdgeInsets.only(top: 24),
                padding: const EdgeInsets.only(top: 20, bottom: 16),
                decoration: BoxDecoration(
                  color: AppColors.card.withOpacity(0.6),
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                  border: Border(top: BorderSide(color: AppColors.border.withOpacity(0.3))),
                ),
                child: Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('My assets', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600)),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: AppColors.border),
                            ),
                            child: Text('see all', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    const TokenList(),
                  ],
                ),
              ),
            ),

            // Bottom padding for nav bar
            const SliverToBoxAdapter(child: SizedBox(height: 100)),
          ],
        ),
      ),
    );
  }
}
