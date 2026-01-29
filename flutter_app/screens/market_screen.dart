import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../widgets/sparkline.dart';

class MarketToken {
  final String id;
  final String symbol;
  final String name;
  final double price;
  final double change24h;
  final double marketCap;
  final double volume24h;
  final List<double> sparklineData;

  MarketToken({
    required this.id,
    required this.symbol,
    required this.name,
    required this.price,
    required this.change24h,
    required this.marketCap,
    required this.volume24h,
    required this.sparklineData,
  });
}

class MarketScreen extends StatefulWidget {
  final VoidCallback onBack;

  const MarketScreen({
    super.key,
    required this.onBack,
  });

  @override
  State<MarketScreen> createState() => _MarketScreenState();
}

class _MarketScreenState extends State<MarketScreen> {
  String _searchQuery = '';
  String _activeFilter = 'all';
  Set<String> _favorites = {};
  MarketToken? _selectedToken;

  final List<MarketToken> _tokens = [
    MarketToken(
      id: 'bitcoin',
      symbol: 'BTC',
      name: 'Bitcoin',
      price: 67234.52,
      change24h: 2.34,
      marketCap: 1320000000000,
      volume24h: 28500000000,
      sparklineData: [45, 52, 48, 61, 55, 67, 62, 70, 65, 72, 68, 75],
    ),
    MarketToken(
      id: 'ethereum',
      symbol: 'ETH',
      name: 'Ethereum',
      price: 3456.78,
      change24h: -1.23,
      marketCap: 415000000000,
      volume24h: 15200000000,
      sparklineData: [60, 55, 58, 52, 48, 45, 50, 47, 52, 48, 45, 42],
    ),
    MarketToken(
      id: 'solana',
      symbol: 'SOL',
      name: 'Solana',
      price: 178.45,
      change24h: 5.67,
      marketCap: 82000000000,
      volume24h: 3400000000,
      sparklineData: [30, 35, 42, 48, 55, 62, 58, 65, 72, 78, 82, 88],
    ),
    MarketToken(
      id: 'tether',
      symbol: 'USDT',
      name: 'Tether',
      price: 1.0,
      change24h: 0.01,
      marketCap: 120000000000,
      volume24h: 65000000000,
      sparklineData: [50, 50, 51, 50, 50, 49, 50, 50, 51, 50, 50, 50],
    ),
    MarketToken(
      id: 'bnb',
      symbol: 'BNB',
      name: 'BNB',
      price: 612.34,
      change24h: 1.89,
      marketCap: 89000000000,
      volume24h: 1800000000,
      sparklineData: [40, 45, 48, 52, 55, 58, 54, 60, 63, 58, 62, 65],
    ),
    MarketToken(
      id: 'xrp',
      symbol: 'XRP',
      name: 'XRP',
      price: 0.5234,
      change24h: -2.45,
      marketCap: 29000000000,
      volume24h: 1200000000,
      sparklineData: [55, 52, 48, 45, 50, 46, 42, 45, 40, 38, 42, 40],
    ),
    MarketToken(
      id: 'cardano',
      symbol: 'ADA',
      name: 'Cardano',
      price: 0.4567,
      change24h: 3.21,
      marketCap: 16000000000,
      volume24h: 450000000,
      sparklineData: [35, 38, 42, 45, 50, 55, 52, 58, 62, 65, 60, 68],
    ),
    MarketToken(
      id: 'dogecoin',
      symbol: 'DOGE',
      name: 'Dogecoin',
      price: 0.1234,
      change24h: -0.87,
      marketCap: 18000000000,
      volume24h: 890000000,
      sparklineData: [50, 48, 52, 49, 47, 50, 48, 45, 48, 46, 44, 47],
    ),
    MarketToken(
      id: 'tron',
      symbol: 'TRX',
      name: 'Tron',
      price: 0.1156,
      change24h: 1.45,
      marketCap: 10200000000,
      volume24h: 380000000,
      sparklineData: [42, 45, 48, 52, 50, 55, 53, 58, 56, 60, 58, 62],
    ),
    MarketToken(
      id: 'polygon',
      symbol: 'POL',
      name: 'Polygon',
      price: 0.5678,
      change24h: 4.12,
      marketCap: 5600000000,
      volume24h: 320000000,
      sparklineData: [38, 42, 46, 50, 55, 60, 58, 65, 62, 70, 68, 75],
    ),
  ];

  @override
  void initState() {
    super.initState();
    _favorites = {'bitcoin', 'ethereum'};
  }

