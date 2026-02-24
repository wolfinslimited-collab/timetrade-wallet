import 'package:flutter/material.dart';
import 'package:timetrade_wallet/theme/app_theme.dart';
import 'package:timetrade_wallet/screens/onboarding/seed_phrase_screen.dart';
import 'package:timetrade_wallet/screens/onboarding/import_wallet_screen.dart';

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            const Spacer(flex: 2),
            // Logo
            Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  width: 112, height: 112,
                  decoration: BoxDecoration(borderRadius: BorderRadius.circular(24)),
                  child: Image.asset('assets/images/app-logo.png', fit: BoxFit.contain,
                    errorBuilder: (_, __, ___) => Icon(Icons.account_balance_wallet, size: 64, color: AppColors.primary),
                  ),
                ),
                Positioned(
                  bottom: -8, right: -8,
                  child: Container(
                    width: 36, height: 36,
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      shape: BoxShape.circle,
                      border: Border.all(color: AppColors.background, width: 2),
                    ),
                    child: const Icon(Icons.shield, size: 18, color: AppColors.primaryForeground),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 40),
            // Title
            Text.rich(
              TextSpan(children: [
                const TextSpan(text: 'Welcome to '),
                TextSpan(text: 'Timetrade', style: TextStyle(color: AppColors.primary)),
              ]),
              style: Theme.of(context).textTheme.headlineMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 48),
              child: Text(
                'Your secure, non-custodial crypto wallet with multi-chain support',
                style: Theme.of(context).textTheme.bodySmall,
                textAlign: TextAlign.center,
              ),
            ),
            const SizedBox(height: 32),
            // Feature pills
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: ['Multi-Chain', 'Self-Custody', 'Secure'].map((f) =>
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.auto_awesome, size: 12, color: AppColors.primary.withOpacity(0.7)),
                      const SizedBox(width: 4),
                      Text(f, style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground)),
                    ],
                  ),
                ),
              ).toList(),
            ),
            const Spacer(flex: 3),
            // Buttons
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                children: [
                  SizedBox(
                    width: double.infinity, height: 56,
                    child: ElevatedButton.icon(
                      onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SeedPhraseScreen())),
                      icon: const Icon(Icons.add, size: 20),
                      label: const Text('Create New Wallet', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: AppColors.primaryForeground,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity, height: 56,
                    child: OutlinedButton.icon(
                      onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ImportWalletScreen())),
                      icon: const Icon(Icons.download, size: 20),
                      label: const Text('Import Existing Wallet', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.foreground,
                        side: const BorderSide(color: AppColors.border),
                        backgroundColor: AppColors.card.withOpacity(0.6),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 40),
            Text(
              'By continuing, you agree to our Terms of Service and Privacy Policy',
              style: TextStyle(fontSize: 10, color: AppColors.mutedForeground.withOpacity(0.4)),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}
