import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class WelcomeStep extends StatelessWidget {
  final VoidCallback onCreateWallet;
  final VoidCallback onImportWallet;

  const WelcomeStep({super.key, required this.onCreateWallet, required this.onImportWallet});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Column(
          children: [
            const Spacer(flex: 2),

            // Logo placeholder
            Container(
              width: 96, height: 96,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(24),
                color: AppColors.surfaceLight,
              ),
              child: const Icon(Icons.account_balance_wallet, size: 48, color: AppColors.primary),
            ),
            const SizedBox(height: 48),

            // Title
            RichText(
              textAlign: TextAlign.center,
              text: const TextSpan(
                style: TextStyle(fontSize: 32, fontWeight: FontWeight.w700, color: AppColors.textPrimary, height: 1.2),
                children: [
                  TextSpan(text: 'Welcome to '),
                  TextSpan(text: 'Timetrade Wallet', style: TextStyle(color: AppColors.primary)),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Your gateway to multi-chain crypto, secured by you.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 15, color: AppColors.textMuted.withOpacity(0.7)),
            ),
            const SizedBox(height: 32),

            // Feature pills
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _FeaturePill(icon: Icons.public, label: 'Multi-Chain'),
                const SizedBox(width: 8),
                _FeaturePill(icon: Icons.lock_outline, label: 'Self-Custody'),
                const SizedBox(width: 8),
                _FeaturePill(icon: Icons.fingerprint, label: 'Biometric'),
              ],
            ),

            const Spacer(flex: 3),

            // Create Wallet CTA
            GestureDetector(
              onTap: onCreateWallet,
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.textPrimary,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 44, height: 44,
                      decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.black.withOpacity(0.15)),
                      child: const Icon(Icons.account_balance_wallet, size: 20, color: Color(0xFF0A0A0F)),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Create New Wallet', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.background)),
                          Text('Generate a fresh seed phrase', style: TextStyle(fontSize: 12, color: AppColors.background.withOpacity(0.5))),
                        ],
                      ),
                    ),
                    Icon(Icons.arrow_forward, size: 20, color: AppColors.background.withOpacity(0.4)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Import Wallet CTA
            GestureDetector(
              onTap: onImportWallet,
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.surfaceLight.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border.withOpacity(0.4)),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 44, height: 44,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: AppColors.card.withOpacity(0.6),
                        border: Border.all(color: AppColors.border.withOpacity(0.3)),
                      ),
                      child: Icon(Icons.download, size: 20, color: AppColors.textPrimary.withOpacity(0.7)),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Import Existing Wallet', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.textPrimary.withOpacity(0.9))),
                          Text('Use seed phrase or private key', style: TextStyle(fontSize: 12, color: AppColors.textMuted.withOpacity(0.5))),
                        ],
                      ),
                    ),
                    Icon(Icons.arrow_forward, size: 20, color: AppColors.textMuted.withOpacity(0.3)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            Text(
              'By continuing, you agree to our Terms of Service and Privacy Policy',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 10, color: AppColors.textMuted.withOpacity(0.3)),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}

class _FeaturePill extends StatelessWidget {
  final IconData icon;
  final String label;
  const _FeaturePill({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border.withOpacity(0.4)),
        color: AppColors.card.withOpacity(0.3),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: AppColors.textMuted.withOpacity(0.6)),
          const SizedBox(width: 4),
          Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: AppColors.textMuted.withOpacity(0.8))),
        ],
      ),
    );
  }
}
