import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme/app_theme.dart';
import '../services/blockchain_service.dart';
import '../services/wallet_service.dart';
import '../models/token.dart' show Transaction, TransactionType, TransactionStatus;
import '../models/wallet_account.dart' show ChainType;
import '../widgets/transaction_filter_sheet.dart';

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
  String? _error;
  List<Transaction> _transactions = [];
  TransactionFilters _filters = TransactionFilters.empty;
  final BlockchainService _blockchainService = BlockchainService();
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadTransactions();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadTransactions() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
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
        setState(() {
          _isLoading = false;
          _error = e.toString();
        });
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
      
      // Advanced filters - types
      if (_filters.types.isNotEmpty) {
        final typeName = tx.type.name;
        if (!_filters.types.contains(typeName)) return false;
      }
      
      // Advanced filters - statuses
      if (_filters.statuses.isNotEmpty) {
        final statusName = tx.status.name;
        if (!_filters.statuses.contains(statusName)) return false;
      }
      
      // Advanced filters - tokens
      if (_filters.tokens.isNotEmpty) {
        if (!_filters.tokens.contains(tx.symbol)) return false;
      }
      
      // Advanced filters - date range
      if (_filters.dateFrom != null) {
        final fromDate = DateTime(_filters.dateFrom!.year, _filters.dateFrom!.month, _filters.dateFrom!.day);
        if (tx.timestamp.isBefore(fromDate)) return false;
      }
      if (_filters.dateTo != null) {
        final toDate = DateTime(_filters.dateTo!.year, _filters.dateTo!.month, _filters.dateTo!.day, 23, 59, 59);
        if (tx.timestamp.isAfter(toDate)) return false;
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

  List<String> get _availableTokens {
    final tokens = <String>{};
    for (final tx in _transactions) {
      tokens.add(tx.symbol);
    }
    return tokens.toList()..sort();
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
    final today = DateTime(now.year, now.month, now.day);
    final txDate = DateTime(date.year, date.month, date.day);
    final diff = today.difference(txDate).inDays;
    
    if (diff == 0) return 'Today';
    if (diff == 1) return 'Yesterday';
    
    final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (date.year != now.year) {
      return '${months[date.month - 1]} ${date.day}, ${date.year}';
    }
    return '${months[date.month - 1]} ${date.day}';
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

  String _getExplorerUrl(Transaction tx) {
    switch (tx.chain) {
      case ChainType.ethereum:
        return 'https://etherscan.io/tx/${tx.hash}';
      case ChainType.arbitrum:
        return 'https://arbiscan.io/tx/${tx.hash}';
      case ChainType.polygon:
        return 'https://polygonscan.com/tx/${tx.hash}';
      case ChainType.solana:
        return 'https://solscan.io/tx/${tx.hash}';
      case ChainType.tron:
        return 'https://tronscan.org/#/transaction/${tx.hash}';
      default:
        return '';
    }
  }

  Future<void> _openExplorer(Transaction tx) async {
    final url = _getExplorerUrl(tx);
    if (url.isNotEmpty) {
      try {
        await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
      } catch (e) {
        debugPrint('[HISTORY] Error opening explorer: $e');
      }
    }
  }

  void _showFilterSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => TransactionFilterSheet(
        filters: _filters,
        availableTokens: _availableTokens,
        onApply: (filters) {
          setState(() => _filters = filters);
        },
        onClose: () => Navigator.pop(context),
      ),
    );
  }

  void _clearFilters() {
    setState(() {
      _filters = TransactionFilters.empty;
      _quickFilter = 'all';
      _searchQuery = '';
      _searchController.clear();
    });
  }

  void _removeFilterType(String type) {
    setState(() {
      _filters = _filters.copyWith(
        types: _filters.types.where((t) => t != type).toList(),
      );
    });
  }

  void _removeFilterStatus(String status) {
    setState(() {
      _filters = _filters.copyWith(
        statuses: _filters.statuses.where((s) => s != status).toList(),
      );
    });
  }

  void _removeFilterToken(String token) {
    setState(() {
      _filters = _filters.copyWith(
        tokens: _filters.tokens.where((t) => t != token).toList(),
      );
    });
  }

  void _removeFilterDateFrom() {
    setState(() {
      _filters = _filters.copyWith(clearDateFrom: true);
    });
  }

  void _removeFilterDateTo() {
    setState(() {
      _filters = _filters.copyWith(clearDateTo: true);
    });
  }

  @override
  Widget build(BuildContext context) {
    final walletService = context.watch<WalletService>();
    final isConnected = walletService.evmAddress != null || 
                        walletService.solanaAddress != null || 
                        walletService.tronAddress != null;

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
              if (isConnected)
                GestureDetector(
                  onTap: _isLoading ? null : _loadTransactions,
                  child: Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: AppTheme.card,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppTheme.border),
                    ),
                    child: _isLoading
                        ? const Padding(
                            padding: EdgeInsets.all(10),
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: AppTheme.mutedForeground,
                            ),
                          )
                        : const Icon(Icons.refresh, color: AppTheme.foreground, size: 20),
                  ),
                ),
              if (isConnected) const SizedBox(width: 8),
              if (isConnected)
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

        // Search Bar with Filter Button
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
                    controller: _searchController,
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
              GestureDetector(
                onTap: _showFilterSheet,
                child: Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: _filters.hasActiveFilters ? AppTheme.primary : AppTheme.card,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: _filters.hasActiveFilters ? AppTheme.primary : AppTheme.border,
                    ),
                  ),
                  child: Stack(
                    children: [
                      Center(
                        child: Icon(
                          Icons.tune,
                          color: _filters.hasActiveFilters 
                              ? AppTheme.primaryForeground 
                              : AppTheme.mutedForeground,
                        ),
                      ),
                      if (_filters.activeCount > 0)
                        Positioned(
                          top: 4,
                          right: 4,
                          child: Container(
                            width: 18,
                            height: 18,
                            decoration: BoxDecoration(
                              color: AppTheme.destructive,
                              borderRadius: BorderRadius.circular(9),
                            ),
                            child: Center(
                              child: Text(
                                '${_filters.activeCount}',
                                style: const TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),

        // Active Filter Tags
        if (_filters.hasActiveFilters)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (_filters.dateFrom != null)
                  _buildFilterTag('From: ${_formatDateGroup(_filters.dateFrom!)}', _removeFilterDateFrom),
                if (_filters.dateTo != null)
                  _buildFilterTag('To: ${_formatDateGroup(_filters.dateTo!)}', _removeFilterDateTo),
                ..._filters.types.map((type) => 
                  _buildFilterTag(type[0].toUpperCase() + type.substring(1), () => _removeFilterType(type))),
                ..._filters.statuses.map((status) => 
                  _buildFilterTag(status[0].toUpperCase() + status.substring(1), () => _removeFilterStatus(status))),
                ..._filters.tokens.map((token) => 
                  _buildFilterTag(token, () => _removeFilterToken(token))),
                GestureDetector(
                  onTap: _clearFilters,
                  child: const Text(
                    'Clear all',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppTheme.mutedForeground,
                      decoration: TextDecoration.underline,
                    ),
                  ),
                ),
              ],
            ),
          ),

        if (_filters.hasActiveFilters) const SizedBox(height: 8),

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
                  onTap: () {
                    HapticFeedback.lightImpact();
                    setState(() => _quickFilter = filter);
                  },
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

        // Connection Status Banner
        if (!isConnected)
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.muted.withOpacity(0.5),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.border),
            ),
            child: Row(
              children: [
                const Icon(Icons.wifi_off, color: AppTheme.mutedForeground, size: 20),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text(
                        'Wallet not connected',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: AppTheme.foreground),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Connect/import a wallet to load on-chain transactions',
                        style: TextStyle(fontSize: 12, color: AppTheme.mutedForeground),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

        // Transaction List
        Expanded(
          child: _isLoading
              ? const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      CircularProgressIndicator(color: AppTheme.mutedForeground),
                      SizedBox(height: 16),
                      Text(
                        'Loading transactions...',
                        style: TextStyle(color: AppTheme.mutedForeground),
                      ),
                    ],
                  ),
                )
              : _error != null
                  ? _buildErrorState()
                  : _filteredTransactions.isEmpty
                      ? _buildEmptyState()
                      : RefreshIndicator(
                          onRefresh: _loadTransactions,
                          color: AppTheme.primary,
                          backgroundColor: AppTheme.card,
                          child: ListView.builder(
                            padding: EdgeInsets.only(
                              left: 16,
                              right: 16,
                              bottom: MediaQuery.of(context).padding.bottom + 100,
                            ),
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
                                      date.toUpperCase(),
                                      style: const TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600,
                                        color: AppTheme.mutedForeground,
                                        letterSpacing: 0.5,
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

  Widget _buildFilterTag(String label, VoidCallback onRemove) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppTheme.secondary,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: const TextStyle(fontSize: 12, color: AppTheme.foreground),
          ),
          const SizedBox(width: 6),
          GestureDetector(
            onTap: onRemove,
            child: const Icon(Icons.close, size: 14, color: AppTheme.mutedForeground),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    final hasFilters = _filters.hasActiveFilters || _searchQuery.isNotEmpty;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.filter_list,
              size: 48,
              color: AppTheme.mutedForeground.withOpacity(0.5),
            ),
            const SizedBox(height: 16),
            Text(
              hasFilters
                  ? 'No transactions match your filters'
                  : 'No transactions found across your networks',
              style: const TextStyle(
                fontSize: 14,
                color: AppTheme.mutedForeground,
              ),
              textAlign: TextAlign.center,
            ),
            if (hasFilters) ...[
              const SizedBox(height: 12),
              GestureDetector(
                onTap: _clearFilters,
                child: const Text(
                  'Clear all filters',
                  style: TextStyle(
                    fontSize: 14,
                    color: AppTheme.primary,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.filter_list,
              size: 48,
              color: AppTheme.mutedForeground.withOpacity(0.5),
            ),
            const SizedBox(height: 16),
            const Text(
              'Failed to load transactions',
              style: TextStyle(
                fontSize: 14,
                color: AppTheme.mutedForeground,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _error ?? '',
              style: TextStyle(
                fontSize: 12,
                color: AppTheme.mutedForeground.withOpacity(0.7),
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTransactionItem(Transaction tx) {
    final isSend = tx.type == TransactionType.send;
    final isReceive = tx.type == TransactionType.receive;

    IconData icon;
    Color iconColor;
    Color bgColor;
    switch (tx.type) {
      case TransactionType.send:
        icon = Icons.arrow_outward;
        iconColor = AppTheme.destructive;
        bgColor = AppTheme.destructive.withOpacity(0.1);
        break;
      case TransactionType.receive:
        icon = Icons.arrow_downward;
        iconColor = AppTheme.success;
        bgColor = AppTheme.success.withOpacity(0.1);
        break;
      case TransactionType.swap:
        icon = Icons.swap_horiz;
        iconColor = AppTheme.accent;
        bgColor = AppTheme.accent.withOpacity(0.1);
        break;
      case TransactionType.contract:
        icon = Icons.description_outlined;
        iconColor = AppTheme.mutedForeground;
        bgColor = AppTheme.muted.withOpacity(0.1);
        break;
    }

    final address = isSend ? tx.to : tx.from;

    return GestureDetector(
      onTap: () => _openExplorer(tx),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
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
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: bgColor,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Icon(icon, color: iconColor, size: 20),
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
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.foreground,
                        ),
                      ),
                      if (tx.status != TransactionStatus.confirmed) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppTheme.secondary,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            tx.status.name,
                            style: const TextStyle(
                              fontSize: 10,
                              color: AppTheme.mutedForeground,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _formatTime(tx.timestamp),
                    style: const TextStyle(fontSize: 12, color: AppTheme.mutedForeground),
                  ),
                ],
              ),
            ),
            // Amount
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '${isSend ? '-' : isReceive ? '+' : ''}${_formatAmount(tx.amount)} ${tx.symbol}',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    fontFamily: 'monospace',
                    color: isSend ? AppTheme.destructive : isReceive ? AppTheme.success : AppTheme.foreground,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _formatAddress(address),
                  style: const TextStyle(
                    fontSize: 12,
                    fontFamily: 'monospace',
                    color: AppTheme.mutedForeground,
                  ),
                ),
              ],
            ),
            const SizedBox(width: 8),
            const Icon(
              Icons.open_in_new,
              size: 16,
              color: AppTheme.mutedForeground,
            ),
          ],
        ),
      ),
    );
  }
}
