import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/config/networks.dart';

enum SendStep { selectNetwork, selectAsset, address, amount, confirm, success }

class SendScreen extends StatefulWidget {
  const SendScreen({super.key});
  @override
  State<SendScreen> createState() => _SendScreenState();
}

class _SendScreenState extends State<SendScreen> {
  SendStep _step = SendStep.selectNetwork;
  String? _selectedNetwork;
  String _recipient = '';
  String _amount = '';
  final _addressController = TextEditingController();
  final _amountController = TextEditingController();

  String get _title {
    switch (_step) {
      case SendStep.selectNetwork: return 'Send Crypto';
      case SendStep.selectAsset: return 'Select Asset';
      case SendStep.address: return 'Recipient Address';
      case SendStep.amount: return 'Enter Amount';
      case SendStep.confirm: return 'Confirm Transaction';
      case SendStep.success: return 'Transaction Sent';
    }
  }

  void _back() {
    switch (_step) {
      case SendStep.selectNetwork: context.go('/'); break;
      case SendStep.selectAsset: setState(() => _step = SendStep.selectNetwork); break;
      case SendStep.address: setState(() => _step = SendStep.selectNetwork); break;
      case SendStep.amount: setState(() => _step = SendStep.address); break;
      case SendStep.confirm: setState(() => _step = SendStep.amount); break;
      case SendStep.success: context.go('/'); break;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  if (_step != SendStep.success)
                    GestureDetector(
                      onTap: _back,
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(shape: BoxShape.circle, color: AppColors.card, border: Border.all(color: AppColors.border)),
                        child: const Icon(Icons.chevron_left, size: 20),
                      ),
                    ),
                  const SizedBox(width: 12),
                  Text(_title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
                ],
              ),
            ),

            // Content
            Expanded(child: _buildStep()),
          ],
        ),
      ),
    );
  }

  Widget _buildStep() {
    switch (_step) {
      case SendStep.selectNetwork:
      case SendStep.selectAsset:
        return _buildNetworkGrid();
      case SendStep.address:
        return _buildAddressInput();
      case SendStep.amount:
        return _buildAmountInput();
      case SendStep.confirm:
        return _buildConfirmation();
      case SendStep.success:
        return _buildSuccess();
    }
  }

  Widget _buildNetworkGrid() {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Select Network', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textMuted, letterSpacing: 1.5)),
          const SizedBox(height: 16),
          GridView.count(
            crossAxisCount: 3,
            shrinkWrap: true,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            physics: const NeverScrollableScrollPhysics(),
            children: networks.map((net) {
              return GestureDetector(
                onTap: () {
                  setState(() {
                    _selectedNetwork = net.id;
                    _step = SendStep.address;
                  });
                },
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    color: AppColors.surfaceLight.withOpacity(0.3),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 40, height: 40,
                        decoration: BoxDecoration(shape: BoxShape.circle, color: Color(net.color).withOpacity(0.1)),
                        child: ClipOval(
                          child: CachedNetworkImage(imageUrl: net.logoUrl, width: 40, height: 40, fit: BoxFit.contain,
                            errorWidget: (_, __, ___) => Center(child: Text(net.symbol, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700)))),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(net.name, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500), textAlign: TextAlign.center),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(width: 6, height: 6, decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.green)),
                          const SizedBox(width: 4),
                          Text(net.symbol, style: TextStyle(fontSize: 10, color: AppColors.textMuted)),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildAddressInput() {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Recipient Address', style: TextStyle(fontSize: 14, color: AppColors.textSecondary)),
          const SizedBox(height: 12),
          TextField(
            controller: _addressController,
            decoration: InputDecoration(
              hintText: 'Enter wallet address',
              suffixIcon: IconButton(
                icon: const Icon(Icons.qr_code_scanner, size: 20),
                onPressed: () {}, // TODO: QR scanner
              ),
            ),
            onChanged: (v) => setState(() => _recipient = v),
          ),
          const SizedBox(height: 16),
          // Saved addresses placeholder
          Text('SAVED ADDRESSES', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textMuted, letterSpacing: 1.5)),
          const SizedBox(height: 8),
          Center(child: Text('No saved addresses yet', style: TextStyle(color: AppColors.textMuted, fontSize: 13))),
          const Spacer(),
          SizedBox(
            width: double.infinity, height: 56,
            child: ElevatedButton(
              onPressed: _recipient.length > 10 ? () => setState(() => _step = SendStep.amount) : null,
              child: const Text('Continue'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAmountInput() {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Amount', style: TextStyle(fontSize: 14, color: AppColors.textSecondary)),
          const SizedBox(height: 12),
          TextField(
            controller: _amountController,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: InputDecoration(
              hintText: '0.00',
              suffixIcon: TextButton(onPressed: () {}, child: Text('MAX', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600))),
            ),
            onChanged: (v) => setState(() => _amount = v),
          ),
          const SizedBox(height: 8),
          Text('Balance: 0.00 ${getNetwork(_selectedNetwork ?? 'ethereum').symbol}', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
          const SizedBox(height: 24),
          // Fee estimate
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Estimated Fee', style: TextStyle(color: AppColors.textSecondary)),
                Text('~\$0.50', style: TextStyle(fontWeight: FontWeight.w500)),
              ],
            ),
          ),
          const Spacer(),
          SizedBox(
            width: double.infinity, height: 56,
            child: ElevatedButton(
              onPressed: _amount.isNotEmpty && (double.tryParse(_amount) ?? 0) > 0 ? () => setState(() => _step = SendStep.confirm) : null,
              child: const Text('Review Transaction'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildConfirmation() {
    final net = getNetwork(_selectedNetwork ?? 'ethereum');
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          const SizedBox(height: 32),
          // Amount display
          Text(_amount, style: const TextStyle(fontSize: 48, fontWeight: FontWeight.w700)),
          Text(net.symbol, style: TextStyle(fontSize: 18, color: AppColors.textMuted)),
          const SizedBox(height: 32),

          // Details card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.border)),
            child: Column(
              children: [
                _DetailRow(label: 'To', value: _recipient.length > 20 ? '${_recipient.substring(0, 8)}...${_recipient.substring(_recipient.length - 6)}' : _recipient),
                const Divider(height: 24, color: AppColors.border),
                _DetailRow(label: 'Network', value: net.name),
                const Divider(height: 24, color: AppColors.border),
                _DetailRow(label: 'Network Fee', value: '~\$0.50'),
              ],
            ),
          ),

          const Spacer(),
          SizedBox(
            width: double.infinity, height: 56,
            child: ElevatedButton(
              onPressed: () => setState(() => _step = SendStep.success),
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
              child: const Text('Confirm & Send'),
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity, height: 56,
            child: OutlinedButton(
              onPressed: _back,
              child: const Text('Cancel'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSuccess() {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 96, height: 96,
            decoration: BoxDecoration(shape: BoxShape.circle, color: AppColors.primary.withOpacity(0.2)),
            child: const Icon(Icons.check, size: 48, color: AppColors.primary),
          ),
          const SizedBox(height: 24),
          const Text('Transaction Sent!', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Text('Your transaction has been broadcast to the network.', style: TextStyle(color: AppColors.textSecondary), textAlign: TextAlign.center),
          const SizedBox(height: 32),
          OutlinedButton.icon(
            onPressed: () {}, // TODO: Open explorer
            icon: const Icon(Icons.open_in_new, size: 16),
            label: const Text('View on Explorer'),
          ),
          const SizedBox(height: 48),
          SizedBox(
            width: double.infinity, height: 56,
            child: ElevatedButton(
              onPressed: () => context.go('/'),
              child: const Text('Back to Wallet'),
            ),
          ),
        ],
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;
  const _DetailRow({required this.label, required this.value});
  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(color: AppColors.textSecondary)),
        Text(value, style: const TextStyle(fontWeight: FontWeight.w500)),
      ],
    );
  }
}
