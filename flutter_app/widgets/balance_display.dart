import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class BalanceDisplay extends StatelessWidget {
  final double balance;
  final double dollarChange;
  final double percentChange;
  final bool isLoading;
  final bool isConnected;

  const BalanceDisplay({
    super.key,
    required this.balance,
    required this.dollarChange,
    required this.percentChange,
    this.isLoading = false,
    this.isConnected = true,
  });

  String _formatBalance(double value) {
    return '\$${value.toStringAsFixed(2).replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}';
  }

  @override
  Widget build(BuildContext context) {
    final isPositive = percentChange >= 0;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (isLoading || !isConnected)
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: AppTheme.mutedForeground,
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  'Syncing wallet…',
                  style: TextStyle(
                    fontSize: 16,
                    color: AppTheme.mutedForeground,
                  ),
                ),
              ],
            )
          else ...[
            // Total Balance
            Text(
              _formatBalance(balance),
              style: const TextStyle(
                fontSize: 48,
                fontWeight: FontWeight.bold,
                letterSpacing: -1,
                color: AppTheme.foreground,
              ),
            ),

            // Change indicators
            if (balance > 0) ...[
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Dollar change
                  Text(
                    '${isPositive ? '+' : '-'}\$${dollarChange.abs().toStringAsFixed(2)}',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w500,
                      color: isPositive ? AppTheme.primary : AppTheme.destructive,
                    ),
                  ),
                  const SizedBox(width: 12),
                  // Percent change
                  Text(
                    '${isPositive ? '+' : ''}${percentChange.toStringAsFixed(2)}%',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w500,
                      color: isPositive ? AppTheme.primary : AppTheme.destructive,
                    ),
                  ),
                ],
              ),
            ],
          ],
        ],
      ),
    );
  }
}
