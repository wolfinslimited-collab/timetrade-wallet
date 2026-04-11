import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/home/screens/home_screen.dart';
import '../../features/send/screens/send_screen.dart';
import '../../features/receive/screens/receive_screen.dart';

import '../../features/settings/screens/settings_screen.dart';
import '../../features/onboarding/screens/onboarding_screen.dart';
import '../../features/lock/screens/lock_screen.dart';
import '../../features/history/screens/transaction_history_screen.dart';
import '../../features/staking/screens/staking_screen.dart';
import '../../features/notifications/screens/notifications_screen.dart';
import '../../features/ai/screens/ai_chat_screen.dart';
import '../../features/market/screens/market_screen.dart';
import '../theme/app_theme.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/lock',
    routes: [
      GoRoute(path: '/lock', builder: (_, __) => const LockScreen()),
      GoRoute(path: '/onboarding', builder: (_, __) => const OnboardingScreen()),
      GoRoute(path: '/ai-chat', builder: (_, __) => const AIChatScreen()),
      GoRoute(path: '/notifications', builder: (_, __) => const NotificationsScreen()),
      GoRoute(path: '/market', builder: (_, __) => const MarketScreen()),
      ShellRoute(
        builder: (context, state, child) => MainShell(child: child),
        routes: [
          GoRoute(path: '/', builder: (_, __) => const HomeScreen()),
          GoRoute(path: '/send', builder: (_, __) => const SendScreen()),
          GoRoute(path: '/receive', builder: (_, __) => const ReceiveScreen()),
          
          GoRoute(path: '/history', builder: (_, __) => const TransactionHistoryScreen()),
          GoRoute(path: '/staking', builder: (_, __) => const StakingScreen()),
          GoRoute(path: '/settings', builder: (_, __) => const SettingsScreen()),
        ],
      ),
    ],
  );
});

class MainShell extends StatefulWidget {
  final Widget child;
  const MainShell({super.key, required this.child});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _currentIndex = 0;

  static const _routes = ['/', '/history', '/staking', '/settings'];

  @override
  Widget build(BuildContext context) {
    // Sync index with current location
    final location = GoRouterState.of(context).uri.toString();
    final matchedIndex = _routes.indexWhere((r) => location == r);
    if (matchedIndex >= 0 && matchedIndex != _currentIndex) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) setState(() => _currentIndex = matchedIndex);
      });
    }

    return Scaffold(
      body: widget.child,
      extendBody: true,
      bottomNavigationBar: Container(
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(28),
          color: AppColors.surfaceLight.withOpacity(0.4),
          border: Border.all(color: AppColors.border.withOpacity(0.2)),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.4), blurRadius: 20, offset: const Offset(0, 4))],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(28),
          child: BottomNavigationBar(
            currentIndex: _currentIndex,
            onTap: (index) {
              setState(() => _currentIndex = index);
              context.go(_routes[index]);
            },
            backgroundColor: Colors.transparent,
            elevation: 0,
            type: BottomNavigationBarType.fixed,
            selectedItemColor: AppColors.textPrimary,
            unselectedItemColor: AppColors.textPrimary.withOpacity(0.4),
            showSelectedLabels: false,
            showUnselectedLabels: false,
            items: const [
              BottomNavigationBarItem(icon: Icon(Icons.account_balance_wallet, size: 27), label: 'Wallet'),
              BottomNavigationBarItem(icon: Icon(Icons.receipt_long, size: 27), label: 'History'),
              BottomNavigationBarItem(icon: Icon(Icons.savings, size: 27), label: 'Staking'),
              BottomNavigationBarItem(icon: Icon(Icons.settings, size: 27), label: 'Settings'),
            ],
          ),
        ),
      ),
    );
  }
}
