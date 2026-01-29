import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

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
            icon: Icons.arrow_downward_rounded,
            label: 'Receive',
            onTap: () {
              // Open receive sheet
              showModalBottomSheet(
                context: context,
                backgroundColor: AppTheme.background,
                isScrollControlled: true,
                shape: const RoundedRectangleBorder(
                  borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                ),
                builder: (_) => const _ReceiveSheet(),
              );
            },
          ),
          _buildActionButton(
            context,
            icon: Icons.arrow_upward_rounded,
            label: 'Send',
            onTap: () {
              // Open send flow
              showModalBottomSheet(
                context: context,
                backgroundColor: AppTheme.background,
                isScrollControlled: true,
                shape: const RoundedRectangleBorder(
                  borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                ),
                builder: (_) => const _SendSheet(),
              );
            },
          ),
          _buildActionButton(
            context,
            icon: Icons.swap_horiz_rounded,
            label: 'Swap',
            onTap: () {
              // Open swap sheet
              showModalBottomSheet(
                context: context,
                backgroundColor: AppTheme.background,
                isScrollControlled: true,
                shape: const RoundedRectangleBorder(
                  borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                ),
                builder: (_) => const _SwapSheet(),
              );
            },
          ),
          _buildActionButton(
            context,
            icon: Icons.shopping_cart_rounded,
            label: 'Buy',
            onTap: () {
              // Open buy flow
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
            child: Icon(
              icon,
              color: AppTheme.foreground,
              size: 24,
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

// Placeholder sheets - implement fully
class _ReceiveSheet extends StatelessWidget {
  const _ReceiveSheet();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppTheme.border,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 24),
          const Text(
            'Receive Crypto',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: AppTheme.foreground,
            ),
          ),
          const Spacer(),
          const Text(
            'Implement QR code display and address copy\n(Based on ReceiveCryptoSheet.tsx)',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppTheme.mutedForeground),
          ),
          const Spacer(),
        ],
      ),
    );
  }
}

class _SendSheet extends StatelessWidget {
  const _SendSheet();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.9,
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppTheme.border,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 24),
          const Text(
            'Send Crypto',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: AppTheme.foreground,
            ),
          ),
          const Spacer(),
          const Text(
            'Implement multi-step send flow\n(Based on SendCryptoSheet.tsx)',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppTheme.mutedForeground),
          ),
          const Spacer(),
        ],
      ),
    );
  }
}

class _SwapSheet extends StatelessWidget {
  const _SwapSheet();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.9,
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppTheme.border,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 24),
          const Text(
            'Swap Tokens',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: AppTheme.foreground,
            ),
          ),
          const Spacer(),
          const Text(
            'Implement token swap interface\n(Based on SwapCryptoSheet.tsx)',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppTheme.mutedForeground),
          ),
          const Spacer(),
        ],
      ),
    );
  }
}
