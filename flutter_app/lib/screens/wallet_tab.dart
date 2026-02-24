import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:timetrade_wallet/services/blockchain_service.dart';
import 'package:timetrade_wallet/theme/app_theme.dart';
import 'package:intl/intl.dart';

class WalletTab extends StatelessWidget {
  const WalletTab({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<BlockchainService>(
      builder: (context, blockchain, _) {
        final balance = blockchain.totalBalanceUsd;
        final wholePart = balance.floor();
        final decimalPart = ((balance - wholePart) * 100).floor().toString().padLeft(2, '0');
        final formatter = NumberFormat('#,###');

        return SafeArea(
          child: RefreshIndicator(
            color: AppColors.primary,
            onRefresh: () async {
              // Trigger refresh
              await Future.delayed(const Duration(milliseconds: 800));
            },
            child: ListView(
              padding: EdgeInsets.zero,
              children: [
                // Header
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 36, height: 36,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: AppColors.primary.withOpacity(0.15),
                            ),
                            child: const Icon(Icons.account_balance_wallet, size: 18, color: AppColors.primary),
                          ),
                          const SizedBox(width: 10),
                          const Text('Timetrade', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                        ],
                      ),
                      Row(
                        children: [
                          IconButton(
                            icon: const Icon(Icons.notifications_none, color: AppColors.foreground),
                            onPressed: () {},
                          ),
                          IconButton(
                            icon: const Icon(Icons.qr_code_scanner, color: AppColors.foreground),
                            onPressed: () {},
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                // Balance
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 24),
                  child: Column(
                    children: [
                      Text('Current balance', style: Theme.of(context).textTheme.bodySmall),
                      const SizedBox(height: 8),
                      blockchain.isLoading
                        ? const CircularProgressIndicator(strokeWidth: 2)
                        : RichText(
                            text: TextSpan(
                              children: [
                                TextSpan(
                                  text: '\$${formatter.format(wholePart)}',
                                  style: const TextStyle(fontSize: 42, fontWeight: FontWeight.w700, color: AppColors.foreground),
                                ),
                                TextSpan(
                                  text: '.$decimalPart',
                                  style: const TextStyle(fontSize: 42, fontWeight: FontWeight.w700, color: AppColors.mutedForeground),
                                ),
                              ],
                            ),
                          ),
                    ],
                  ),
                ),
                // Quick Actions
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _quickAction(Icons.qr_code, 'Receive', () {}),
                      _quickAction(Icons.send, 'Send', () {}),
                      _quickAction(Icons.swap_horiz, 'Swap', () {}),
                      _quickAction(Icons.attach_money, 'Buy', () {}),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                // Assets
                Container(
                  decoration: BoxDecoration(
                    color: AppColors.card.withOpacity(0.6),
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                    border: Border(top: BorderSide(color: AppColors.border.withOpacity(0.3))),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Padding(
                        padding: const EdgeInsets.fromLTRB(20, 20, 20, 12),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('My assets', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600)),
                            TextButton(
                              onPressed: () {},
                              child: Text('see all', style: TextStyle(fontSize: 12, color: AppColors.mutedForeground)),
                            ),
                          ],
                        ),
                      ),
                      if (blockchain.balances.isEmpty)
                        const Padding(
                          padding: EdgeInsets.all(40),
                          child: Center(
                            child: Text('No assets yet', style: TextStyle(color: AppColors.mutedForeground)),
                          ),
                        )
                      else
                        ...blockchain.balances.map((token) => _tokenTile(token)),
                      const SizedBox(height: 100), // Bottom nav padding
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _quickAction(IconData icon, String label, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            width: 56, height: 56,
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border),
            ),
            child: Icon(icon, color: AppColors.primary, size: 24),
          ),
          const SizedBox(height: 6),
          Text(label, style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground)),
        ],
      ),
    );
  }

  Widget _tokenTile(TokenBalance token) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
      leading: Container(
        width: 42, height: 42,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: AppColors.primary.withOpacity(0.1),
        ),
        child: Center(
          child: Text(token.symbol.substring(0, token.symbol.length > 2 ? 2 : token.symbol.length),
            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: AppColors.primary),
          ),
        ),
      ),
      title: Text(token.name, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14)),
      subtitle: Text(token.network.toUpperCase(), style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground)),
      trailing: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Text('\$${token.usdValue.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
          Text('${token.balance.toStringAsFixed(4)} ${token.symbol}',
            style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground),
          ),
        ],
      ),
    );
  }
}
