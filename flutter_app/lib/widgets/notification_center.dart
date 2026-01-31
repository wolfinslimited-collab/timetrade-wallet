import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/app_theme.dart';
import '../models/notification_item.dart';

class NotificationCenter extends StatefulWidget {
  final List<NotificationItem> notifications;
  final int unreadCount;
  final void Function(String id) onMarkAsRead;
  final VoidCallback onMarkAllAsRead;
  final void Function(String id) onDelete;
  final VoidCallback onClearAll;

  const NotificationCenter({
    super.key,
    required this.notifications,
    required this.unreadCount,
    required this.onMarkAsRead,
    required this.onMarkAllAsRead,
    required this.onDelete,
    required this.onClearAll,
  });

  @override
  State<NotificationCenter> createState() => _NotificationCenterState();
}

class _NotificationCenterState extends State<NotificationCenter> {
  NotificationType? _filter;

  List<NotificationItem> get filteredNotifications {
    if (_filter == null) return widget.notifications;
    return widget.notifications.where((n) => n.type == _filter).toList();
  }

  void _openSheet() {
    HapticFeedback.lightImpact();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _buildSheet(),
    );
  }

  Widget _buildSheet() {
    return StatefulBuilder(
      builder: (context, setSheetState) {
        final filtered = _filter == null
            ? widget.notifications
            : widget.notifications.where((n) => n.type == _filter).toList();

        return Container(
          height: MediaQuery.of(context).size.height * 0.85,
          decoration: BoxDecoration(
            color: AppTheme.background,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              // Handle bar
              Container(
                margin: const EdgeInsets.only(top: 12),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppTheme.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              // Header
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Notifications',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.foreground,
                          ),
                        ),
                        Row(
                          children: [
                            if (widget.unreadCount > 0)
                              TextButton.icon(
                                onPressed: () {
                                  widget.onMarkAllAsRead();
                                  setSheetState(() {});
                                },
                                icon: const Icon(Icons.done_all, size: 16),
                                label: const Text('Mark all read'),
                                style: TextButton.styleFrom(
                                  foregroundColor: AppTheme.mutedForeground,
                                  textStyle: const TextStyle(fontSize: 12),
                                ),
                              ),
                            if (widget.notifications.isNotEmpty)
                              IconButton(
                                onPressed: () {
                                  widget.onClearAll();
                                  setSheetState(() {});
                                },
                                icon: const Icon(Icons.delete_outline, size: 20),
                                color: AppTheme.mutedForeground,
                              ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    // Filter tabs
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          _buildFilterChip(null, 'All', setSheetState),
                          const SizedBox(width: 8),
                          _buildFilterChip(NotificationType.priceAlert, 'Prices', setSheetState, icon: Icons.trending_up),
                          const SizedBox(width: 8),
                          _buildFilterChip(NotificationType.transaction, 'Txns', setSheetState, icon: Icons.check_circle_outline),
                          const SizedBox(width: 8),
                          _buildFilterChip(NotificationType.security, 'Security', setSheetState, icon: Icons.shield_outlined),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1, color: AppTheme.border),
              // Notifications list
              Expanded(
                child: filtered.isEmpty
                    ? _buildEmptyState()
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: filtered.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (context, index) =>
                            _buildNotificationItem(filtered[index], setSheetState),
                      ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildFilterChip(NotificationType? type, String label, StateSetter setSheetState, {IconData? icon}) {
    final isSelected = _filter == type;
    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        setState(() => _filter = type);
        setSheetState(() {});
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primary : AppTheme.secondary,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(
                icon,
                size: 14,
                color: isSelected ? AppTheme.primaryForeground : AppTheme.mutedForeground,
              ),
              const SizedBox(width: 4),
            ],
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: isSelected ? AppTheme.primaryForeground : AppTheme.mutedForeground,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: AppTheme.secondary,
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.notifications_outlined,
              size: 32,
              color: AppTheme.mutedForeground,
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'No notifications',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w500,
              color: AppTheme.mutedForeground,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            _filter == null
                ? "You're all caught up!"
                : 'No ${_filter!.displayName.toLowerCase()} notifications',
            style: TextStyle(
              fontSize: 12,
              color: AppTheme.mutedForeground.withValues(alpha: 0.6),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNotificationItem(NotificationItem notification, StateSetter setSheetState) {
    return Dismissible(
      key: Key(notification.id),
      direction: DismissDirection.endToStart,
      onDismissed: (_) {
        widget.onDelete(notification.id);
        setSheetState(() {});
      },
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        decoration: BoxDecoration(
          color: AppTheme.destructive,
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Icon(Icons.delete, color: Colors.white),
      ),
      child: GestureDetector(
        onTap: () {
          if (!notification.isRead) {
            widget.onMarkAsRead(notification.id);
            setSheetState(() {});
          }
        },
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: notification.isRead ? AppTheme.card : AppTheme.secondary,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.border),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: AppTheme.secondary,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  _getNotificationIcon(notification.type),
                  size: 18,
                  color: AppTheme.mutedForeground,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            notification.title,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: notification.isRead ? FontWeight.w500 : FontWeight.w600,
                              color: AppTheme.foreground,
                            ),
                          ),
                        ),
                        if (!notification.isRead)
                          Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              color: AppTheme.primary,
                              shape: BoxShape.circle,
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      notification.message,
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppTheme.mutedForeground,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _formatTime(notification.createdAt),
                      style: TextStyle(
                        fontSize: 10,
                        color: AppTheme.mutedForeground.withValues(alpha: 0.6),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  IconData _getNotificationIcon(NotificationType type) {
    switch (type) {
      case NotificationType.priceAlert:
        return Icons.trending_up;
      case NotificationType.transaction:
        return Icons.check_circle_outline;
      case NotificationType.security:
        return Icons.shield_outlined;
      case NotificationType.info:
        return Icons.info_outline;
    }
  }

  String _formatTime(DateTime time) {
    final now = DateTime.now();
    final diff = now.difference(time);
    
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${time.day}/${time.month}/${time.year}';
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _openSheet,
      child: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: AppTheme.card,
          border: Border.all(color: AppTheme.border),
        ),
        child: Stack(
          children: [
            const Center(
              child: Icon(
                Icons.notifications_outlined,
                size: 18,
                color: AppTheme.mutedForeground,
              ),
            ),
            if (widget.unreadCount > 0)
              Positioned(
                top: 0,
                right: 0,
                child: Container(
                  width: 16,
                  height: 16,
                  decoration: const BoxDecoration(
                    color: AppTheme.destructive,
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Text(
                      widget.unreadCount > 9 ? '9+' : '${widget.unreadCount}',
                      style: const TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