  List<MarketToken> get _filteredTokens {
    var tokens = _tokens.where((token) {
      if (_searchQuery.isNotEmpty) {
        final query = _searchQuery.toLowerCase();
        if (!token.name.toLowerCase().contains(query) &&
            !token.symbol.toLowerCase().contains(query)) {
          return false;
        }
      }
      return true;
    }).toList();

    switch (_activeFilter) {
      case 'favorites':
        tokens = tokens.where((t) => _favorites.contains(t.id)).toList();
        break;
      case 'gainers':
        tokens = tokens.where((t) => t.change24h > 0).toList();
        tokens.sort((a, b) => b.change24h.compareTo(a.change24h));
        break;
      case 'losers':
        tokens = tokens.where((t) => t.change24h < 0).toList();
        tokens.sort((a, b) => a.change24h.compareTo(b.change24h));
        break;
    }

    return tokens;
  }

  String _formatPrice(double price) {
    if (price >= 1000) {
      return '\$${price.toStringAsFixed(2).replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}';
    } else if (price >= 1) {
      return '\$${price.toStringAsFixed(2)}';
    } else {
      return '\$${price.toStringAsFixed(4)}';
    }
  }

  String _formatMarketCap(double cap) {
    if (cap >= 1e12) return '\$${(cap / 1e12).toStringAsFixed(2)}T';
    if (cap >= 1e9) return '\$${(cap / 1e9).toStringAsFixed(2)}B';
    if (cap >= 1e6) return '\$${(cap / 1e6).toStringAsFixed(2)}M';
    return '\$${cap.toStringAsFixed(0)}';
  }

  String _getCryptoLogoUrl(String symbol) {
    return 'https://api.elbstream.com/logos/crypto/${symbol.toLowerCase()}';
  }

