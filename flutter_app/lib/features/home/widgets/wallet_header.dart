import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';

class WalletHeader extends StatelessWidget {
  const WalletHeader({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // AI button
          GestureDetector(
            onTap: () {}, // TODO: Navigate to AI chat
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.card,
                border: Border.all(color: AppColors.border),
              ),
              child: const Icon(Icons.auto_awesome, size: 20, color: AppColors.textPrimary),
            ),
          ),

          // Wallet name pill
          GestureDetector(
            onTap: () {}, // TODO: Account switcher
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20),
                color: AppColors.card.withOpacity(0.6),
                border: Border.all(color: AppColors.border.withOpacity(0.5)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('Main Wallet', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: AppColors.textPrimary.withOpacity(0.8))),
                  const SizedBox(width: 4),
                  Icon(Icons.keyboard_arrow_down, size: 16, color: AppColors.textMuted),
                ],
              ),
            ),
          ),

          // Notification bell
          GestureDetector(
            onTap: () {}, // TODO: Notifications
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.card,
                border: Border.all(color: AppColors.border),
              ),
              child: const Icon(Icons.notifications_outlined, size: 20, color: AppColors.textPrimary),
            ),
          ),
        ],
      ),
    );
  }
}
