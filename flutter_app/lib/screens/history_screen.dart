import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../services/blockchain_service.dart';
import '../services/wallet_service.dart';
import '../models/token.dart' show Transaction, TransactionType, TransactionStatus;
import '../models/wallet_account.dart' show ChainType;

class HistoryScreen extends StatefulWidget {
  final VoidCallback? onBack;

  const HistoryScreen({super.key, this.onBack});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  String _quickFilter = 'all';
  String _searchQuery = '';
  bool _isLoading = true;
  List<Transaction> _transactions = [];
  final BlockchainService _blockchainService = BlockchainService();

  @override
  void initState() {
    super.initState();
    _loadTransactions();
  }

  Future<void> _loadTransactions() async {
    setState(() => _isLoading = true);
    HapticFeedback.lightImpact();

    try {
      final walletService = context.read<WalletService>();
      debugPrint('[HISTORY] Loading transactions for evm=${walletService.evmAddress}, sol=${walletService.solanaAddress}, tron=${walletService.tronAddress}');

      final txs = await _blockchainService.fetchTransactions(
        evmAddress: walletService.evmAddress,
        solanaAddress: walletService.solanaAddress,
        tronAddress: walletService.tronAddress,
      );

      debugPrint('[HISTORY] Loaded ${txs.length} transactions');

      if (mounted) {
        setState(() {
          _transactions = txs;
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('[HISTORY] Error loading transactions: $e');
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  List<Transaction> get _filteredTransactions {
    return _transactions.where((tx) {
      // Quick filter
      if (_quickFilter != 'all') {
        if (_quickFilter == 'send' && tx.type != TransactionType.send) return false;
        if (_quickFilter == 'receive' && tx.type != TransactionType.receive) return false;
        if (_quickFilter == 'swap' && tx.type != TransactionType.swap) return false;
      }
      // Search query
      if (_searchQuery.isNotEmpty) {
        final query = _searchQuery.toLowerCase();
        return tx.symbol.toLowerCase().contains(query) ||
            tx.from.toLowerCase().contains(query) ||
            tx.to.toLowerCase().contains(query) ||
            tx.hash.toLowerCase().contains(query);
      }
      return true;
    }).toList();
  }

  Map<String, List<Transaction>> get _groupedTransactions {
    final grouped = <String, List<Transaction>>{};
    for (final tx in _filteredTransactions) {
      final date = _formatDateGroup(tx.timestamp);
      grouped.putIfAbsent(date, () => []).add(tx);
    }
    return grouped;
  }

  String _formatDateGroup(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);
    if (diff.inDays == 0) return 'Today';
    if (diff.inDays == 1) return 'Yesterday';
    if (diff.inDays < 7) return '${diff.inDays} days ago';
    return '${date.day} ${_monthName(date.month)}${date.year != now.year ? ' ${date.year}' : ''}';
  }

  String _monthName(int month) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1];
  }

  String _formatTime(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${date.day}/${date.month}';
  }

  String _formatAddress(String? address) {
    if (address == null || address.length < 12) return address ?? '';
    return '${address.substring(0, 6)}...${address.substring(address.length - 4)}';
  }

  String _formatAmount(double amount) {
    if (amount >= 1) return amount.toStringAsFixed(4);
    if (amount >= 0.0001) return amount.toStringAsFixed(6);
    return amount.toStringAsFixed(8);
  }

  void _openExplorer(Transaction tx) {
    String url;
    switch (tx.chain) {
      case ChainType.ethereum:
        url = 'https://etherscan.io/tx/${tx.hash}';
        break;
      case ChainType.arbitrum:
        url = 'https://arbiscan.io/tx/${tx.hash}';
        break;
      case ChainType.polygon:
        url = 'https://polygonscan.com/tx/${tx.hash}';
        break;
      case ChainType.solana:
        url = 'https://solscan.io/tx/${tx.hash}';
        break;
      case ChainType.tron:
        url = 'https://tronscan.org/#/transaction/${tx.hash}';
        break;
      default:
        url = '';
    }
    debugPrint('[HISTORY] Open explorer: $url');
    // In real app, launch URL
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Header
        Container(
          padding: const EdgeInsets.all(16),
          decoration: const BoxDecoration(
            border: Border(bottom: BorderSide(color: AppTheme.border, width: 1)),
          ),
          child: Row(
            children: [
              const Expanded(
                child: Text(
                  'Transaction History',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.foreground),
                ),
              ),
              GestureDetector(
                onTap: _loadTransactions,
                child: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: AppTheme.card,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppTheme.border),
                  ),
                  child: Icon(
                    Icons.refresh,
                    color: _isLoading ? AppTheme.mutedForeground : AppTheme.foreground,
                    size: 20,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: AppTheme.muted,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppTheme.border),
                ),
                child: const Text('All Networks', style: TextStyle(fontSize: 12, color: AppTheme.mutedForeground)),
              ),
            ],
          ),
        ),

        // Search Bar
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Expanded(
                child: Container(
                  height: 48,
                  decoration: BoxDecoration(
                    color: AppTheme.card,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.border),
                  ),
                  child: TextField(
                    onChanged: (value) => setState(() => _searchQuery = value),
                    style: const TextStyle(color: AppTheme.foreground),
                    decoration: const InputDecoration(
                      hintText: 'Search transactions...',
                      hintStyle: TextStyle(color: AppTheme.mutedForeground),
                      prefixIcon: Icon(Icons.search, color: AppTheme.mutedForeground),
                      border: InputBorder.none,
                      contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: AppTheme.card,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.border),
                ),
                child: const Icon(Icons.tune, color: AppTheme.mutedForeground),
              ),
            ],
          ),
        ),

        // Quick Filter Tabs
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: ['all', 'send', 'receive', 'swap'].map((filter) {
              final isActive = _quickFilter == filter;
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: GestureDetector(
                  onTap: () => setState(() => _quickFilter = filter),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    decoration: BoxDecoration(
                      color: isActive ? AppTheme.primary : AppTheme.card,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: isActive ? AppTheme.primary : AppTheme.border),
                    ),
                    child: Text(
                      filter == 'all' ? 'All' : filter[0].toUpperCase() + filter.substring(1),
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: isActive ? AppTheme.primaryForeground : AppTheme.mutedForeground,
                      ),
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ),

        const SizedBox(height: 16),

        // Transaction List
        Expanded(
          child: _isLoading
              ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
              : _filteredTransactions.isEmpty
                  ? _buildEmptyState()
                  : RefreshIndicator(
                      onRefresh: _loadTransactions,
                      color: AppTheme.primary,
                      backgroundColor: AppTheme.card,
                      child: ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: _groupedTransactions.length,
                        itemBuilder: (context, index) {
                          final date = _groupedTransactions.keys.elementAt(index);
                          final txs = _groupedTransactions[date]!;
                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Padding(
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                child: Text(
                                  date,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: AppTheme.mutedForeground,
                                  ),
                                ),
                              ),
                              ...txs.map((tx) => _buildTransactionItem(tx)),
                            ],
                          );
                        },
                      ),
                    ),
        ),
      ],
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.receipt_long_outlined, size: 64, color: AppTheme.mutedForeground.withValues(alpha: 0.5)),
          const SizedBox(height: 16),
          const Text('No transactions found', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: AppTheme.mutedForeground)),
          const SizedBox(height: 8),
          Text('Your transaction history will appear here', style: TextStyle(fontSize: 14, color: AppTheme.mutedForeground.withValues(alpha: 0.7))),
        ],
      ),
    );
  }

  Widget _buildTransactionItem(Transaction tx) {
    final isSend = tx.type == TransactionType.send;

    IconData icon;
    Color iconColor;
    switch (tx.type) {
      case TransactionType.send:
        icon = Icons.arrow_outward;
        iconColor = AppTheme.destructive;
        break;
      case TransactionType.receive:
        icon = Icons.arrow_downward;
        iconColor = AppTheme.success;
        break;
      case TransactionType.swap:
        icon = Icons.swap_horiz;
        iconColor = AppTheme.primary;
        break;
      case TransactionType.contract:
        icon = Icons.description_outlined;
        iconColor = AppTheme.mutedForeground;
        break;
    }

    final address = isSend ? tx.to : tx.from;

    return GestureDetector(
      onTap: () => _openExplorer(tx),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.card,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.border),
        ),
        child: Row(
          children: [
            // Icon
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: iconColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(22),
              ),
              child: Icon(icon, color: iconColor, size: 22),
            ),
            const SizedBox(width: 12),
            // Details
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        tx.type.name[0].toUpperCase() + tx.type.name.substring(1),
                        style: const TextStyle(fontWeight: FontWeight.w600, color: AppTheme.foreground),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(color: AppTheme.muted, borderRadius: BorderRadius.circular(4)),
                        child: Text(tx.chain.name.toUpperCase(), style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppTheme.mutedForeground)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${isSend ? 'To' : 'From'}: ${_formatAddress(address)}',
                    style: const TextStyle(fontSize: 13, color: AppTheme.mutedForeground),
                  ),
                ],
              ),
            ),
            // Amount
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '${isSend ? '-' : '+'}${_formatAmount(tx.amount)} ${tx.symbol}',
                  style: TextStyle(fontWeight: FontWeight.w600, color: isSend ? AppTheme.destructive : AppTheme.success),
                ),
                const SizedBox(height: 4),
                Text(_formatTime(tx.timestamp), style: const TextStyle(fontSize: 12, color: AppTheme.mutedForeground)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