  void _toggleFavorite(String tokenId) {
    setState(() {
      if (_favorites.contains(tokenId)) {
        _favorites.remove(tokenId);
      } else {
        _favorites.add(tokenId);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(color: AppTheme.border, width: 1),
                ),
              ),
              child: Row(
                children: [
                  GestureDetector(
                    onTap: widget.onBack,
                    child: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: AppTheme.card,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppTheme.border),
                      ),
                      child: const Icon(
                        Icons.arrow_back,
                        color: AppTheme.foreground,
                        size: 20,
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Market',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.foreground,
                          ),
                        ),
                        Text(
                          'Live crypto prices',
                          style: TextStyle(
                            fontSize: 12,
                            color: AppTheme.mutedForeground,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: AppTheme.card,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppTheme.border),
                    ),
                    child: const Icon(
                      Icons.notifications_outlined,
                      color: AppTheme.foreground,
                      size: 20,
                    ),
                  ),
                ],
              ),
            ),

            // Search
            Padding(
              padding: const EdgeInsets.all(16),
              child: Container(
                height: 48,
                decoration: BoxDecoration(
                  color: AppTheme.card,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.border),
                ),
                child: TextField(
                  onChanged: (value) => setState(() => _searchQuery = value),
                  style: const TextStyle(color: AppTheme.foreground),
                  decoration: InputDecoration(
                    hintText: 'Search tokens...',
                    hintStyle: TextStyle(color: AppTheme.mutedForeground),
                    prefixIcon: Icon(Icons.search, color: AppTheme.mutedForeground, size: 20),
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  ),
                ),
              ),
            ),

            // Filter Tabs
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Container(
                height: 44,
                decoration: BoxDecoration(
                  color: AppTheme.card,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppTheme.border),
                ),
                child: Row(
                  children: [
                    _buildFilterTab('all', 'All', null),
                    _buildFilterTab('favorites', 'Favorites', Icons.star),
                    _buildFilterTab('gainers', 'Gainers', Icons.trending_up),
                    _buildFilterTab('losers', 'Losers', Icons.trending_down),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 16),

            // Token List
            Expanded(
              child: _filteredTokens.isEmpty
                  ? Center(
                      child: Text(
                        'No tokens found',
                        style: TextStyle(color: AppTheme.mutedForeground),
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: _filteredTokens.length,
                      itemBuilder: (context, index) {
                        final token = _filteredTokens[index];
                        return _buildTokenCard(token);
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterTab(String filter, String label, IconData? icon) {
    final isActive = _activeFilter == filter;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _activeFilter = filter),
        child: Container(
          decoration: BoxDecoration(
            color: isActive ? AppTheme.primary.withOpacity(0.1) : Colors.transparent,
            borderRadius: BorderRadius.circular(6),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (icon != null) ...[
                Icon(
                  icon,
                  size: 12,
                  color: isActive ? AppTheme.primary : AppTheme.mutedForeground,
                ),
                const SizedBox(width: 4),
              ],
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
                  color: isActive ? AppTheme.primary : AppTheme.mutedForeground,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTokenCard(MarketToken token) {
    final isPositive = token.change24h >= 0;
    
    return GestureDetector(
      onTap: () => _showTokenDetail(token),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.card,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.border),
        ),
        child: Column(
          children: [
            Row(
              children: [
                // Token Icon
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(24),
                    child: Image.network(
                      _getCryptoLogoUrl(token.symbol),
                      width: 48,
                      height: 48,
                      fit: BoxFit.contain,
                      errorBuilder: (_, __, ___) => Center(
                        child: Text(
                          token.symbol[0],
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.primary,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),

                // Token Info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            token.symbol,
                            style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              color: AppTheme.foreground,
                            ),
                          ),
                          const SizedBox(width: 8),
                          GestureDetector(
                            onTap: () => _toggleFavorite(token.id),
                            child: Icon(
                              Icons.star,
                              size: 16,
                              color: _favorites.contains(token.id)
                                  ? Colors.amber
                                  : AppTheme.mutedForeground,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        token.name,
                        style: TextStyle(
                          fontSize: 12,
                          color: AppTheme.mutedForeground,
                        ),
                      ),
                    ],
                  ),
                ),

                // Sparkline
                SizedBox(
                  width: 64,
                  height: 32,
                  child: SparklineWidget(
                    data: token.sparklineData,
                    isPositive: isPositive,
                  ),
                ),

                const SizedBox(width: 12),

                // Price & Change
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      _formatPrice(token.price),
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.foreground,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          isPositive ? Icons.trending_up : Icons.trending_down,
                          size: 12,
                          color: isPositive ? AppTheme.success : AppTheme.destructive,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '${token.change24h.abs().toStringAsFixed(2)}%',
                          style: TextStyle(
                            fontSize: 12,
                            color: isPositive ? AppTheme.success : AppTheme.destructive,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),

            // Market Cap Row
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.only(top: 12),
              decoration: BoxDecoration(
                border: Border(
                  top: BorderSide(color: AppTheme.border.withOpacity(0.5)),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Market Cap: ${_formatMarketCap(token.marketCap)}',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppTheme.mutedForeground,
                    ),
                  ),
                  Text(
                    'Vol: ${_formatMarketCap(token.volume24h)}',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppTheme.mutedForeground,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showTokenDetail(MarketToken token) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => TokenDetailSheet(token: token),
    );
  }
}

class TokenDetailSheet extends StatelessWidget {
  final MarketToken token;

  const TokenDetailSheet({super.key, required this.token});

  @override
  Widget build(BuildContext context) {
    final isPositive = token.change24h >= 0;
    
    return Container(
      height: MediaQuery.of(context).size.height * 0.75,
      decoration: const BoxDecoration(
        color: AppTheme.background,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Handle
          Container(
            width: 40,
            height: 4,
            margin: const EdgeInsets.only(top: 12),
            decoration: BoxDecoration(
              color: AppTheme.border,
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                // Token Header
                Row(
                  children: [
                    Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        color: AppTheme.primary.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(28),
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(28),
                        child: Image.network(
                          'https://api.elbstream.com/logos/crypto/${token.symbol.toLowerCase()}',
                          fit: BoxFit.contain,
                          errorBuilder: (_, __, ___) => Center(
                            child: Text(
                              token.symbol[0],
                              style: const TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.primary,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            token.name,
                            style: const TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.foreground,
                            ),
                          ),
                          Text(
                            token.symbol,
                            style: TextStyle(
                              fontSize: 16,
                              color: AppTheme.mutedForeground,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Icon(
                      Icons.star_border,
                      color: AppTheme.mutedForeground,
                    ),
                  ],
                ),

                const SizedBox(height: 24),

                // Price
                Text(
                  '\$${token.price.toStringAsFixed(token.price >= 1 ? 2 : 4)}',
                  style: const TextStyle(
                    fontSize: 40,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.foreground,
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: isPositive 
                        ? AppTheme.success.withOpacity(0.1) 
                        : AppTheme.destructive.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        isPositive ? Icons.trending_up : Icons.trending_down,
                        size: 16,
                        color: isPositive ? AppTheme.success : AppTheme.destructive,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '${isPositive ? '+' : ''}${token.change24h.toStringAsFixed(2)}%',
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: isPositive ? AppTheme.success : AppTheme.destructive,
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 32),

                // Stats Grid
                Row(
                  children: [
                    Expanded(
                      child: _buildStatCard('Market Cap', '\$${(token.marketCap / 1e9).toStringAsFixed(2)}B'),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildStatCard('24h Volume', '\$${(token.volume24h / 1e9).toStringAsFixed(2)}B'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(String label, String value) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: AppTheme.mutedForeground,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppTheme.foreground,
            ),
          ),
        ],
      ),
    );
  }
}
