import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../services/wallet_service.dart';
import '../models/wallet_account.dart';

class AccountSwitcherSheet extends StatefulWidget {
  final VoidCallback? onAccountSwitched;

  const AccountSwitcherSheet({
    super.key,
    this.onAccountSwitched,
  });

  @override
  State<AccountSwitcherSheet> createState() => _AccountSwitcherSheetState();
}

class _AccountSwitcherSheetState extends State<AccountSwitcherSheet> {
  String? _editingAccountId;
  final TextEditingController _nameController = TextEditingController();
  String? _deleteConfirmId;
  bool _showAddMenu = false;

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  void _startEditing(WalletAccount account) {
    setState(() {
      _editingAccountId = account.id;
      _nameController.text = account.name;
    });
  }

  Future<void> _saveEdit(WalletService walletService) async {
    if (_editingAccountId != null && _nameController.text.trim().isNotEmpty) {
      await walletService.renameAccount(_editingAccountId!, _nameController.text.trim());
      setState(() => _editingAccountId = null);
      HapticFeedback.lightImpact();
    }
  }

  Future<void> _switchAccount(WalletService walletService, String accountId) async {
    HapticFeedback.mediumImpact();
    await walletService.switchAccount(accountId);
    widget.onAccountSwitched?.call();
    if (mounted) Navigator.pop(context);
  }

  void _showDeleteConfirm(String accountId) {
    setState(() => _deleteConfirmId = accountId);
  }

  @override
  Widget build(BuildContext context) {
    final walletService = context.watch<WalletService>();
    final accounts = walletService.accounts;
    final activeAccount = walletService.activeAccount;

    return Container(
      height: MediaQuery.of(context).size.height * 0.7,
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
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.layers_outlined, size: 20, color: AppTheme.foreground),
                    const SizedBox(width: 8),
                    const Text(
                      'Accounts',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.foreground,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppTheme.secondary,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '${accounts.length}',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.mutedForeground,
                        ),
                      ),
                    ),
                  ],
                ),
                // Add account button
                GestureDetector(
                  onTap: () {
                    HapticFeedback.lightImpact();
                    setState(() => _showAddMenu = !_showAddMenu);
                  },
                  child: Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppTheme.primary,
                    ),
                    child: const Icon(
                      Icons.add,
                      size: 20,
                      color: AppTheme.primaryForeground,
                    ),
                  ),
                ),
              ],
            ),
          ),
          
          // Add menu (if visible)
          if (_showAddMenu)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.card,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.border),
                ),
                child: Column(
                  children: [
                    _buildAddOption(
                      icon: Icons.article_outlined,
                      title: 'Import Seed Phrase',
                      subtitle: '12 or 24 word recovery phrase',
                      onTap: () {
                        // TODO: Navigate to import seed phrase screen
                        setState(() => _showAddMenu = false);
                      },
                    ),
                    const Divider(height: 16, color: AppTheme.border),
                    _buildAddOption(
                      icon: Icons.key_outlined,
                      title: 'Import Private Key',
                      subtitle: 'EVM-compatible private key',
                      onTap: () {
                        // TODO: Navigate to import private key screen
                        setState(() => _showAddMenu = false);
                      },
                    ),
                  ],
                ),
              ),
            ),

          const Divider(height: 1, color: AppTheme.border),

          // Delete confirmation dialog
          if (_deleteConfirmId != null)
            _buildDeleteConfirmation(walletService),

          // Accounts list
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: accounts.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final account = accounts[index];
                final isActive = account.id == activeAccount?.id;
                final isEditing = _editingAccountId == account.id;

                return _buildAccountItem(
                  account: account,
                  isActive: isActive,
                  isEditing: isEditing,
                  walletService: walletService,
                  canDelete: accounts.length > 1,
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAddOption({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppTheme.secondary,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 20, color: AppTheme.foreground),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: AppTheme.foreground,
                  ),
                ),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppTheme.mutedForeground,
                  ),
                ),
              ],
            ),
          ),
          const Icon(Icons.chevron_right, size: 20, color: AppTheme.mutedForeground),
        ],
      ),
    );
  }

  Widget _buildDeleteConfirmation(WalletService walletService) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.destructive.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.destructive.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.warning_amber_rounded, color: AppTheme.destructive, size: 20),
              SizedBox(width: 8),
              Text(
                'Delete Account?',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.destructive,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Text(
            'This action cannot be undone. Make sure you have backed up your recovery phrase.',
            style: TextStyle(
              fontSize: 12,
              color: AppTheme.mutedForeground,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextButton(
                  onPressed: () => setState(() => _deleteConfirmId = null),
                  child: const Text('Cancel'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton(
                  onPressed: () {
                    // TODO: Implement account deletion
                    setState(() => _deleteConfirmId = null);
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.destructive,
                  ),
                  child: const Text('Delete', style: TextStyle(color: Colors.white)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAccountItem({
    required WalletAccount account,
    required bool isActive,
    required bool isEditing,
    required WalletService walletService,
    required bool canDelete,
  }) {
    return GestureDetector(
      onTap: isEditing ? null : () => _switchAccount(walletService, account.id),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isActive ? AppTheme.secondary : AppTheme.card,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isActive ? AppTheme.primary.withValues(alpha: 0.5) : AppTheme.border,
          ),
        ),
        child: Row(
          children: [
            // Avatar
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    const Color(0xFF6366F1),
                    const Color(0xFF8B5CF6),
                  ],
                ),
              ),
              child: Center(
                child: Text(
                  account.name[0].toUpperCase(),
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            // Name / Edit field
            Expanded(
              child: isEditing
                  ? TextField(
                      controller: _nameController,
                      autofocus: true,
                      style: const TextStyle(color: AppTheme.foreground),
                      decoration: InputDecoration(
                        isDense: true,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide: const BorderSide(color: AppTheme.border),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide: const BorderSide(color: AppTheme.primary),
                        ),
                      ),
                      onSubmitted: (_) => _saveEdit(walletService),
                    )
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              account.name,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                                color: AppTheme.foreground,
                              ),
                            ),
                            if (isActive) ...[
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: AppTheme.primary,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Text(
                                  'Active',
                                  style: TextStyle(
                                    fontSize: 9,
                                    fontWeight: FontWeight.w600,
                                    color: AppTheme.primaryForeground,
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          account.type == AccountType.mnemonic ? 'Seed Phrase' : 'Private Key',
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppTheme.mutedForeground,
                          ),
                        ),
                      ],
                    ),
            ),
            // Actions
            if (!isEditing) ...[
              IconButton(
                onPressed: () => _startEditing(account),
                icon: const Icon(Icons.edit_outlined, size: 18),
                color: AppTheme.mutedForeground,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
              ),
              if (canDelete)
                IconButton(
                  onPressed: () => _showDeleteConfirm(account.id),
                  icon: const Icon(Icons.delete_outline, size: 18),
                  color: AppTheme.mutedForeground,
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                ),
            ] else ...[
              IconButton(
                onPressed: () => _saveEdit(walletService),
                icon: const Icon(Icons.check, size: 18),
                color: AppTheme.primary,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
              ),
              IconButton(
                onPressed: () => setState(() => _editingAccountId = null),
                icon: const Icon(Icons.close, size: 18),
                color: AppTheme.mutedForeground,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// Helper function to show the sheet
void showAccountSwitcherSheet(BuildContext context, {VoidCallback? onAccountSwitched}) {
  HapticFeedback.lightImpact();
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (context) => AccountSwitcherSheet(onAccountSwitched: onAccountSwitched),
  );
}
