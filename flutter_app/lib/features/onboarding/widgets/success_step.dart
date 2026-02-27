import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class SuccessStep extends StatelessWidget {
  final String walletName;
  final VoidCallback onFinish;
  const SuccessStep({super.key, required this.walletName, required this.onFinish});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const Spacer(flex: 2),

            // Checkmark
            Stack(
              alignment: Alignment.center,
              children: [
                Container(
                  width: 96, height: 96,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppColors.primary.withOpacity(0.2),
                    boxShadow: [BoxShadow(color: AppColors.primary.withOpacity(0.2), blurRadius: 40, spreadRadius: 10)],
                  ),
                ),
                Container(
                  width: 64, height: 64,
                  decoration: const BoxDecoration(shape: BoxShape.circle, color: AppColors.primary),
                  child: const Icon(Icons.check, size: 32, color: Colors.white),
                ),
                Positioned(
                  left: -16, top: 0,
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(borderRadius: BorderRadius.circular(8), color: AppColors.card, border: Border.all(color: AppColors.border)),
                    child: const Icon(Icons.shield, size: 16, color: AppColors.primary),
                  ),
                ),
                Positioned(
                  right: -16, top: 0,
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(borderRadius: BorderRadius.circular(8), color: AppColors.card, border: Border.all(color: AppColors.border)),
                    child: const Icon(Icons.account_balance_wallet, size: 16, color: AppColors.accent),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 32),

            const Text('Wallet Created!', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Text.rich(
              TextSpan(
                style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
                children: [
                  const TextSpan(text: 'Your wallet "'),
                  TextSpan(text: walletName, style: const TextStyle(fontWeight: FontWeight.w500, color: AppColors.textPrimary)),
                  const TextSpan(text: '" is ready to use'),
                ],
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),

            // Feature list
            ...[
              _FeatureRow(icon: Icons.shield, text: 'Insurance protection active'),
              const SizedBox(height: 12),
              _FeatureRow(icon: Icons.account_balance_wallet, text: 'Non-custodial & secure'),
            ],

            const Spacer(flex: 3),

            SizedBox(
              width: double.infinity, height: 56,
              child: ElevatedButton.icon(
                onPressed: onFinish,
                icon: const Text('Go to Wallet'),
                label: const Icon(Icons.arrow_forward, size: 20),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}

class _FeatureRow extends StatelessWidget {
  final IconData icon;
  final String text;
  const _FeatureRow({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(8), color: AppColors.primary.withOpacity(0.1)),
            child: Icon(icon, size: 16, color: AppColors.primary),
          ),
          const SizedBox(width: 12),
          Text(text, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
          const Spacer(),
          const Icon(Icons.check, size: 16, color: AppColors.primary),
        ],
      ),
    );
  }
}
