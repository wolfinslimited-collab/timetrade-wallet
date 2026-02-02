import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../theme/app_theme.dart';
import 'swap_token_selector.dart';

// Mock tokens for swap - matches web version
final List<SwapToken> mockTokens = [
  SwapToken(
    symbol: 'ETH',
    name: 'Ethereum',
    logoUrl: 'https://api.elbstream.com/logos/crypto/eth',
    balance: 2.5,
    price: 3200,
    color: const Color(0xFF627EEA),
  ),
  SwapToken(
    symbol: 'BTC',
    name: 'Bitcoin',
    logoUrl: 'https://api.elbstream.com/logos/crypto/btc',
    balance: 0.15,
    price: 65000,
    color: const Color(0xFFF7931A),
  ),
  SwapToken(
    symbol: 'SOL',
    name: 'Solana',
    logoUrl: 'https://api.elbstream.com/logos/crypto/sol',
    balance: 45,
    price: 150,
    color: const Color(0xFF9945FF),
  ),
  SwapToken(
    symbol: 'USDC',
    name: 'USD Coin',
    logoUrl: 'https://api.elbstream.com/logos/crypto/usdc',
    balance: 1500,
    price: 1,
    color: const Color(0xFF2775CA),
  ),
  SwapToken(
    symbol: 'USDT',
    name: 'Tether',
    logoUrl: 'https://api.elbstream.com/logos/crypto/usdt',
    balance: 800,
    price: 1,
    color: const Color(0xFF26A17B),
  ),
  SwapToken(
    symbol: 'AVAX',
    name: 'Avalanche',
    logoUrl: 'https://api.elbstream.com/logos/crypto/avax',
    balance: 25,
    price: 35,
    color: const Color(0xFFE84142),
  ),
];

class SwapCryptoSheet extends StatefulWidget {
  final VoidCallback onClose;

  const SwapCryptoSheet({super.key, required this.onClose});

  @override
  State<SwapCryptoSheet> createState() => _SwapCryptoSheetState();
}

class _SwapCryptoSheetState extends State<SwapCryptoSheet> {
  late SwapToken _fromToken;
  late SwapToken _toToken;
  final TextEditingController _fromAmountController = TextEditingController();
  double _slippage = 0.5;
  bool _isSwapping = false;
  bool _swapComplete = false;
  String _swappedFromAmount = '';
  String _swappedToAmount = '';

  @override
  void initState() {
    super.initState();
    _fromToken = mockTokens[0]; // ETH
    _toToken = mockTokens[3]; // USDC
  }

  @override
  void dispose() {
    _fromAmountController.dispose();
    super.dispose();
  }

  double get exchangeRate => _fromToken.price / _toToken.price;

  double get fromAmount => double.tryParse(_fromAmountController.text) ?? 0;

  String get toAmount {
    final amount = fromAmount * exchangeRate;
    final decimals = (_toToken.symbol == 'USDC' || _toToken.symbol == 'USDT') ? 2 : 6;
    return amount.toStringAsFixed(decimals);
  }

  double get priceImpact {
    final valueUsd = fromAmount * _fromToken.price;
    if (valueUsd < 100) return 0.01;
    if (valueUsd < 1000) return 0.05;
    if (valueUsd < 10000) return 0.15;
    if (valueUsd < 50000) return 0.5;
    return 1.2;
  }

  String get minimumReceived {
    final amount = double.tryParse(toAmount) ?? 0;
    return (amount * (1 - _slippage / 100)).toStringAsFixed(6);
  }

  double get fromValueUsd => fromAmount * _fromToken.price;
  double get toValueUsd => (double.tryParse(toAmount) ?? 0) * _toToken.price;

  bool get isValidSwap => fromAmount > 0 && fromAmount <= _fromToken.balance;

  void _handleSwapTokens() {
    HapticFeedback.lightImpact();
    setState(() {
      final temp = _fromToken;
      _fromToken = _toToken;
      _toToken = temp;
      _fromAmountController.clear();
    });
  }

  void _handleMaxClick() {
    HapticFeedback.lightImpact();
    _fromAmountController.text = _fromToken.balance.toString();
    setState(() {});
  }

