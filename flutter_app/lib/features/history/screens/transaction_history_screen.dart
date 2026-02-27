import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

enum TxType { send, receive, swap }
enum TxQuickFilter { all, send, receive, swap }

class TransactionHistoryScreen extends StatefulWidget {
  const TransactionHistoryScreen({super.key});
  @override
  State<TransactionHistoryScreen> createState() => _TransactionHistoryScreenState();
}

class _TransactionHistoryScreenState extends State<TransactionHistoryScreen> {
  TxQuickFilter _filter = TxQuickFilter.all;
  final _searchController = TextEditingController();

  // Demo transactions
  final _transactions = <_DemoTx>[
    _DemoTx(type: TxType.receive, symbol: 'ETH', amount: 0.5, chain: 'Ethereum', time: '2h ago', hash: '0xabc...'),
    _DemoTx(type: TxType.send, symbol: 'SOL', amount: 10, chain: 'Solana', time: '5h ago', hash: '4xFg...'),
    _DemoTx(type: TxType.swap, symbol: 'USDT', amount: 100, chain: 'Polygon', time: '1d ago', hash: '0xdef...', swapTo: 'ETH'),
    _DemoTx(type: TxType.receive, symbol: 'BNB', amount: 2, chain: 'BNB Chain', time: '2d ago', hash: '0x123...'),
  ];

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
            child: Row(
              children: [
                const Expanded(child: Text('Transaction History', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700))),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(borderRadius: BorderRadius.circular(12), color: AppColors.surfaceLight, border: Border.all(color: AppColors.border)),
                  child: Text('All Networks', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                ),
              ],
            ),
          ),

          // Search
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    decoration: InputDecoration(
                      hintText: 'Search transactions...',
                      prefixIcon: const Icon(Icons.search, size: 20),
                      isDense: true,
                      contentPadding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  width: 48, height: 48,
                  decoration: BoxDecoration(borderRadius: BorderRadius.circular(12), color: AppColors.card, border: Border.all(color: AppColors.border)),
                  child: const Icon(Icons.tune, size: 20),
                ),
              ],
            ),
          ),

          // Quick filters
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: TxQuickFilter.values.map((f) {
                final active = _filter == f;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: GestureDetector(
                    onTap: () => setState(() => _filter = f),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(20),
                        color: active ? AppColors.textPrimary : AppColors.card,
                        border: Border.all(color: active ? Colors.transparent : AppColors.border),
                      ),
                      child: Text(
                        f.name[0].toUpperCase() + f.name.substring(1),
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: active ? AppColors.background : AppColors.textSecondary),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 16),

          // Transactions list
          Expanded(
            child: _transactions.isEmpty
                ? Center(child: Text('No transactions yet', style: TextStyle(color: AppColors.textMuted)))
                : ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: _transactions.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 2),
                    itemBuilder: (_, i) => _TransactionTile(tx: _transactions[i]),
                  ),
          ),
        ],
      ),
    );
  }
}

class _DemoTx {
  final TxType type;
  final String symbol;
  final double amount;
  final String chain;
  final String time;
  final String hash;
  final String? swapTo;
  const _DemoTx({required this.type, required this.symbol, required this.amount, required this.chain, required this.time, required this.hash, this.swapTo});
}

class _TransactionTile extends StatelessWidget {
  final _DemoTx tx;
  const _TransactionTile({required this.tx});

  IconData get _icon {
    switch (tx.type) {
      case TxType.send: return Icons.arrow_outward;
      case TxType.receive: return Icons.arrow_downward;
      case TxType.swap: return Icons.swap_horiz;
    }
  }

  Color get _iconColor {
    switch (tx.type) {
      case TxType.send: return AppColors.destructive;
      case TxType.receive: return AppColors.success;
      case TxType.swap: return AppColors.accent;
    }
  }

  String get _label {
    switch (tx.type) {
      case TxType.send: return 'Sent';
      case TxType.receive: return 'Received';
      case TxType.swap: return 'Swapped';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(borderRadius: BorderRadius.circular(12)),
      child: Row(
        children: [
          Container(
            width: 40, height: 40,
            decoration: BoxDecoration(shape: BoxShape.circle, color: _iconColor.withOpacity(0.1)),
            child: Icon(_icon, size: 18, color: _iconColor),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('$_label ${tx.symbol}${tx.swapTo != null ? ' → ${tx.swapTo}' : ''}', style: const TextStyle(fontWeight: FontWeight.w500)),
                Text('${tx.chain} • ${tx.time}', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('${tx.type == TxType.send ? "-" : "+"}${tx.amount} ${tx.symbol}', style: TextStyle(fontWeight: FontWeight.w600, color: tx.type == TxType.send ? AppColors.destructive : AppColors.success)),
              Icon(Icons.open_in_new, size: 12, color: AppColors.textMuted),
            ],
          ),
        ],
      ),
    );
  }
}
