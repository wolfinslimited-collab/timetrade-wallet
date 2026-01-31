import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../models/token.dart';
import '../models/notification_item.dart';
import '../services/wallet_service.dart';
import '../services/blockchain_service.dart';
import '../widgets/quick_actions.dart';
import '../widgets/token_list.dart';
import '../widgets/bottom_nav.dart';
import '../widgets/notification_center.dart';
import '../widgets/account_switcher_sheet.dart';
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

  // Notifications state (matching web version)
  List<NotificationItem> _notifications = [];
  
  int get _unreadCount => _notifications.where((n) => !n.isRead).length;

  final BlockchainService _blockchainService = BlockchainService();

  @override
  void initState() {
    super.initState();
    _loadBalances();
    _loadNotifications();
  }

  void _loadNotifications() {
    // Generate demo notifications matching the web version
    final now = DateTime.now();
    _notifications = [
      NotificationItem(
        id: '1',
        type: NotificationType.priceAlert,
        title: 'BTC Price Alert',
        message: 'Bitcoin just crossed \$45,000! Up 5.2% in the last hour.',
        createdAt: now.subtract(const Duration(minutes: 5)),
        isRead: false,
      ),
      NotificationItem(
        id: '2',
        type: NotificationType.transaction,
        title: 'Transaction Confirmed',
        message: 'Your transfer of 0.5 ETH has been confirmed on the network.',
        createdAt: now.subtract(const Duration(minutes: 30)),
        isRead: false,
      ),
      NotificationItem(
        id: '3',
        type: NotificationType.security,
        title: 'New Login Detected',
        message: "A new device logged into your wallet. If this wasn't you, please secure your account.",
        createdAt: now.subtract(const Duration(hours: 2)),
        isRead: true,
      ),
      NotificationItem(
        id: '4',
        type: NotificationType.priceAlert,
        title: 'ETH Below Target',
        message: 'Ethereum dropped below your \$2,400 price alert target.',
        createdAt: now.subtract(const Duration(hours: 5)),
        isRead: true,
      ),
      NotificationItem(
        id: '5',
        type: NotificationType.transaction,
        title: 'Swap Completed',
        message: 'Successfully swapped 100 USDT for 0.042 ETH.',
        createdAt: now.subtract(const Duration(days: 1)),
        isRead: true,
      ),
      NotificationItem(
        id: '6',
        type: NotificationType.security,
        title: 'Backup Reminder',
        message: "It's been 30 days since you last verified your seed phrase backup.",
        createdAt: now.subtract(const Duration(days: 2)),
        isRead: true,
      ),
    ];
  }

  void _markAsRead(String id) {
    setState(() {
      final index = _notifications.indexWhere((n) => n.id == id);
      if (index != -1) {
        _notifications[index] = _notifications[index].copyWith(isRead: true);
      }
    });
  }

  void _markAllAsRead() {
    setState(() {
      _notifications = _notifications.map((n) => n.copyWith(isRead: true)).toList();
    });
  }

  void _deleteNotification(String id) {
    setState(() {
      _notifications.removeWhere((n) => n.id == id);
    });
  }

  void _clearAllNotifications() {
    setState(() {
      _notifications.clear();
    });
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
          // Header - matches web WalletHeader layout
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  // Avatar with online indicator
                  Stack(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: AppTheme.border),
                          gradient: const LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
                          ),
                        ),
                        child: Center(
                          child: Text(
                            (walletAccount?.name ?? 'W')[0].toUpperCase(),
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white),
                          ),
                        ),
                      ),
                      Positioned(
                        bottom: 0,
                        right: 0,
                        child: Container(
                          width: 12,
                          height: 12,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: AppTheme.primary,
                            border: Border.all(color: AppTheme.background, width: 2),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(width: 12),
                  // Wallet name and status
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          (walletAccount?.name ?? 'WALLET').toUpperCase(),
                          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w500, letterSpacing: 1, color: AppTheme.mutedForeground),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppTheme.secondary,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: AppTheme.border),
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.shield_outlined, size: 10, color: AppTheme.primary),
                                  SizedBox(width: 4),
                                  Text('PROTECTED', style: TextStyle(fontSize: 8, fontWeight: FontWeight.w600, letterSpacing: 0.5, color: AppTheme.primary)),
                                ],
                              ),
                            ),
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppTheme.secondary.withValues(alpha: 0.5),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Container(
                                    width: 6,
                                    height: 6,
                                    decoration: const BoxDecoration(shape: BoxShape.circle, color: AppTheme.success),
                                  ),
                                  const SizedBox(width: 4),
                                  const Text('LIVE', style: TextStyle(fontSize: 8, fontWeight: FontWeight.w500, letterSpacing: 0.5, color: AppTheme.mutedForeground)),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  // Action buttons (matching web: Account Switcher, Notifications, Settings)
                  Row(
                    children: [
                      // Account Switcher Button
                      GestureDetector(
                        onTap: () => showAccountSwitcherSheet(
                          context,
                          onAccountSwitched: () => _loadBalances(),
                        ),
                        child: Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: AppTheme.card,
                            border: Border.all(color: AppTheme.border),
                          ),
                          child: Stack(
                            children: [
                              const Center(
                                child: Icon(Icons.layers_outlined, size: 18, color: AppTheme.mutedForeground),
                              ),
                              if (context.watch<WalletService>().accounts.length > 0)
                                Positioned(
                                  top: 0,
                                  right: 0,
                                  child: Container(
                                    width: 14,
                                    height: 14,
                                    decoration: const BoxDecoration(
                                      color: AppTheme.primary,
                                      shape: BoxShape.circle,
                                    ),
                                    child: Center(
                                      child: Text(
                                        '${context.watch<WalletService>().accounts.indexOf(context.watch<WalletService>().activeAccount ?? context.watch<WalletService>().accounts.first) + 1}',
                                        style: const TextStyle(
                                          fontSize: 8,
                                          fontWeight: FontWeight.bold,
                                          color: AppTheme.primaryForeground,
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      // Notifications Button
                      NotificationCenter(
                        notifications: _notifications,
                        unreadCount: _unreadCount,
                        onMarkAsRead: _markAsRead,
                        onMarkAllAsRead: _markAllAsRead,
                        onDelete: _deleteNotification,
                        onClearAll: _clearAllNotifications,
                      ),
                      const SizedBox(width: 8),
                      // Settings Button
                      GestureDetector(
                        onTap: () {
                          HapticFeedback.lightImpact();
                          setState(() => _currentNavIndex = 3);
                        },
                        child: Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: AppTheme.card,
                            border: Border.all(color: AppTheme.border),
                          ),
                          child: const Icon(Icons.settings_outlined, size: 18, color: AppTheme.mutedForeground),
                        ),
                      ),
                    ],
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
