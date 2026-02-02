import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../screens/receive/receive_crypto_screen.dart';
import '../screens/send/send_crypto_screen.dart';
import '../screens/swap/swap_crypto_screen.dart';

class QuickActionsWidget extends StatelessWidget {
  const QuickActionsWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _buildActionButton(
            context,
            icon: Icons.qr_code_rounded,
            label: 'Receive',
            onTap: () {
              showModalBottomSheet(
                context: context,
                backgroundColor: Colors.transparent,
                isScrollControlled: true,
                builder: (_) => ReceiveCryptoSheet(
                  onClose: () => Navigator.pop(context),
                ),
              );
            },
          ),
          _buildActionButton(
            context,
            icon: Icons.send_rounded,
            img: 'assets/icons/send.png',
            label: 'Send',
            onTap: () {
              showModalBottomSheet(
                context: context,
                backgroundColor: Colors.transparent,
                isScrollControlled: true,
                builder: (_) => SendCryptoSheet(
                  onClose: () => Navigator.pop(context),
                ),
              );
            },
          ),
          _buildActionButton(
            context,
            icon: Icons.swap_horiz_rounded,
            label: 'Swap',
            onTap: () {
              showModalBottomSheet(
                context: context,
                backgroundColor: Colors.transparent,
                isScrollControlled: true,
                builder: (_) => SwapCryptoSheet(
                  onClose: () => Navigator.pop(context),
                ),
              );
            },
          ),
          _buildActionButton(
            context,
            icon: Icons.attach_money_rounded,
            label: 'Buy',
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Buy crypto - Coming soon'),
                  backgroundColor: AppTheme.card,
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildActionButton(
    BuildContext context, {
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    final String? img,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: AppTheme.card,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppTheme.border),
            ),
            child: img == null ? Icon(
              icon,
              color: AppTheme.foreground,
              size: 24,
            ) : Padding(
              padding: const EdgeInsets.all(12),
              child: Image.asset(img, width: 30),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              color: AppTheme.mutedForeground,
            ),
          ),
        ],
      ),
    );
  }
}
