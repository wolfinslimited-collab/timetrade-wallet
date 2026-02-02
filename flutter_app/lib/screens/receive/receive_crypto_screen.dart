import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../theme/app_theme.dart';
import '../../services/wallet_service.dart';

class TokenOption {
  final String symbol;
  final String name;
  final String network;
  final String networkId;
  final String addressKey;

  TokenOption({
    required this.symbol,
    required this.name,
    required this.network,
    required this.networkId,
    required this.addressKey,
  });
}

class ReceiveCryptoSheet extends StatefulWidget {
  final String? preSelectedSymbol;
  final String? preSelectedChain;
  final VoidCallback onClose;

  const ReceiveCryptoSheet({
    super.key,
    this.preSelectedSymbol,
    this.preSelectedChain,
    required this.onClose,
  });

  @override
  State<ReceiveCryptoSheet> createState() => _ReceiveCryptoSheetState();
}

class _ReceiveCryptoSheetState extends State<ReceiveCryptoSheet> {
  bool _showTokens = false;
  bool _copied = false;
  late TokenOption _selectedToken;

  final List<TokenOption> _tokens = [
    TokenOption(
      symbol: 'ETH',
      name: 'Ethereum',
      network: 'Ethereum Mainnet',
      networkId: 'ethereum',
      addressKey: 'evm',
    ),
    TokenOption(
      symbol: 'POL',
      name: 'Polygon',
      network: 'Polygon Mainnet',
      networkId: 'polygon',
      addressKey: 'evm',
    ),
    TokenOption(
      symbol: 'SOL',
      name: 'Solana',
      network: 'Solana Mainnet',
      networkId: 'solana',
      addressKey: 'solana',
    ),
    TokenOption(
      symbol: 'TRX',
      name: 'Tron',
      network: 'Tron Mainnet',
      networkId: 'tron',
      addressKey: 'tron',
    ),
    TokenOption(
      symbol: 'BTC',
      name: 'Bitcoin',
      network: 'Bitcoin Network',
      networkId: 'bitcoin',
      addressKey: 'btc',
    ),
  ];

  @override
  void initState() {
    super.initState();
    _selectedToken = _findInitialToken();
  }

  TokenOption _findInitialToken() {
    if (widget.preSelectedChain != null) {
      final match = _tokens.firstWhere(
        (t) => t.networkId == widget.preSelectedChain,
        orElse: () => _tokens.first,
      );
      return match;
    }
    return _tokens.first;
  }

  /// Get the current address from WalletService Provider (matching web useWalletAddresses hook)
  String _getCurrentAddress(WalletService walletService) {
    final activeAccount = walletService.activeAccount;
    if (activeAccount == null) return '';
    
    switch (_selectedToken.addressKey) {
      case 'evm':
        return activeAccount.evmAddress ?? '';
      case 'solana':
        return activeAccount.solanaAddress ?? '';
      case 'tron':
        return activeAccount.tronAddress ?? '';
      case 'btc':
        return activeAccount.btcAddress ?? '';
      default:
        return '';
    }
  }

  

  String _getCryptoLogoUrl(String symbol) {
    return 'https://api.elbstream.com/logos/crypto/${symbol.toLowerCase()}';
  }

