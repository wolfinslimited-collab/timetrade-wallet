import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/config/networks.dart';

class MarketScreen extends StatelessWidget {
  const MarketScreen({super.key});

  static const _tokens = [
    _MarketToken(symbol: 'BTC', name: 'Bitcoin', price: 97000, change: 1.5),
    _MarketToken(symbol: 'ETH', name: 'Ethereum', price: 3500, change: 2.4),
    _MarketToken(symbol: 'SOL', name: 'Solana', price: 180, change: -1.2),
    _MarketToken(symbol: 'BNB', name: 'BNB', price: 620, change: 0.8),
    _MarketToken(symbol: 'TRX', name: 'Tron', price: 0.12, change: -0.5),
    _MarketToken(symbol: 'POL', name: 'Polygon', price: 0.45, change: 3.1),
    _MarketToken(symbol: 'USDT', name: 'Tether', price: 1.00, change: 0.01),
    _MarketToken(symbol: 'USDC', name: 'USD Coin', price: 1.00, change: -0.02),
  ];

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                GestureDetector(
                  onTap: () => Navigator.pop(context),
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(shape: BoxShape.circle, color: AppColors.card, border: Border.all(color: AppColors.border)),
                    child: const Icon(Icons.chevron_left, size: 20),
                  ),
                ),
                const SizedBox(width: 12),
                const Text('Market', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
              ],
            ),
          ),

          // Search
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: TextField(
              decoration: InputDecoration(hintText: 'Search tokens...', prefixIcon: const Icon(Icons.search, size: 20)),
            ),
          ),
          const SizedBox(height: 16),

          Expanded(
            child: ListView.builder(
              itemCount: _tokens.length,
              itemBuilder: (_, i) {
                final t = _tokens[i];
                final isPositive = t.change >= 0;
                return ListTile(
                  leading: ClipOval(
                    child: CachedNetworkImage(imageUrl: getCryptoLogoUrl(t.symbol), width: 40, height: 40,
                        errorWidget: (_, __, ___) => Container(width: 40, height: 40, color: AppColors.surfaceLight, child: Center(child: Text(t.symbol.substring(0, 2))))),
                  ),
                  title: Text(t.name),
                  subtitle: Text(t.symbol, style: TextStyle(color: AppColors.textMuted)),
                  trailing: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text('\$${t.price.toStringAsFixed(t.price >= 1 ? 2 : 4)}', style: const TextStyle(fontWeight: FontWeight.w600)),
                      Text('${isPositive ? "+" : ""}${t.change.toStringAsFixed(2)}%',
                          style: TextStyle(fontSize: 12, color: isPositive ? AppColors.success : AppColors.destructive)),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _MarketToken {
  final String symbol;
  final String name;
  final double price;
  final double change;
  const _MarketToken({required this.symbol, required this.name, required this.price, required this.change});
}
