import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../models/wallet_account.dart';
import '../../theme/app_theme.dart';
import '../../models/token.dart';
import '../../services/wallet_service.dart';
import '../../services/blockchain_service.dart';

enum SendStep { network, asset, address, amount, confirm, success }

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
  SendStep _step = SendStep.network;
  String _selectedChain = 'ethereum';
  Token? _selectedToken;
  String _recipientAddress = '';
  String _amount = '';
  double _gasFee = 0.0012;
  String? _txHash;
  
  // Asset fetching state
  List<Token> _chainAssets = [];
  bool _isLoadingAssets = false;
  String? _assetsError;

  final TextEditingController _addressController = TextEditingController();
  final BlockchainService _blockchainService = BlockchainService();

  @override
  void initState() {
    super.initState();
    if (widget.preSelectedAsset != null) {
      _selectedToken = widget.preSelectedAsset;
      _selectedChain = widget.preSelectedAsset!.chain.name;
      _step = SendStep.address;
    }
  }

  @override
  void dispose() {
    _addressController.dispose();
    super.dispose();
  }

  void _handleBack() {
    switch (_step) {
      case SendStep.asset:
        setState(() => _step = SendStep.network);
        break;
      case SendStep.address:
        if (widget.preSelectedAsset != null) {
          widget.onClose();
        } else {
          setState(() => _step = SendStep.asset);
        }
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
      case SendStep.network:
        return 'Select Network';
      case SendStep.asset:
        return 'Select Asset';
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

  Future<void> _fetchAssetsForChain(String chain) async {
    setState(() {
      _isLoadingAssets = true;
      _assetsError = null;
      _chainAssets = [];
    });

    try {
      final walletService = context.read<WalletService>();
      String? address;
      
      if (chain == 'solana') {
        address = walletService.solanaAddress;
      } else if (chain == 'tron') {
        address = walletService.tronAddress;
      } else {
        address = walletService.evmAddress;
      }

      if (address == null || address.isEmpty) {
        setState(() {
          _isLoadingAssets = false;
          _chainAssets = [];
        });
        return;
      }

      final allTokens = await _blockchainService.fetchAllBalances(
        evmAddress: chain != 'solana' && chain != 'tron' ? address : null,
        solanaAddress: chain == 'solana' ? address : null,
        tronAddress: chain == 'tron' ? address : null,
      );

      // Filter tokens by chain
      final chainType = _getChainType(chain);
      final filtered = allTokens.where((t) => t.chain == chainType).toList();

      setState(() {
        _isLoadingAssets = false;
        _chainAssets = filtered;
      });
    } catch (e) {
      debugPrint('[SEND] Error fetching assets: $e');
      setState(() {
        _isLoadingAssets = false;
        _assetsError = 'Failed to load assets';
      });
    }
  }

  ChainType _getChainType(String chain) {
    switch (chain) {
      case 'ethereum':
        return ChainType.ethereum;
      case 'arbitrum':
        return ChainType.arbitrum;
      case 'polygon':
        return ChainType.polygon;
      case 'solana':
        return ChainType.solana;
      case 'tron':
        return ChainType.tron;
      default:
        return ChainType.ethereum;
    }
  }

  Future<void> _pasteFromClipboard() async {
    try {
      final data = await Clipboard.getData(Clipboard.kTextPlain);
      if (data?.text != null && data!.text!.isNotEmpty) {
        setState(() {
          _recipientAddress = data.text!.trim();
          _addressController.text = _recipientAddress;
        });
      }
    } catch (e) {
      debugPrint('[SEND] Clipboard paste error: $e');
    }
  }

  void _openQRScanner() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _QRScannerSheet(
        onScanned: (address) {
          Navigator.pop(ctx);
          setState(() {
            _recipientAddress = address.trim();
            _addressController.text = _recipientAddress;
          });
        },
      ),
    );
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
                  if (_step != SendStep.network)
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
                  if (_step != SendStep.network)
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
      case SendStep.network:
        return _buildNetworkSelector();
      case SendStep.asset:
        return _buildAssetSelector();
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

  Widget _buildNetworkSelector() {
    final chains = ['ethereum', 'arbitrum', 'polygon', 'solana', 'tron'];
    
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
              onPressed: () {
                _fetchAssetsForChain(_selectedChain);
                setState(() => _step = SendStep.asset);
              },
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

  Widget _buildAssetSelector() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Available Assets on ${_getChainName(_selectedChain)}',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppTheme.mutedForeground,
            ),
          ),
          const SizedBox(height: 16),
          
          Expanded(
            child: _isLoadingAssets
                ? const Center(
                    child: CircularProgressIndicator(color: AppTheme.primary),
                  )
                : _assetsError != null
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.error_outline,
                              size: 48,
                              color: AppTheme.mutedForeground,
                            ),
                            const SizedBox(height: 16),
                            Text(
                              _assetsError!,
                              style: TextStyle(color: AppTheme.mutedForeground),
                            ),
                          ],
                        ),
                      )
                    : _chainAssets.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.account_balance_wallet_outlined,
                                  size: 48,
                                  color: AppTheme.mutedForeground,
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  'No assets found on ${_getChainName(_selectedChain)}',
                                  style: TextStyle(
                                    fontSize: 16,
                                    color: AppTheme.mutedForeground,
                                  ),
                                  textAlign: TextAlign.center,
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'Fund your wallet to send tokens',
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: AppTheme.mutedForeground.withOpacity(0.7),
                                  ),
                                  textAlign: TextAlign.center,
                                ),
                              ],
                            ),
                          )
                        : ListView.builder(
                            itemCount: _chainAssets.length,
                            itemBuilder: (context, index) {
                              final token = _chainAssets[index];
                              return GestureDetector(
                                onTap: () {
                                  setState(() {
                                    _selectedToken = token;
                                    _step = SendStep.address;
                                  });
                                },
                                child: Container(
                                  margin: const EdgeInsets.only(bottom: 8),
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    color: AppTheme.card,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(color: AppTheme.border),
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
                                            'https://api.elbstream.com/logos/crypto/${token.symbol.toLowerCase()}',
                                            fit: BoxFit.contain,
                                            errorBuilder: (_, __, ___) => Center(
                                              child: Text(
                                                token.symbol[0],
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
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              token.symbol,
                                              style: const TextStyle(
                                                fontWeight: FontWeight.w600,
                                                color: AppTheme.foreground,
                                              ),
                                            ),
                                            Text(
                                              '${token.balance.toStringAsFixed(4)} available',
                                              style: TextStyle(
                                                fontSize: 12,
                                                color: AppTheme.mutedForeground,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      Text(
                                        '\$${token.usdValue.toStringAsFixed(2)}',
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w500,
                                          color: AppTheme.foreground,
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      const Icon(
                                        Icons.chevron_right,
                                        color: AppTheme.mutedForeground,
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
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
              controller: _addressController,
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
                      onPressed: _openQRScanner,
                      tooltip: 'Scan QR Code',
                    ),
                    IconButton(
                      icon: const Icon(Icons.paste, color: AppTheme.mutedForeground),
                      onPressed: _pasteFromClipboard,
                      tooltip: 'Paste from Clipboard',
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
    final tokenSymbol = _selectedToken?.symbol ?? 'ETH';
    
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
            tokenSymbol,
            style: TextStyle(
              fontSize: 20,
              color: AppTheme.mutedForeground,
            ),
          ),
          
          if (_selectedToken != null) ...[
            const SizedBox(height: 8),
            Text(
              'Available: ${_selectedToken!.balance.toStringAsFixed(4)} $tokenSymbol',
              style: TextStyle(
                fontSize: 14,
                color: AppTheme.mutedForeground,
              ),
            ),
          ],
          
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
    final tokenSymbol = _selectedToken?.symbol ?? 'ETH';
    
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
            '$_amount $tokenSymbol',
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
                _buildDetailRow('Network Fee', '~${_gasFee.toStringAsFixed(4)} ${_getNativeFeeSymbol()}'),
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
    final tokenSymbol = _selectedToken?.symbol ?? 'ETH';
    
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
            '$_amount $tokenSymbol sent successfully',
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
      case 'arbitrum': return 'arb';
      case 'polygon': return 'matic';
      case 'solana': return 'sol';
      case 'tron': return 'trx';
      default: return chain;
    }
  }

  String _getChainName(String chain) {
    switch (chain) {
      case 'ethereum': return 'Ethereum';
      case 'arbitrum': return 'Arbitrum One';
      case 'polygon': return 'Polygon';
      case 'solana': return 'Solana';
      case 'tron': return 'Tron';
      default: return chain;
    }
  }

  String _getNativeFeeSymbol() {
    switch (_selectedChain) {
      case 'ethereum':
      case 'arbitrum':
        return 'ETH';
      case 'polygon':
        return 'POL';
      case 'solana':
        return 'SOL';
      case 'tron':
        return 'TRX';
      default:
        return 'ETH';
    }
  }
}

/// QR Scanner Sheet
class _QRScannerSheet extends StatefulWidget {
  final Function(String) onScanned;

  const _QRScannerSheet({required this.onScanned});

  @override
  State<_QRScannerSheet> createState() => _QRScannerSheetState();
}

class _QRScannerSheetState extends State<_QRScannerSheet> {
  bool _hasScanned = false;

  void _handleBarcode(BarcodeCapture capture) {
    if (_hasScanned) return;
    
    final barcodes = capture.barcodes;
    if (barcodes.isNotEmpty && barcodes.first.rawValue != null) {
      _hasScanned = true;
      String value = barcodes.first.rawValue!;
      
      // Strip common URI prefixes
      if (value.startsWith('ethereum:')) {
        value = value.substring(9).split('@').first.split('?').first;
      } else if (value.startsWith('solana:')) {
        value = value.substring(7).split('?').first;
      } else if (value.startsWith('tron:')) {
        value = value.substring(5).split('?').first;
      }
      
      widget.onScanned(value);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.7,
      decoration: const BoxDecoration(
        color: AppTheme.background,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          Container(
            width: 40,
            height: 4,
            margin: const EdgeInsets.only(top: 12),
            decoration: BoxDecoration(
              color: AppTheme.border,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                const Expanded(
                  child: Text(
                    'Scan QR Code',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.foreground,
                    ),
                  ),
                ),
                GestureDetector(
                  onTap: () => Navigator.pop(context),
                  child: const Icon(Icons.close, color: AppTheme.mutedForeground),
                ),
              ],
            ),
          ),
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: MobileScanner(
                    onDetect: _handleBarcode,
                  ),
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(24),
            child: Text(
              'Point camera at wallet QR code',
              style: TextStyle(
                color: AppTheme.mutedForeground,
              ),
              textAlign: TextAlign.center,
            ),
          ),
        ],
      ),
    );
  }
}
