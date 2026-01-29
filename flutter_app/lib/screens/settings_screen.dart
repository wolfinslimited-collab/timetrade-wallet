import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../services/wallet_service.dart';

class SettingsScreen extends StatefulWidget {
  final VoidCallback onBack;

  const SettingsScreen({
    super.key,
    required this.onBack,
  });

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _biometricEnabled = false;
  bool _autoLockEnabled = true;
  int _storedKeysCount = 0;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    final walletService = WalletService();
    final biometric = await walletService.isBiometricEnabled();
    final keys = await walletService.getStoredKeysCount();
    
    if (mounted) {
      setState(() {
        _biometricEnabled = biometric;
        _storedKeysCount = keys;
      });
    }
  }

  void _showChangePinSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const ChangePinSheet(),
    );
  }

  void _showViewSeedPhraseSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const ViewSeedPhraseSheet(),
    );
  }

  void _showManageKeysSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const ManageStoredKeysSheet(),
    );
  }

  void _showResetWalletDialog() {
    showDialog(
      context: context,
      builder: (context) => ResetWalletDialog(
        onConfirm: () async {
          final walletService = WalletService();
          await walletService.resetWallet();
          if (mounted) {
            Navigator.of(context).popUntil((route) => route.isFirst);
          }
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(color: AppTheme.border, width: 1),
                ),
              ),
              child: Row(
                children: [
                  GestureDetector(
                    onTap: widget.onBack,
                    child: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: AppTheme.card,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppTheme.border),
                      ),
                      child: const Icon(
                        Icons.chevron_left,
                        color: AppTheme.foreground,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  const Text(
                    'Settings',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.foreground,
                    ),
                  ),
                ],
              ),
            ),

            // Settings List
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Security Section
                    _buildSectionHeader(Icons.shield_outlined, 'Security'),
                    const SizedBox(height: 12),
                    _buildSettingItem(
                      icon: Icons.key_outlined,
                      label: 'Change PIN',
                      description: 'Update your 6-digit security PIN',
                      onTap: _showChangePinSheet,
                    ),
                    const SizedBox(height: 12),
                    _buildSettingItem(
                      icon: Icons.fingerprint,
                      label: 'Biometric Unlock',
                      description: _biometricEnabled
                          ? 'Enabled - use Face ID or fingerprint'
                          : 'Use Face ID or fingerprint to unlock',
                      trailing: Switch(
                        value: _biometricEnabled,
                        onChanged: (value) async {
                          final walletService = WalletService();
                          await walletService.setBiometricEnabled(value);
                          setState(() => _biometricEnabled = value);
                        },
                        activeColor: AppTheme.primary,
                      ),
                    ),
                    const SizedBox(height: 12),
                    _buildSettingItem(
                      icon: Icons.visibility_outlined,
                      label: 'View Seed Phrase',
                      description: 'Backup your recovery phrase',
                      onTap: _showViewSeedPhraseSheet,
                    ),
                    const SizedBox(height: 12),
                    _buildSettingItem(
                      icon: Icons.vpn_key_outlined,
                      label: 'Manage Stored Keys',
                      description: '$_storedKeysCount key${_storedKeysCount != 1 ? 's' : ''} saved for quick signing',
                      onTap: _showManageKeysSheet,
                    ),

                    const SizedBox(height: 24),

                    // Notifications Section
                    _buildSectionHeader(Icons.notifications_outlined, 'Notifications'),
                    const SizedBox(height: 12),
                    _buildSettingItem(
                      icon: Icons.notifications_active_outlined,
                      label: 'Push Notifications',
                      description: 'Get alerts for prices & transactions',
                      onTap: () {},
                    ),

                    const SizedBox(height: 24),

                    // Auto-Lock Section
                    _buildSectionHeader(Icons.lock_clock_outlined, 'Auto-Lock'),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppTheme.card,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.border),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Lock after inactivity',
                                  style: TextStyle(
                                    fontWeight: FontWeight.w500,
                                    color: AppTheme.foreground,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Automatically lock wallet after 5 minutes',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: AppTheme.mutedForeground,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Switch(
                            value: _autoLockEnabled,
                            onChanged: (value) {
                              setState(() => _autoLockEnabled = value);
                            },
                            activeColor: AppTheme.primary,
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 24),

                    // Danger Zone
                    _buildSectionHeader(Icons.warning_outlined, 'Danger Zone', isDanger: true),
                    const SizedBox(height: 12),
                    _buildSettingItem(
                      icon: Icons.delete_outline,
                      label: 'Reset Wallet',
                      description: 'Delete all data and start fresh',
                      onTap: _showResetWalletDialog,
                      isDanger: true,
                    ),

                    const SizedBox(height: 32),

                    // App Info
                    Center(
                      child: Column(
                        children: [
                          Text(
                            'Timetrade Wallet v1.0.0',
                            style: TextStyle(
                              fontSize: 12,
                              color: AppTheme.mutedForeground,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Powered by secure encryption',
                            style: TextStyle(
                              fontSize: 12,
                              color: AppTheme.mutedForeground,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(IconData icon, String title, {bool isDanger = false}) {
    return Row(
      children: [
        Icon(
          icon,
          size: 16,
          color: isDanger ? AppTheme.destructive : AppTheme.primary,
        ),
        const SizedBox(width: 8),
        Text(
          title.toUpperCase(),
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            letterSpacing: 1,
            color: isDanger ? AppTheme.destructive : AppTheme.mutedForeground,
          ),
        ),
      ],
    );
  }

  Widget _buildSettingItem({
    required IconData icon,
    required String label,
    String? description,
    VoidCallback? onTap,
    Widget? trailing,
    bool isDanger = false,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDanger ? AppTheme.destructive.withOpacity(0.05) : AppTheme.card,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isDanger ? AppTheme.destructive.withOpacity(0.2) : AppTheme.border,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: isDanger 
                    ? AppTheme.destructive.withOpacity(0.1) 
                    : AppTheme.primary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Icon(
                icon,
                size: 20,
                color: isDanger ? AppTheme.destructive : AppTheme.primary,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: TextStyle(
                      fontWeight: FontWeight.w500,
                      color: isDanger ? AppTheme.destructive : AppTheme.foreground,
                    ),
                  ),
                  if (description != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      description,
                      style: TextStyle(
                        fontSize: 12,
                        color: AppTheme.mutedForeground,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            trailing ?? Icon(
              Icons.chevron_right,
              color: AppTheme.mutedForeground,
            ),
          ],
        ),
      ),
    );
  }
}

// Placeholder sheets - implement full UI as needed
class ChangePinSheet extends StatelessWidget {
  const ChangePinSheet({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.7,
      decoration: const BoxDecoration(
        color: AppTheme.background,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: const Center(child: Text('Change PIN Sheet', style: TextStyle(color: AppTheme.foreground))),
    );
  }
}

class ViewSeedPhraseSheet extends StatelessWidget {
  const ViewSeedPhraseSheet({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.7,
      decoration: const BoxDecoration(
        color: AppTheme.background,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: const Center(child: Text('View Seed Phrase Sheet', style: TextStyle(color: AppTheme.foreground))),
    );
  }
}

class ManageStoredKeysSheet extends StatelessWidget {
  const ManageStoredKeysSheet({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.7,
      decoration: const BoxDecoration(
        color: AppTheme.background,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: const Center(child: Text('Manage Stored Keys Sheet', style: TextStyle(color: AppTheme.foreground))),
    );
  }
}

class ResetWalletDialog extends StatelessWidget {
  final VoidCallback onConfirm;

  const ResetWalletDialog({super.key, required this.onConfirm});

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: AppTheme.card,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: const Row(
        children: [
          Icon(Icons.warning_outlined, color: AppTheme.destructive),
          SizedBox(width: 8),
          Text('Reset Wallet', style: TextStyle(color: AppTheme.foreground)),
        ],
      ),
      content: const Text(
        'This will permanently delete all wallet data including your seed phrase, PIN, and stored keys. Make sure you have backed up your seed phrase before proceeding.',
        style: TextStyle(color: AppTheme.mutedForeground),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: () {
            Navigator.pop(context);
            onConfirm();
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.destructive,
          ),
          child: const Text('Reset Wallet', style: TextStyle(color: Colors.white)),
        ),
      ],
    );
  }
}
