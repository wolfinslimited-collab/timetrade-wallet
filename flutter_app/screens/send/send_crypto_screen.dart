import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import '../../models/token.dart';

enum SendStep { select, address, amount, confirm, success }

class SendCryptoSheet extends StatefulWidget {
  final Token? preSelectedAsset;
  final VoidCallback onClose;

  const SendCryptoSheet({
    super.key,
    this.preSelectedAsset,
    required this.onClose,
  });

  @override
  State<SendCryptoSheet> createState() => _SendCryptoSheetState();
}

class _SendCryptoSheetState extends State<SendCryptoSheet> {
  SendStep _step = SendStep.select;
  String _selectedChain = 'ethereum';
  Token? _selectedToken;
  String _recipientAddress = '';
  String _amount = '';
  double _gasFee = 0.0012;
  String? _txHash;

  @override
  void initState() {
    super.initState();
    if (widget.preSelectedAsset != null) {
      _selectedToken = widget.preSelectedAsset;
      _selectedChain = widget.preSelectedAsset!.chain;
      _step = SendStep.address;
    }
  }

  void _handleBack() {
    switch (_step) {
      case SendStep.address:
        setState(() => _step = SendStep.select);
        break;
      case SendStep.amount:
        setState(() => _step = SendStep.address);
        break;
      case SendStep.confirm:
        setState(() => _step = SendStep.amount);
        break;
      default:
        break;
    }
  }

