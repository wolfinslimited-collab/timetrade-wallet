import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:timetrade_wallet/services/wallet_service.dart';
import 'package:timetrade_wallet/theme/app_theme.dart';
import 'package:timetrade_wallet/screens/onboarding/welcome_screen.dart';

class SettingsTab extends StatelessWidget {
  const SettingsTab({super.key});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.only(bottom: 100),
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Text('Settings', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
          ),
          _section('Security', [
            _tile(Icons.lock_outline, 'Change PIN', () {}),
            _tile(Icons.fingerprint, 'Biometric Authentication', () {}),
            _tile(Icons.key, 'View Seed Phrase', () {}),
            _tile(Icons.vpn_key, 'Manage Private Keys', () {}),
          ]),
          _section('Preferences', [
            _tile(Icons.notifications_none, 'Notifications', () {}),
            _tile(Icons.language, 'Language', () {}),
            _tile(Icons.currency_exchange, 'Default Currency', () {}),
          ]),
          _section('Danger Zone', [
            ListTile(
              leading: const Icon(Icons.delete_forever, color: AppColors.destructive),
              title: const Text('Reset Wallet', style: TextStyle(color: AppColors.destructive)),
              onTap: () => _showResetDialog(context),
            ),
          ]),
          const SizedBox(height: 24),
          Center(
            child: Text('Timetrade Wallet v1.0.0',
              style: TextStyle(fontSize: 12, color: AppColors.mutedForeground.withOpacity(0.5)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _section(String title, List<Widget> children) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
          child: Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.mutedForeground)),
        ),
        Container(
          margin: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(
            color: AppColors.card,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(children: children),
        ),
      ],
    );
  }

  Widget _tile(IconData icon, String title, VoidCallback onTap) {
    return ListTile(
      leading: Icon(icon, size: 20, color: AppColors.foreground),
      title: Text(title, style: const TextStyle(fontSize: 14)),
      trailing: const Icon(Icons.chevron_right, size: 18, color: AppColors.mutedForeground),
      onTap: onTap,
    );
  }

  void _showResetDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.card,
        title: const Text('Reset Wallet'),
        content: const Text('This will permanently delete all wallet data. This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              await context.read<WalletService>().resetWallet();
              if (context.mounted) {
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (_) => const WelcomeScreen()),
                  (_) => false,
                );
              }
            },
            child: const Text('Reset', style: TextStyle(color: AppColors.destructive)),
          ),
        ],
      ),
    );
  }
}
