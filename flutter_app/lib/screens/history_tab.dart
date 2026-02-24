import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:timetrade_wallet/services/blockchain_service.dart';
import 'package:timetrade_wallet/theme/app_theme.dart';
import 'package:intl/intl.dart';

class HistoryTab extends StatelessWidget {
  const HistoryTab({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<BlockchainService>(
      builder: (context, blockchain, _) {
        final txs = blockchain.transactions;

        return SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsets.fromLTRB(16, 16, 16, 12),
                child: Text('Transaction History', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
              ),
              Expanded(
                child: txs.isEmpty
                    ? const Center(child: Text('No transactions yet', style: TextStyle(color: AppColors.mutedForeground)))
                    : ListView.builder(
                        padding: const EdgeInsets.only(bottom: 100),
                        itemCount: txs.length,
                        itemBuilder: (_, i) {
                          final tx = txs[i];
                          final isSend = tx.type == 'send';
                          return ListTile(
                            leading: Container(
                              width: 40, height: 40,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: (isSend ? AppColors.destructive : AppColors.success).withOpacity(0.1),
                              ),
                              child: Icon(
                                isSend ? Icons.arrow_upward : Icons.arrow_downward,
                                color: isSend ? AppColors.destructive : AppColors.success,
                                size: 20,
                              ),
                            ),
                            title: Text(
                              isSend ? 'Sent ${tx.symbol}' : 'Received ${tx.symbol}',
                              style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
                            ),
                            subtitle: Text(
                              DateFormat('MMM d, yyyy HH:mm').format(tx.timestamp),
                              style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground),
                            ),
                            trailing: Text(
                              '${isSend ? "-" : "+"}${tx.amount.toStringAsFixed(4)}',
                              style: TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 14,
                                color: isSend ? AppColors.destructive : AppColors.success,
                              ),
                            ),
                          );
                        },
                      ),
              ),
            ],
          ),
        );
      },
    );
  }
}
