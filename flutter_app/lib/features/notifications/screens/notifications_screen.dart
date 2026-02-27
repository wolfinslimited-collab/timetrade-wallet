import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                GestureDetector(
                  onTap: () => Navigator.pop(context),
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(shape: BoxShape.circle, color: AppColors.card, border: Border.all(color: AppColors.border)),
                    child: const Icon(Icons.chevron_left, size: 20),
                  ),
                ),
                const SizedBox(width: 12),
                const Expanded(child: Text('Notifications', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700))),
                TextButton(onPressed: () {}, child: Text('Mark all read', style: TextStyle(fontSize: 12, color: AppColors.primary))),
              ],
            ),
          ),
          Expanded(
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.notifications_none, size: 48, color: AppColors.textMuted.withOpacity(0.3)),
                  const SizedBox(height: 12),
                  Text('No notifications yet', style: TextStyle(color: AppColors.textMuted)),
                  Text('Price alerts and transaction updates will appear here', style: TextStyle(fontSize: 12, color: AppColors.textMuted.withOpacity(0.6)), textAlign: TextAlign.center),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