  String _getStepTitle() {
    switch (_step) {
      case SendStep.select:
        return 'Send Crypto';
      case SendStep.address:
        return 'Recipient Address';
      case SendStep.amount:
        return 'Enter Amount';
      case SendStep.confirm:
        return 'Confirm Transaction';
      case SendStep.success:
        return 'Transaction Sent';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.9,
      decoration: const BoxDecoration(
        color: AppTheme.background,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Handle
          Container(
            width: 40,
            height: 4,
            margin: const EdgeInsets.only(top: 12),
            decoration: BoxDecoration(
              color: AppTheme.border,
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          // Header (hidden on confirm/success)
          if (_step != SendStep.confirm && _step != SendStep.success)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  if (_step != SendStep.select)
                    GestureDetector(
                      onTap: _handleBack,
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
                  Expanded(
                    child: Text(
                      _getStepTitle(),
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.foreground,
                      ),
                    ),
                  ),
                  if (_step != SendStep.select)
                    const SizedBox(width: 40)
                  else
                    GestureDetector(
                      onTap: widget.onClose,
                      child: const Icon(
                        Icons.close,
                        color: AppTheme.mutedForeground,
                      ),
                    ),
                ],
              ),
            ),

          // Content
          Expanded(
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 200),
              child: _buildStepContent(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStepContent() {
    switch (_step) {
      case SendStep.select:
        return _buildNetworkAssetSelector();
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

  Widget _buildNetworkAssetSelector() {
    final chains = ['ethereum', 'polygon', 'solana', 'tron'];
    
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Select Network',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppTheme.mutedForeground,
            ),
          ),
          const SizedBox(height: 12),
          ...chains.map((chain) {
            final isSelected = _selectedChain == chain;
            return GestureDetector(
              onTap: () => setState(() => _selectedChain = chain),
              child: Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isSelected ? AppTheme.primary.withOpacity(0.1) : AppTheme.card,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isSelected ? AppTheme.primary : AppTheme.border,
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: AppTheme.secondary,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(20),
                        child: Image.network(
                          'https://api.elbstream.com/logos/crypto/${_getChainSymbol(chain)}',
                          fit: BoxFit.contain,
                          errorBuilder: (_, __, ___) => Center(
                            child: Text(
                              chain[0].toUpperCase(),
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                color: AppTheme.foreground,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        _getChainName(chain),
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          color: AppTheme.foreground,
                        ),
                      ),
                    ),
                    if (isSelected)
                      const Icon(Icons.check_circle, color: AppTheme.primary),
                  ],
                ),
              ),
            );
          }).toList(),
          
          const SizedBox(height: 24),
          
          SizedBox(
            width: double.infinity,
            height: 56,
            child: ElevatedButton(
              onPressed: () => setState(() => _step = SendStep.address),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              child: const Text(
                'Continue',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.primaryForeground,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAddressInput() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Recipient Address',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppTheme.mutedForeground,
            ),
          ),
          const SizedBox(height: 12),
          Container(
            decoration: BoxDecoration(
              color: AppTheme.card,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.border),
            ),
            child: TextField(
              onChanged: (value) => setState(() => _recipientAddress = value),
              style: const TextStyle(color: AppTheme.foreground, fontFamily: 'monospace'),
              decoration: InputDecoration(
                hintText: 'Enter or paste address',
                hintStyle: TextStyle(color: AppTheme.mutedForeground),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.all(16),
                suffixIcon: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.qr_code_scanner, color: AppTheme.primary),
                      onPressed: () {/* Open QR scanner */},
                    ),
                    IconButton(
                      icon: const Icon(Icons.paste, color: AppTheme.mutedForeground),
                      onPressed: () {/* Paste from clipboard */},
                    ),
                  ],
                ),
              ),
            ),
          ),
          
          const Spacer(),
          
          SizedBox(
            width: double.infinity,
            height: 56,
            child: ElevatedButton(
              onPressed: _recipientAddress.isNotEmpty 
                  ? () => setState(() => _step = SendStep.amount)
                  : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                disabledBackgroundColor: AppTheme.muted,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              child: const Text(
                'Continue',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.primaryForeground,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAmountInput() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          const Spacer(),
          
          // Amount display
          Text(
            _amount.isEmpty ? '0' : _amount,
            style: const TextStyle(
              fontSize: 56,
              fontWeight: FontWeight.bold,
              color: AppTheme.foreground,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'ETH',
            style: TextStyle(
              fontSize: 20,
              color: AppTheme.mutedForeground,
            ),
          ),
          
          const Spacer(),
          
          // Numpad
          _buildNumpad(),
          
          const SizedBox(height: 16),
          
          SizedBox(
            width: double.infinity,
            height: 56,
            child: ElevatedButton(
              onPressed: _amount.isNotEmpty 
                  ? () => setState(() => _step = SendStep.confirm)
                  : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                disabledBackgroundColor: AppTheme.muted,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              child: const Text(
                'Preview',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.primaryForeground,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNumpad() {
    final keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];
    
    return GridView.count(
      shrinkWrap: true,
      crossAxisCount: 3,
      mainAxisSpacing: 8,
      crossAxisSpacing: 8,
      childAspectRatio: 1.5,
      physics: const NeverScrollableScrollPhysics(),
      children: keys.map((key) {
        return GestureDetector(
          onTap: () {
            setState(() {
              if (key == 'del') {
                if (_amount.isNotEmpty) {
                  _amount = _amount.substring(0, _amount.length - 1);
                }
              } else if (key == '.' && _amount.contains('.')) {
                // Don't add another decimal
              } else {
                _amount += key;
              }
            });
          },
          child: Container(
            decoration: BoxDecoration(
              color: AppTheme.card,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Center(
              child: key == 'del'
                  ? const Icon(Icons.backspace_outlined, color: AppTheme.foreground)
                  : Text(
                      key,
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w500,
                        color: AppTheme.foreground,
                      ),
                    ),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildConfirmation() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Header
          Row(
            children: [
              GestureDetector(
                onTap: _handleBack,
                child: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: AppTheme.card,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppTheme.border),
                  ),
                  child: const Icon(Icons.chevron_left, color: AppTheme.foreground),
                ),
              ),
              const Expanded(
                child: Text(
                  'Confirm Transaction',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.foreground,
                  ),
                ),
              ),
              const SizedBox(width: 40),
            ],
          ),
          
          const SizedBox(height: 32),
          
          // Amount
          Text(
            '$_amount ETH',
            style: const TextStyle(
              fontSize: 36,
              fontWeight: FontWeight.bold,
              color: AppTheme.foreground,
            ),
          ),
          
          const SizedBox(height: 32),
          
          // Details
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.card,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppTheme.border),
            ),
            child: Column(
              children: [
                _buildDetailRow('To', _formatAddress(_recipientAddress)),
                const Divider(height: 24, color: AppTheme.border),
                _buildDetailRow('Network', _getChainName(_selectedChain)),
                const Divider(height: 24, color: AppTheme.border),
                _buildDetailRow('Network Fee', '~${_gasFee.toStringAsFixed(4)} ETH'),
              ],
            ),
          ),
          
          const Spacer(),
          
          SizedBox(
            width: double.infinity,
            height: 56,
            child: ElevatedButton(
              onPressed: () {
                // Simulate transaction
                setState(() {
                  _txHash = '0x${DateTime.now().millisecondsSinceEpoch.toRadixString(16)}';
                  _step = SendStep.success;
                });
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              child: const Text(
                'Sign & Send',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.primaryForeground,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSuccess() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: AppTheme.success.withOpacity(0.1),
              borderRadius: BorderRadius.circular(40),
            ),
            child: const Icon(
              Icons.check_circle,
              size: 48,
              color: AppTheme.success,
            ),
          ),
          
          const SizedBox(height: 24),
          
          const Text(
            'Transaction Sent!',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: AppTheme.foreground,
            ),
          ),
          
          const SizedBox(height: 8),
          
          Text(
            '$_amount ETH sent successfully',
            style: TextStyle(
              fontSize: 16,
              color: AppTheme.mutedForeground,
            ),
          ),
          
          if (_txHash != null) ...[
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.card,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Transaction Hash',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppTheme.mutedForeground,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _formatAddress(_txHash!),
                    style: const TextStyle(
                      fontFamily: 'monospace',
                      color: AppTheme.foreground,
                    ),
                  ),
                ],
              ),
            ),
          ],
          
          const Spacer(),
          
          SizedBox(
            width: double.infinity,
            height: 56,
            child: ElevatedButton(
              onPressed: widget.onClose,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              child: const Text(
                'Done',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.primaryForeground,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            color: AppTheme.mutedForeground,
          ),
        ),
        Text(
          value,
          style: const TextStyle(
            fontWeight: FontWeight.w500,
            color: AppTheme.foreground,
          ),
        ),
      ],
    );
  }

  String _formatAddress(String address) {
    if (address.length < 12) return address;
    return '${address.substring(0, 8)}...${address.substring(address.length - 6)}';
  }

  String _getChainSymbol(String chain) {
    switch (chain) {
      case 'ethereum': return 'eth';
      case 'polygon': return 'matic';
      case 'solana': return 'sol';
      case 'tron': return 'trx';
      default: return chain;
    }
  }

  String _getChainName(String chain) {
    switch (chain) {
      case 'ethereum': return 'Ethereum';
      case 'polygon': return 'Polygon';
      case 'solana': return 'Solana';
      case 'tron': return 'Tron';
      default: return chain;
    }
  }
}