  Future<void> _handleCopy(String address) async {
    if (address.isEmpty) return;
    
    await Clipboard.setData(ClipboardData(text: address));
    setState(() => _copied = true);
    
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Address copied to clipboard'),
        duration: Duration(seconds: 2),
      ),
    );
    
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) setState(() => _copied = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    final walletService = context.watch<WalletService>();
    final _currentAddress = _getCurrentAddress(walletService);
    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
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

          // Header
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                const Expanded(
                  child: Text(
                    'Receive Crypto',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.foreground,
                    ),
                  ),
                ),
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

          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                children: [
                  // Token Selector
                  GestureDetector(
                    onTap: () => setState(() => _showTokens = !_showTokens),
                    child: Container(
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
                                _getCryptoLogoUrl(_selectedToken.symbol),
                                fit: BoxFit.contain,
                                errorBuilder: (_, __, ___) => Center(
                                  child: Text(
                                    _selectedToken.symbol[0],
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
                                  _selectedToken.symbol,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w600,
                                    color: AppTheme.foreground,
                                  ),
                                ),
                                Text(
                                  _selectedToken.network,
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: AppTheme.mutedForeground,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Icon(
                            _showTokens ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                            color: AppTheme.mutedForeground,
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Token Dropdown
                  if (_showTokens)
                    Container(
                      margin: const EdgeInsets.only(top: 8),
                      decoration: BoxDecoration(
                        color: AppTheme.card,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.border),
                      ),
                      child: Column(
                        children: _tokens.map((token) {
                          final isSelected = token.symbol == _selectedToken.symbol &&
                              token.networkId == _selectedToken.networkId;
                          return GestureDetector(
                            onTap: () {
                              setState(() {
                                _selectedToken = token;
                                _showTokens = false;
                              });
                            },
                            child: Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: isSelected ? AppTheme.primary.withOpacity(0.1) : Colors.transparent,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    width: 32,
                                    height: 32,
                                    decoration: BoxDecoration(
                                      color: AppTheme.secondary,
                                      borderRadius: BorderRadius.circular(16),
                                    ),
                                    child: ClipRRect(
                                      borderRadius: BorderRadius.circular(16),
                                      child: Image.network(
                                        _getCryptoLogoUrl(token.symbol),
                                        fit: BoxFit.contain,
                                        errorBuilder: (_, __, ___) => Center(
                                          child: Text(
                                            token.symbol[0],
                                            style: const TextStyle(
                                              fontSize: 12,
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
                                            fontSize: 14,
                                            fontWeight: FontWeight.w500,
                                            color: AppTheme.foreground,
                                          ),
                                        ),
                                        Text(
                                          token.network,
                                          style: TextStyle(
                                            fontSize: 12,
                                            color: AppTheme.mutedForeground,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  if (isSelected)
                                    const Icon(Icons.check, color: AppTheme.primary, size: 20),
                                ],
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                    ),

                  const SizedBox(height: 24),

                  // QR Code with centered logo overlay
                  if (_currentAddress.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          QrImageView(
                            data: _currentAddress,
                            version: QrVersions.auto,
                            size: 200,
                            backgroundColor: Colors.white,
                            errorCorrectionLevel: QrErrorCorrectLevel.H,
                          ),
                          // Center logo overlay
                          Container(
                            width: 56,
                            height: 56,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(12),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.1),
                                  blurRadius: 4,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            padding: const EdgeInsets.all(4),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: Image.network(
                                _getCryptoLogoUrl(_selectedToken.symbol),
                                fit: BoxFit.contain,
                                errorBuilder: (_, __, ___) => Container(
                                  color: AppTheme.secondary,
                                  child: Center(
                                    child: Text(
                                      _selectedToken.symbol[0],
                                      style: const TextStyle(
                                        fontSize: 20,
                                        fontWeight: FontWeight.bold,
                                        color: AppTheme.foreground,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    )
                  else
                    Container(
                      padding: const EdgeInsets.all(32),
                      child: Column(
                        children: [
                          Icon(
                            Icons.qr_code_2,
                            size: 64,
                            color: AppTheme.mutedForeground,
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'Loading wallet address...',
                            style: TextStyle(color: AppTheme.mutedForeground),
                          ),
                        ],
                      ),
                    ),

                  const SizedBox(height: 16),

                  Text(
                    'Scan QR code to receive ${_selectedToken.symbol}',
                    style: TextStyle(
                      fontSize: 14,
                      color: AppTheme.mutedForeground,
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Address Display
                  if (_currentAddress.isNotEmpty)
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
                          Row(
                            children: [
                              Text(
                                'YOUR ${_selectedToken.symbol} ADDRESS',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  letterSpacing: 1,
                                  color: AppTheme.mutedForeground,
                                ),
                              ),
                              const Spacer(),
                              Icon(
                                Icons.qr_code,
                                size: 16,
                                color: AppTheme.mutedForeground,
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Text(
                            _currentAddress,
                            style: const TextStyle(
                              fontFamily: 'monospace',
                              fontSize: 13,
                              color: AppTheme.foreground,
                              height: 1.5,
                            ),
                          ),
                        ],
                      ),
                    ),

                  const SizedBox(height: 16),

                  // Warning
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.amber.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.amber.withOpacity(0.2)),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          Icons.warning_amber_rounded,
                          color: Colors.amber[700],
                          size: 20,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: RichText(
                            text: TextSpan(
                              style: TextStyle(
                                fontSize: 12,
                                color: AppTheme.mutedForeground,
                              ),
                              children: [
                                const TextSpan(text: 'Only send '),
                                TextSpan(
                                  text: _selectedToken.symbol,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w600,
                                    color: AppTheme.foreground,
                                  ),
                                ),
                                const TextSpan(text: ' to this address on the '),
                                TextSpan(
                                  text: _selectedToken.network,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w600,
                                    color: AppTheme.foreground,
                                  ),
                                ),
                                const TextSpan(text: '. Sending other assets may result in permanent loss.'),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Action Buttons
                  Row(
                    children: [
                      Expanded(
                        child: SizedBox(
                          height: 56,
                          child: OutlinedButton(
                            onPressed: () => _handleCopy(_currentAddress),
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: AppTheme.border),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  _copied ? Icons.check : Icons.copy,
                                  size: 20,
                                  color: _copied ? AppTheme.primary : AppTheme.foreground,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  _copied ? 'Copied!' : 'Copy Address',
                                  style: TextStyle(
                                    color: _copied ? AppTheme.primary : AppTheme.foreground,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: SizedBox(
                          height: 56,
                          child: ElevatedButton(
                            onPressed: () {/* Share */},
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.primary,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                            ),
                            child: const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.share, size: 20, color: AppTheme.primaryForeground),
                                SizedBox(width: 8),
                                Text(
                                  'Share',
                                  style: TextStyle(color: AppTheme.primaryForeground),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 32),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
