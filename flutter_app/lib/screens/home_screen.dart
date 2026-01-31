import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../models/token.dart';
import '../services/wallet_service.dart';
import '../services/blockchain_service.dart';
import '../widgets/quick_actions.dart';
import '../widgets/token_list.dart';
import '../widgets/bottom_nav.dart';
import 'history_screen.dart';
import 'staking_screen.dart';
import 'settings_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentNavIndex = 0;
  bool _isLoading = true;
  List<Token> _tokens = [];
  double _totalBalance = 0.0;
  double _change24h = 0.0;

  final BlockchainService _blockchainService = BlockchainService();

  @override
  void initState() {
    super.initState();
    _loadBalances();
  }

  Future<void> _loadBalances() async {
    setState(() => _isLoading = true);

    try {
      final walletService = context.read<WalletService>();
      debugPrint('[HOME] Fetching balances for evm=${walletService.evmAddress}, sol=${walletService.solanaAddress}, tron=${walletService.tronAddress}');

      final tokens = await _blockchainService.fetchAllBalances(
        evmAddress: walletService.evmAddress,
        solanaAddress: walletService.solanaAddress,
        tronAddress: walletService.tronAddress,
      );

      double total = 0;
      double weightedChange = 0;

      for (final token in tokens) {
        total += token.usdValue;
        weightedChange += token.usdValue * token.change24h;
      }

      debugPrint('[HOME] Loaded ${tokens.length} tokens, total=\$${total.toStringAsFixed(2)}');

      setState(() {
        _tokens = tokens;
        _totalBalance = total;
        _change24h = total > 0 ? weightedChange / total : 0;
        _isLoading = false;
      });
    } catch (e) {
      debugPrint('[HOME] Error loading balances: $e');
      setState(() => _isLoading = false);
    }
  }

  Future<void> _handleRefresh() async {
    HapticFeedback.mediumImpact();
    await _loadBalances();
  }

  String _formatBalance(double value) {
    return '\$${value.toStringAsFixed(2).replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (m) => '${m[1]},',
    )}';
  }

  @override
  Widget build(BuildContext context) {
    final walletService = context.watch<WalletService>();
    final activeAccount = walletService.activeAccount;

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: IndexedStack(
          index: _currentNavIndex,
          children: [
            _buildWalletTab(activeAccount),
            HistoryScreen(onBack: () => setState(() => _currentNavIndex = 0)),
            StakingScreen(onBack: () => setState(() => _currentNavIndex = 0)),
            SettingsScreen(onBack: () => setState(() => _currentNavIndex = 0)),
          ],
        ),
      ),
      bottomNavigationBar: BottomNavBar(
        currentIndex: _currentNavIndex,
        onTap: (index) => setState(() => _currentNavIndex = index),
      ),
    );
  }

  Widget _buildWalletTab(walletAccount) {
    final isPositive = _change24h >= 0;
    final dollarChange = _totalBalance * (_change24h / 100);

    return RefreshIndicator(
      onRefresh: _handleRefresh,
      color: AppTheme.primary,
      backgroundColor: AppTheme.card,
      child: CustomScrollView(
        slivers: [
          // Header
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppTheme.card,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppTheme.border),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 6,
                          height: 6,
                          decoration: const BoxDecoration(shape: BoxShape.circle, color: AppTheme.success),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          walletAccount?.name.toUpperCase() ?? 'MAIN WALLET',
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, letterSpacing: 0.5, color: AppTheme.foreground),
                        ),
                      ],
                    ),
                  ),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppTheme.card,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppTheme.border),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.shield, size: 12, color: AppTheme.mutedForeground),
                        SizedBox(width: 4),
                        Text('Protected', style: TextStyle(fontSize: 10, color: AppTheme.mutedForeground)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Balance display (matches web)
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: Column(
                children: [
                  if (_isLoading)
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: const [
                        SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.mutedForeground)),
                        SizedBox(width: 12),
                        Text('Syncing wallet…', style: TextStyle(color: AppTheme.mutedForeground)),
                      ],
                    )
                  else ...[
                    Text(
                      _formatBalance(_totalBalance),
                      style: const TextStyle(fontSize: 48, fontWeight: FontWeight.bold, letterSpacing: -1, color: AppTheme.foreground),
                    ),
                    if (_totalBalance > 0) ...[
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            '${isPositive ? '+' : ''}\$${dollarChange.abs().toStringAsFixed(2)}',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: isPositive ? AppTheme.primary : AppTheme.destructive),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            '${isPositive ? '+' : ''}${_change24h.toStringAsFixed(2)}%',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: isPositive ? AppTheme.primary : AppTheme.destructive),
                          ),
                        ],
                      ),
                    ],
                  ],
                ],
              ),
            ),
          ),

          // Quick actions
          const SliverToBoxAdapter(child: QuickActionsWidget()),

          // Token list
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.only(top: 24),
              child: TokenListWidget(tokens: _tokens, isLoading: _isLoading),
            ),
          ),

          // Bottom padding for nav bar
          const SliverToBoxAdapter(child: SizedBox(height: 100)),
        ],
      ),
    );
  }
}