  Future<void> _handleSwap() async {
    if (!isValidSwap) return;
    
    HapticFeedback.mediumImpact();
    setState(() => _isSwapping = true);
    
    // Simulate swap transaction
    await Future.delayed(const Duration(seconds: 2));
    
    setState(() {
      _isSwapping = false;
      _swapComplete = true;
      _swappedFromAmount = _fromAmountController.text;
      _swappedToAmount = toAmount;
    });
  }

  void _handleClose() {
    setState(() {
      _swapComplete = false;
      _fromAmountController.clear();
    });
    widget.onClose();
  }

  void _showFromTokenSelector() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => SwapTokenSelector(
        tokens: mockTokens,
        selectedToken: _fromToken,
        excludeToken: _toToken,
        onSelect: (token) {
          setState(() => _fromToken = token);
          Navigator.pop(context);
        },
        onClose: () => Navigator.pop(context),
      ),
    );
  }

  void _showToTokenSelector() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => SwapTokenSelector(
        tokens: mockTokens,
        selectedToken: _toToken,
        excludeToken: _fromToken,
        onSelect: (token) {
          setState(() => _toToken = token);
          Navigator.pop(context);
        },
        onClose: () => Navigator.pop(context),
      ),
    );
  }

  void _showSlippageSettings() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => _SlippageSettingsSheet(
        currentSlippage: _slippage,
        onSlippageChanged: (value) {
          setState(() => _slippage = value);
        },
        onClose: () => Navigator.pop(context),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_swapComplete) {
      return _buildSwapCompleteUI();
    }
    return _buildSwapUI();
  }

  Widget _buildSwapCompleteUI() {
    return Container(
      height: MediaQuery.of(context).size.height * 0.7,
      decoration: const BoxDecoration(
        color: AppTheme.background,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Success icon
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: AppTheme.primary.withOpacity(0.2),
              borderRadius: BorderRadius.circular(40),
            ),
            child: const Icon(
              Icons.bolt,
              size: 40,
              color: AppTheme.primary,
            ),
          ),
          const SizedBox(height: 24),
          const Text(
            'Swap Complete!',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: AppTheme.foreground,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Swapped $_swappedFromAmount ${_fromToken.symbol} for $_swappedToAmount ${_toToken.symbol}',
            style: const TextStyle(
              fontSize: 14,
              color: AppTheme.mutedForeground,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 32),
          // Swap summary
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 48),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.card,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Column(
                  children: [
                    _buildTokenIcon(_fromToken),
                    const SizedBox(height: 8),
                    Text(
                      '-$_swappedFromAmount',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.foreground,
                      ),
                    ),
                    Text(
                      _fromToken.symbol,
                      style: const TextStyle(
                        fontSize: 14,
                        color: AppTheme.mutedForeground,
                      ),
                    ),
                  ],
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16),
                  child: Icon(
                    Icons.swap_vert,
                    size: 24,
                    color: AppTheme.mutedForeground,
                  ),
                ),
                Column(
                  children: [
                    _buildTokenIcon(_toToken),
                    const SizedBox(height: 8),
                    Text(
                      '+$_swappedToAmount',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.success,
                      ),
                    ),
                    Text(
                      _toToken.symbol,
                      style: const TextStyle(
                        fontSize: 14,
                        color: AppTheme.mutedForeground,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),
          // Done button
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 48),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _handleClose,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primary,
                  foregroundColor: AppTheme.primaryForeground,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                child: const Text(
                  'Done',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSwapUI() {
    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: const BoxDecoration(
        color: AppTheme.background,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
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
              children: [
                const Expanded(
                  child: Text(
                    'Swap',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.foreground,
                    ),
                  ),
                ),
                GestureDetector(
                  onTap: _showSlippageSettings,
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppTheme.card,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(
                      Icons.settings,
                      size: 20,
                      color: AppTheme.mutedForeground,
                    ),
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
                  // From Token
                  _buildFromTokenCard(),
                  // Swap button
                  Transform.translate(
                    offset: const Offset(0, -8),
                    child: GestureDetector(
                      onTap: _handleSwapTokens,
                      child: Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: AppTheme.primary,
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: [
                            BoxShadow(
                              color: AppTheme.primary.withOpacity(0.3),
                              blurRadius: 8,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.swap_vert,
                          size: 24,
                          color: AppTheme.primaryForeground,
                        ),
                      ),
                    ),
                  ),
                  // To Token
                  Transform.translate(
                    offset: const Offset(0, -8),
                    child: _buildToTokenCard(),
                  ),
                  // Swap Details
                  if (fromAmount > 0) ...[
                    const SizedBox(height: 16),
                    _buildSwapDetails(),
                  ],
                  const SizedBox(height: 24),
                  // Swap button
                  _buildSwapButton(),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFromTokenCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'From',
                style: TextStyle(
                  fontSize: 14,
                  color: AppTheme.mutedForeground,
                ),
              ),
              Text(
                'Balance: ${_fromToken.balance.toStringAsFixed(_fromToken.balance < 1 ? 6 : 2)}',
                style: const TextStyle(
                  fontSize: 14,
                  color: AppTheme.mutedForeground,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              // Token selector
              GestureDetector(
                onTap: _showFromTokenSelector,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppTheme.secondary.withOpacity(0.5),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      _buildTokenIcon(_fromToken, size: 24),
                      const SizedBox(width: 8),
                      Text(
                        _fromToken.symbol,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.foreground,
                        ),
                      ),
                      const SizedBox(width: 4),
                      const Icon(
                        Icons.keyboard_arrow_down,
                        size: 20,
                        color: AppTheme.mutedForeground,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 12),
              // Amount input
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    TextField(
                      controller: _fromAmountController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      textAlign: TextAlign.right,
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.foreground,
                      ),
                      decoration: const InputDecoration(
                        hintText: '0.00',
                        hintStyle: TextStyle(color: AppTheme.mutedForeground),
                        border: InputBorder.none,
                        contentPadding: EdgeInsets.zero,
                        isDense: true,
                      ),
                      onChanged: (_) => setState(() {}),
                    ),
                    Text(
                      '\$${fromValueUsd.toStringAsFixed(2)}',
                      style: const TextStyle(
                        fontSize: 14,
                        color: AppTheme.mutedForeground,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerRight,
            child: GestureDetector(
              onTap: _handleMaxClick,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                child: const Text(
                  'MAX',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.primary,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildToTokenCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'To',
                style: TextStyle(
                  fontSize: 14,
                  color: AppTheme.mutedForeground,
                ),
              ),
              Text(
                'Balance: ${_toToken.balance.toStringAsFixed(_toToken.balance < 1 ? 6 : 2)}',
                style: const TextStyle(
                  fontSize: 14,
                  color: AppTheme.mutedForeground,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              // Token selector
              GestureDetector(
                onTap: _showToTokenSelector,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppTheme.secondary.withOpacity(0.5),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      _buildTokenIcon(_toToken, size: 24),
                      const SizedBox(width: 8),
                      Text(
                        _toToken.symbol,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.foreground,
                        ),
                      ),
                      const SizedBox(width: 4),
                      const Icon(
                        Icons.keyboard_arrow_down,
                        size: 20,
                        color: AppTheme.mutedForeground,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 12),
              // Amount display
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      double.tryParse(toAmount) != null && double.parse(toAmount) > 0
                          ? toAmount
                          : '0.00',
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.foreground,
                      ),
                    ),
                    Text(
                      '\$${toValueUsd.toStringAsFixed(2)}',
                      style: const TextStyle(
                        fontSize: 14,
                        color: AppTheme.mutedForeground,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSwapDetails() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.secondary.withOpacity(0.3),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          _buildDetailRow(
            'Exchange Rate',
            '1 ${_fromToken.symbol} = ${exchangeRate.toStringAsFixed(6)} ${_toToken.symbol}',
            hasInfo: true,
          ),
          const SizedBox(height: 12),
          _buildDetailRow(
            'Price Impact',
            '${priceImpact.toStringAsFixed(2)}%',
            hasInfo: true,
            valueColor: priceImpact < 0.1
                ? AppTheme.success
                : priceImpact < 0.5
                    ? AppTheme.accent
                    : AppTheme.destructive,
          ),
          const SizedBox(height: 12),
          _buildDetailRow(
            'Minimum Received',
            '$minimumReceived ${_toToken.symbol}',
            hasInfo: true,
          ),
          const SizedBox(height: 12),
          _buildDetailRow(
            'Slippage Tolerance',
            '$_slippage%',
          ),
          const SizedBox(height: 12),
          _buildDetailRow(
            'Network Fee',
            '~\$2.50',
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value, {bool hasInfo = false, Color? valueColor}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          children: [
            Text(
              label,
              style: const TextStyle(
                fontSize: 14,
                color: AppTheme.mutedForeground,
              ),
            ),
            if (hasInfo) ...[
              const SizedBox(width: 4),
              const Icon(
                Icons.info_outline,
                size: 14,
                color: AppTheme.mutedForeground,
              ),
            ],
          ],
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: valueColor ?? AppTheme.foreground,
          ),
        ),
      ],
    );
  }

  Widget _buildSwapButton() {
    String buttonText;
    if (_isSwapping) {
      buttonText = '';
    } else if (fromAmount == 0) {
      buttonText = 'Enter an amount';
    } else if (fromAmount > _fromToken.balance) {
      buttonText = 'Insufficient balance';
    } else {
      buttonText = 'Swap';
    }

    return SizedBox(
      width: double.infinity,
      height: 56,
      child: ElevatedButton(
        onPressed: isValidSwap && !_isSwapping ? _handleSwap : null,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTheme.primary,
          foregroundColor: AppTheme.primaryForeground,
          disabledBackgroundColor: AppTheme.primary.withOpacity(0.5),
          disabledForegroundColor: AppTheme.primaryForeground.withOpacity(0.5),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
        child: _isSwapping
            ? const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryForeground),
                ),
              )
            : Text(
                buttonText,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
      ),
    );
  }

  Widget _buildTokenIcon(SwapToken token, {double size = 32}) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: token.color.withOpacity(0.2),
        borderRadius: BorderRadius.circular(size / 2),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(size / 2),
        child: Image.network(
          token.logoUrl,
          width: size,
          height: size,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => Center(
            child: Text(
              token.symbol[0],
              style: TextStyle(
                fontSize: size * 0.5,
                fontWeight: FontWeight.bold,
                color: token.color,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _SlippageSettingsSheet extends StatefulWidget {
  final double currentSlippage;
  final Function(double) onSlippageChanged;
  final VoidCallback onClose;

  const _SlippageSettingsSheet({
    required this.currentSlippage,
    required this.onSlippageChanged,
    required this.onClose,
  });

  @override
  State<_SlippageSettingsSheet> createState() => _SlippageSettingsSheetState();
}

class _SlippageSettingsSheetState extends State<_SlippageSettingsSheet> {
  late double _slippage;

  @override
  void initState() {
    super.initState();
    _slippage = widget.currentSlippage;
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: const BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Slippage Tolerance',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.foreground,
                ),
              ),
              Text(
                '${_slippage.toStringAsFixed(1)}%',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.primary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Preset buttons
          Row(
            children: [0.1, 0.5, 1.0].map((val) {
              final isSelected = _slippage == val;
              return Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: GestureDetector(
                    onTap: () {
                      setState(() => _slippage = val);
                      widget.onSlippageChanged(val);
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        color: isSelected ? AppTheme.primary : AppTheme.secondary,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '$val%',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: isSelected
                              ? AppTheme.primaryForeground
                              : AppTheme.foreground,
                        ),
                      ),
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 16),
          // Slider
          Slider(
            value: _slippage,
            min: 0.1,
            max: 5.0,
            divisions: 49,
            activeColor: AppTheme.primary,
            inactiveColor: AppTheme.secondary,
            onChanged: (value) {
              setState(() => _slippage = double.parse(value.toStringAsFixed(1)));
              widget.onSlippageChanged(_slippage);
            },
          ),
          const SizedBox(height: 12),
          const Text(
            'Your transaction will revert if the price changes unfavorably by more than this percentage.',
            style: TextStyle(
              fontSize: 12,
              color: AppTheme.mutedForeground,
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: widget.onClose,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                foregroundColor: AppTheme.primaryForeground,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text('Done'),
            ),
          ),
        ],
      ),
    );
  }
}
