import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

class SwapToken {
  final String symbol;
  final String name;
  final String logoUrl;
  final double balance;
  final double price;
  final Color color;

  const SwapToken({
    required this.symbol,
    required this.name,
    required this.logoUrl,
    required this.balance,
    required this.price,
    required this.color,
  });
}

class SwapTokenSelector extends StatefulWidget {
  final List<SwapToken> tokens;
  final SwapToken selectedToken;
  final SwapToken? excludeToken;
  final Function(SwapToken) onSelect;
  final VoidCallback onClose;

  const SwapTokenSelector({
    super.key,
    required this.tokens,
    required this.selectedToken,
    this.excludeToken,
    required this.onSelect,
    required this.onClose,
  });

  @override
  State<SwapTokenSelector> createState() => _SwapTokenSelectorState();
}

class _SwapTokenSelectorState extends State<SwapTokenSelector> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  List<SwapToken> get filteredTokens {
    return widget.tokens.where((token) {
      if (widget.excludeToken != null && token.symbol == widget.excludeToken!.symbol) {
        return false;
      }
      if (_searchQuery.isEmpty) return true;
      return token.symbol.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          token.name.toLowerCase().contains(_searchQuery.toLowerCase());
    }).toList();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.7,
      decoration: const BoxDecoration(
        color: AppTheme.background,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Handle bar
          Container(
            margin: const EdgeInsets.only(top: 12),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppTheme.border,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          // Header
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                const Expanded(
                  child: Text(
                    'Select Token',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.foreground,
                    ),
                  ),
                ),
                GestureDetector(
                  onTap: widget.onClose,
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppTheme.card,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(
                      Icons.close,
                      size: 20,
                      color: AppTheme.mutedForeground,
                    ),
                  ),
                ),
              ],
            ),
          ),
          // Search
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Container(
              decoration: BoxDecoration(
                color: AppTheme.secondary.withOpacity(0.5),
                borderRadius: BorderRadius.circular(12),
              ),
              child: TextField(
                controller: _searchController,
                onChanged: (value) => setState(() => _searchQuery = value),
                style: const TextStyle(color: AppTheme.foreground),
                decoration: const InputDecoration(
                  hintText: 'Search by name or symbol',
                  hintStyle: TextStyle(color: AppTheme.mutedForeground),
                  prefixIcon: Icon(Icons.search, color: AppTheme.mutedForeground),
                  border: InputBorder.none,
                  contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          // Token list
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: filteredTokens.length,
              itemBuilder: (context, index) {
                final token = filteredTokens[index];
                final isSelected = token.symbol == widget.selectedToken.symbol;
                final valueUsd = token.balance * token.price;

                return GestureDetector(
                  onTap: () => widget.onSelect(token),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    margin: const EdgeInsets.only(bottom: 4),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? AppTheme.primary.withOpacity(0.1)
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(12),
                      border: isSelected
                          ? Border.all(color: AppTheme.primary.withOpacity(0.3))
                          : null,
                    ),
                    child: Row(
                      children: [
                        // Token icon
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: token.color.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(20),
                            child: Image.network(
                              token.logoUrl,
                              width: 40,
                              height: 40,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => Center(
                                child: Text(
                                  token.symbol[0],
                                  style: TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                    color: token.color,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        // Token info
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                token.symbol,
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: AppTheme.foreground,
                                ),
                              ),
                              Text(
                                token.name,
                                style: const TextStyle(
                                  fontSize: 14,
                                  color: AppTheme.mutedForeground,
                                ),
                              ),
                            ],
                          ),
                        ),
                        // Balance
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              token.balance.toStringAsFixed(token.balance < 1 ? 6 : 2),
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.foreground,
                              ),
                            ),
                            Text(
                              '\$${valueUsd.toStringAsFixed(2)}',
                              style: const TextStyle(
                                fontSize: 14,
                                color: AppTheme.mutedForeground,
                              ),
                            ),
                          ],
                        ),
                        if (isSelected) ...[
                          const SizedBox(width: 8),
                          const Icon(
                            Icons.check,
                            size: 20,
                            color: AppTheme.primary,
                          ),
                        ],
                      ],
                    ),
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
