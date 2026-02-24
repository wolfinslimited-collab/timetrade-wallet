import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:timetrade_wallet/services/wallet_service.dart';
import 'package:timetrade_wallet/screens/onboarding/welcome_screen.dart';
import 'package:timetrade_wallet/screens/lock_screen.dart';
import 'package:timetrade_wallet/screens/home_screen.dart';
import 'package:timetrade_wallet/theme/app_theme.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    Future.delayed(const Duration(milliseconds: 800), _navigate);
  }

  void _navigate() {
    if (!mounted) return;
    final wallet = context.read<WalletService>();
    Widget destination;
    if (!wallet.hasWallet) {
      destination = const WelcomeScreen();
    } else if (wallet.isLocked) {
      destination = const LockScreen();
    } else {
      destination = const HomeScreen();
    }
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => destination),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Image.asset('assets/images/app-logo.png', width: 80, height: 80,
              errorBuilder: (_, __, ___) => Icon(Icons.account_balance_wallet, size: 80, color: AppColors.primary),
            ),
            const SizedBox(height: 16),
            const CircularProgressIndicator(strokeWidth: 2),
          ],
        ),
      ),
    );
  }
}
