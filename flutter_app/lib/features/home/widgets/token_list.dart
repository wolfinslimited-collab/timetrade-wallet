import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class TokenList extends StatelessWidget {
  const TokenList({super.key});

  static const _tokens = [
    _Token('Bitcoin', 'BTC', '0.00', '\$0.00', Icons.currency_bitcoin),
    _Token('Ethereum', 'ETH', '0.00', '\$0.00', Icons.diamond),
    _Token('Solana', 'SOL', '0.00', '\$0.00', Icons.bolt),
    _Token('TRON', 'TRX', '0.00', '\$0.00', Icons.hexagon),
    _Token('USDT', 'USDT', '0.00', '\$0.00', Icons.attach_money),
  ];

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Assets',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 12),
        ...List.generate(_tokens.length, (i) {
          final token = _tokens[i];
          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.border, width: 0.5),
            ),
            child: Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: AppColors.surfaceLight,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(token.icon, color: AppColors.primary, size: 20),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(token.name,
                          style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textPrimary)),
                      Text(token.symbol,
                          style: TextStyle(
                              fontSize: 13, color: AppColors.textMuted)),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(token.balance,
                        style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary)),
                    Text(token.value,
                        style:
                            TextStyle(fontSize: 13, color: AppColors.textMuted)),
                  ],
                ),
              ],
            ),
          );
        }),
      ],
    );
  }
}

class _Token {
  final String name, symbol, balance, value;
  final IconData icon;
  const _Token(this.name, this.symbol, this.balance, this.value, this.icon);
}
