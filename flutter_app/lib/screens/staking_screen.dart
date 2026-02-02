import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:timetrade_wallet/models/wallet_account.dart';
import '../theme/app_theme.dart';
import '../services/wallet_service.dart';
import '../services/staking_service.dart';
import '../services/blockchain_service.dart';
import '../models/staking_position.dart';
import '../models/token.dart';
import '../widgets/pin_modal.dart';

class StakingScreen extends StatefulWidget {
  final VoidCallback? onBack;

  const StakingScreen({super.key, this.onBack});

  @override
  State<StakingScreen> createState() => _StakingScreenState();
}

/// Extended stablecoin entry with transfer details
class StablecoinEntry {
  final String symbol;
  final String name;
  final double balance;
  final double valueUsd;
  final ChainType primaryChain;
  final String? contractAddress;
  final int decimals;
  final bool isNative;

  StablecoinEntry({
    required this.symbol,
    required this.name,
    required this.balance,
    required this.valueUsd,
    required this.primaryChain,
    this.contractAddress,
    required this.decimals,
    required this.isNative,
  });
}

class _StakingScreenState extends State<StakingScreen> {
  final StakingService _stakingService = StakingService();
  final BlockchainService _blockchainService = BlockchainService();

  List<StakingPosition> _positions = [];
  List<StablecoinEntry> _availableStablecoins = [];
  bool _isLoading = true;
  bool _isLoadingBalances = true;
  bool _isStaking = false;

  StablecoinEntry? _selectedToken;
  int _selectedDuration = 30;
  final TextEditingController _amountController = TextEditingController();

  // 15% monthly rate
  static const double monthlyRate = 15;

  static const List<Map<String, dynamic>> stakingOptions = [
    {'duration': 30, 'label': '30D', 'fullLabel': '30 Days'},
    {'duration': 90, 'label': '90D', 'fullLabel': '90 Days'},
    {'duration': 180, 'label': '180D', 'fullLabel': '180 Days'},
    {'duration': 365, 'label': '1Y', 'fullLabel': '1 Year'},
  ];

  static const Map<String, String> stablecoinMeta = {
    'USDT': 'Tether USD',
    'USDC': 'USD Coin',
    'DAI': 'Dai Stablecoin',
  };

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  Future<void> _fetchData() async {
    await Future.wait([
      _fetchPositions(),
      _fetchStablecoins(),
    ]);
  }

  Future<void> _fetchPositions() async {
    final walletService = context.read<WalletService>();
    final address = walletService.evmAddress;

    if (address == null) {
      setState(() => _isLoading = false);
      return;
    }

    try {
      final positions = await _stakingService.fetchPositions(address);
      setState(() {
        _positions = positions;
        _isLoading = false;
      });
    } catch (e) {
      debugPrint('Error fetching positions: $e');
      setState(() => _isLoading = false);
    }
  }

  Future<void> _fetchStablecoins() async {
    final walletService = context.read<WalletService>();

    setState(() => _isLoadingBalances = true);

    try {
      final tokens = await _blockchainService.fetchAllBalances(
        evmAddress: walletService.evmAddress,
        solanaAddress: walletService.solanaAddress,
        tronAddress: walletService.tronAddress,
      );

      // Filter and aggregate stablecoins
      final stableSymbols = stablecoinMeta.keys.toList();
      final Map<String, StablecoinEntry> aggregated = {};

      for (final token in tokens) {
        final sym = token.symbol.toUpperCase();
        if (!stableSymbols.contains(sym)) continue;

        if (!aggregated.containsKey(sym) ||
            token.balance > aggregated[sym]!.balance) {
          aggregated[sym] = StablecoinEntry(
            symbol: sym,
            name: stablecoinMeta[sym] ?? sym,
            balance: token.balance,
            valueUsd: token.usdValue,
            primaryChain: token.chain,
            contractAddress: token.contractAddress,
            decimals: token.decimals,
            isNative: token.isNative,
          );
        } else {
          // Aggregate balance across chains
          final existing = aggregated[sym]!;
          aggregated[sym] = StablecoinEntry(
            symbol: sym,
            name: stablecoinMeta[sym] ?? sym,
            balance: existing.balance + token.balance,
            valueUsd: existing.valueUsd + token.usdValue,
            primaryChain: existing.balance > token.balance
                ? existing.primaryChain
                : token.chain,
            contractAddress: existing.balance > token.balance
                ? existing.contractAddress
                : token.contractAddress,
            decimals: token.decimals,
            isNative: token.isNative,
          );
        }
      }

      // Sort by USD value descending, filter non-zero balances
      final list = aggregated.values.toList()
        ..sort((a, b) => b.valueUsd.compareTo(a.valueUsd));

      setState(() {
        _availableStablecoins = list.where((t) => t.balance > 0).toList();
        _isLoadingBalances = false;
      });
    } catch (e) {
      debugPrint('Error fetching stablecoins: $e');
      setState(() => _isLoadingBalances = false);
    }
  }

  double _calculateEarnings(StakingPosition position) {
    final stakedAt = position.stakedAt.millisecondsSinceEpoch;
    final now = DateTime.now().millisecondsSinceEpoch;
    final daysStaked = (now - stakedAt) / (1000 * 60 * 60 * 24);
    final dailyRate = position.apyRate / 30 / 100;
    return position.amount * dailyRate * daysStaked;
  }

  double get _totalStaked => _positions.fold(0.0, (sum, p) => sum + p.amount);

  double get _totalEarnings =>
      _positions.fold(0.0, (sum, p) => sum + _calculateEarnings(p));

  String _formatCurrency(double value) {
    return '\$${value.toStringAsFixed(2).replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (m) => '${m[1]},',
        )}';
  }

  String _formatTokenAmount(double amount) {
    if (!amount.isFinite || amount <= 0) return '0';
    if (amount >= 1000000) return '${(amount / 1000000).toStringAsFixed(2)}M';
    if (amount >= 1000) return '${(amount / 1000).toStringAsFixed(2)}K';
    if (amount >= 1) return amount.toStringAsFixed(2);
    return amount.toStringAsFixed(6);
  }

  void _showTokenSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Padding(
                padding: EdgeInsets.all(20),
                child: Text(
                  'Select Stablecoin',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.foreground,
                  ),
                ),
              ),
              if (_isLoadingBalances)
                const Padding(
                  padding: EdgeInsets.all(32),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppTheme.mutedForeground,
                        ),
                      ),
                      SizedBox(width: 12),
                      Text(
                        'Loading balances...',
                        style: TextStyle(color: AppTheme.mutedForeground),
                      ),
                    ],
                  ),
                )
              else if (_availableStablecoins.isEmpty)
                Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    children: const [
                      Text(
                        'No available stablecoins',
                        style: TextStyle(
                          fontWeight: FontWeight.w500,
                          color: AppTheme.mutedForeground,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Add USDT/USDC/DAI to this wallet and they will show up here.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 12,
                          color: AppTheme.mutedForeground,
                        ),
                      ),
                    ],
                  ),
                )
              else
                ...(_availableStablecoins.map((token) => _buildTokenTile(token))),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTokenTile(StablecoinEntry token) {
    return InkWell(
      onTap: () {
        Navigator.pop(context);
        _selectToken(token);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Row(
          children: [
            _buildTokenLogo(token.symbol, size: 48),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    token.symbol,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.foreground,
                    ),
                  ),
                  Text(
                    token.name,
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppTheme.mutedForeground,
                    ),
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  _formatTokenAmount(token.balance),
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.foreground,
                  ),
                ),
                const Text(
                  '15% /month',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: AppTheme.primary,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _selectToken(StablecoinEntry token) {
    setState(() {
      _selectedToken = token;
      _selectedDuration = 30;
      _amountController.clear();
    });
    _showStakeSheet();
  }

  void _showStakeSheet() {
    if (_selectedToken == null) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) {
          final amount = double.tryParse(_amountController.text) ?? 0;
          final maxBalance = _selectedToken?.balance ?? 0;
          final isOverBalance = amount > maxBalance;
          final isAmountValid = amount > 0 && amount <= maxBalance;

          final selectedOption = stakingOptions.firstWhere(
            (o) => o['duration'] == _selectedDuration,
            orElse: () => stakingOptions[0],
          );

          final earnings = amount * (monthlyRate / 100) * (_selectedDuration / 30);

          return DraggableScrollableSheet(
            initialChildSize: 0.85,
            minChildSize: 0.5,
            maxChildSize: 0.95,
            expand: false,
            builder: (context, scrollController) => Column(
              children: [
                // Header
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                  child: Row(
                    children: [
                      _buildTokenLogo(_selectedToken!.symbol, size: 40),
                      const SizedBox(width: 12),
                      Text(
                        'Stake ${_selectedToken!.symbol}',
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.foreground,
                        ),
                      ),
                      const Spacer(),
                      IconButton(
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(Icons.close, color: AppTheme.mutedForeground),
                      ),
                    ],
                  ),
                ),

                Expanded(
                  child: SingleChildScrollView(
                    controller: scrollController,
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Duration Selection
                        const Text(
                          'Lock Duration',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            color: AppTheme.mutedForeground,
                          ),
                        ),
                        const SizedBox(height: 12),
                        SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: Row(
                            children: stakingOptions.map((option) {
                              final isSelected = _selectedDuration == option['duration'];
                              return Padding(
                                padding: const EdgeInsets.only(right: 8),
                                child: GestureDetector(
                                  onTap: () {
                                    setModalState(() {
                                      _selectedDuration = option['duration'] as int;
                                    });
                                  },
                                  child: Container(
                                    width: 92,
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 12,
                                      vertical: 10,
                                    ),
                                    decoration: BoxDecoration(
                                      color: isSelected
                                          ? AppTheme.primary.withOpacity(0.1)
                                          : AppTheme.card.withOpacity(0.3),
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(
                                        color: isSelected
                                            ? AppTheme.primary
                                            : AppTheme.border.withOpacity(0.5),
                                      ),
                                    ),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          option['label'] as String,
                                          style: TextStyle(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w600,
                                            color: isSelected
                                                ? AppTheme.foreground
                                                : AppTheme.foreground,
                                          ),
                                        ),
                                        Text(
                                          '${monthlyRate.toInt()}% /mo',
                                          style: const TextStyle(
                                            fontSize: 11,
                                            color: AppTheme.primary,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                        ),
                        const SizedBox(height: 24),

                        // Amount Input
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Amount',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                                color: AppTheme.mutedForeground,
                              ),
                            ),
                            Row(
                              children: [
                                Text(
                                  'Available: ${_formatTokenAmount(maxBalance)} ${_selectedToken!.symbol}',
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: AppTheme.mutedForeground,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                GestureDetector(
                                  onTap: () {
                                    _amountController.text = maxBalance.toString();
                                    setModalState(() {});
                                  },
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 2,
                                    ),
                                    decoration: BoxDecoration(
                                      color: AppTheme.primary.withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: const Text(
                                      'MAX',
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                        color: AppTheme.primary,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Container(
                          decoration: BoxDecoration(
                            color: AppTheme.card.withOpacity(0.3),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isOverBalance
                                  ? AppTheme.destructive
                                  : AppTheme.border.withOpacity(0.5),
                            ),
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: TextField(
                                  controller: _amountController,
                                  keyboardType: const TextInputType.numberWithOptions(
                                    decimal: true,
                                  ),
                                  autofocus: true,
                                  style: const TextStyle(
                                    fontSize: 20,
                                    fontWeight: FontWeight.w600,
                                    color: AppTheme.foreground,
                                  ),
                                  decoration: InputDecoration(
                                    hintText: '0.00',
                                    hintStyle: TextStyle(
                                      color: AppTheme.mutedForeground.withOpacity(0.5),
                                    ),
                                    border: InputBorder.none,
                                    contentPadding: const EdgeInsets.symmetric(
                                      horizontal: 16,
                                      vertical: 16,
                                    ),
                                  ),
                                  onChanged: (_) => setModalState(() {}),
                                ),
                              ),
                              Padding(
                                padding: const EdgeInsets.only(right: 16),
                                child: Row(
                                  children: [
                                    _buildTokenLogo(_selectedToken!.symbol, size: 24),
                                    const SizedBox(width: 8),
                                    Text(
                                      _selectedToken!.symbol,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w500,
                                        color: AppTheme.mutedForeground,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (isOverBalance)
                          const Padding(
                            padding: EdgeInsets.only(top: 8, left: 4),
                            child: Text(
                              'Amount exceeds available balance',
                              style: TextStyle(
                                fontSize: 12,
                                color: AppTheme.destructive,
                              ),
                            ),
                          ),
                        const SizedBox(height: 20),

                        // Earnings Preview
                        if (amount > 0)
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: AppTheme.primary.withOpacity(0.05),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: AppTheme.primary.withOpacity(0.2),
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    const Text(
                                      'Estimated earnings',
                                      style: TextStyle(
                                        fontSize: 14,
                                        color: AppTheme.mutedForeground,
                                      ),
                                    ),
                                    Text(
                                      '+${_formatCurrency(earnings)}',
                                      style: const TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.bold,
                                        color: AppTheme.primary,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'After ${selectedOption['fullLabel']}',
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: AppTheme.mutedForeground,
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ),
                ),

                // Footer
                Container(
                  padding: EdgeInsets.fromLTRB(
                    20,
                    16,
                    20,
                    16 + MediaQuery.of(context).viewInsets.bottom,
                  ),
                  decoration: BoxDecoration(
                    border: Border(
                      top: BorderSide(color: AppTheme.border.withOpacity(0.5)),
                    ),
                  ),
                  child: Column(
                    children: [
                      SizedBox(
                        width: double.infinity,
                        height: 56,
                        child: ElevatedButton(
                          onPressed: isAmountValid && !_isStaking
                              ? () => _handleStake(context)
                              : null,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.primary,
                            foregroundColor: AppTheme.primaryForeground,
                            disabledBackgroundColor: AppTheme.primary.withOpacity(0.5),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                          child: _isStaking
                              ? const SizedBox(
                                  width: 24,
                                  height: 24,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.vpn_key, size: 20),
                                    SizedBox(width: 8),
                                    Text(
                                      'Sign & Stake',
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ],
                                ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        'Tokens locked until unlock date. Rewards calculated daily at 15% per month.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 12,
                          color: AppTheme.mutedForeground,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  void _handleStake(BuildContext sheetContext) {
    final amount = double.tryParse(_amountController.text);
    if (amount == null || amount <= 0 || _selectedToken == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid amount')),
      );
      return;
    }

    Navigator.pop(sheetContext);

    // Show PIN modal
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => PinModal(
        title: 'Confirm Stake',
        onPinEntered: (pin) async {
          final walletService = context.read<WalletService>();
          if (!walletService.verifyPin(pin)) {
            throw Exception('Incorrect PIN');
          }

          setState(() => _isStaking = true);

          try {
            // Get stake wallet address
            final stakeWallet = await _stakingService.getStakeWalletAddress(
              _selectedToken!.primaryChain.name,
            );

            if (stakeWallet == null) {
              throw Exception('Staking not configured for ${_selectedToken!.primaryChain.name}');
            }

            // TODO: Execute real on-chain transfer
            // For now, create position directly
            await Future.delayed(const Duration(seconds: 1));

            final unlockDate = DateTime.now().add(
              Duration(days: _selectedDuration),
            );

            await _stakingService.createPosition(
              walletAddress: walletService.evmAddress!,
              tokenSymbol: _selectedToken!.symbol,
              chain: _selectedToken!.primaryChain.name,
              amount: amount,
              apyRate: monthlyRate,
              unlockAt: unlockDate,
            );

            Navigator.pop(dialogContext);
            _amountController.clear();
            await _fetchData();

            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  'Successfully staked $amount ${_selectedToken!.symbol}!',
                ),
              ),
            );
          } catch (e) {
            Navigator.pop(dialogContext);
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Staking failed: ${e.toString()}'),
                backgroundColor: AppTheme.destructive,
              ),
            );
          } finally {
            setState(() => _isStaking = false);
          }
        },
      ),
    );
  }

  Future<void> _handleUnstake(StakingPosition position) async {
    final unlockDate = position.unlockAt;
    if (unlockDate.isAfter(DateTime.now())) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Cannot unstake yet. Unlocks on ${_formatDate(unlockDate)}',
          ),
        ),
      );
      return;
    }

    final success = await _stakingService.unstakePosition(position.id);
    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            '${position.amount} ${position.tokenSymbol} + rewards returned',
          ),
        ),
      );
      await _fetchPositions();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Unstake failed. Please try again.'),
          backgroundColor: AppTheme.destructive,
        ),
      );
    }
  }

  Widget _buildTokenLogo(String symbol, {double size = 40}) {
    return ClipOval(
      child: Image.network(
        'https://api.elbstream.com/logos/crypto/${symbol.toLowerCase()}',
        width: size,
        height: size,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => Container(
          width: size,
          height: size,
          color: AppTheme.secondary,
          alignment: Alignment.center,
          child: Text(
            symbol.isNotEmpty ? symbol[0] : '?',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: size * 0.4,
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                border: Border(
                  bottom: BorderSide(color: AppTheme.border),
                ),
              ),
              child: Row(
                children: [
                  if (widget.onBack != null)
                    IconButton(
                      onPressed: widget.onBack,
                      icon: const Icon(Icons.arrow_back),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                  if (widget.onBack != null) const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text(
                        'Staking',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.foreground,
                        ),
                      ),
                      Text(
                        'Earn 15% monthly on stablecoins',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppTheme.mutedForeground,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            Expanded(
              child: RefreshIndicator(
                onRefresh: _fetchData,
                color: AppTheme.primary,
                backgroundColor: AppTheme.card,
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Stats cards
                      Row(
                        children: [
                          Expanded(
                            child: _buildStatCard(
                              icon: Icons.account_balance_wallet,
                              label: 'Total Staked',
                              value: _formatCurrency(_totalStaked),
                              isPrimary: false,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _buildStatCard(
                              icon: Icons.trending_up,
                              label: 'Earnings',
                              value: '+${_formatCurrency(_totalEarnings)}',
                              isPrimary: true,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // APY card
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [
                              AppTheme.primary.withOpacity(0.15),
                              AppTheme.primary.withOpacity(0.05),
                            ],
                          ),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppTheme.primary.withOpacity(0.2)),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: const [
                                Text(
                                  'Fixed Monthly Yield',
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: AppTheme.mutedForeground,
                                  ),
                                ),
                                SizedBox(height: 4),
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(
                                      '15%',
                                      style: TextStyle(
                                        fontSize: 36,
                                        fontWeight: FontWeight.bold,
                                        color: AppTheme.primary,
                                      ),
                                    ),
                                    Padding(
                                      padding: EdgeInsets.only(bottom: 6, left: 4),
                                      child: Text(
                                        '/month',
                                        style: TextStyle(
                                          fontSize: 16,
                                          color: AppTheme.primary,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                            Container(
                              width: 56,
                              height: 56,
                              decoration: BoxDecoration(
                                color: AppTheme.primary.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: const Icon(
                                Icons.monetization_on,
                                size: 28,
                                color: AppTheme.primary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Your Stablecoins section
                      const Text(
                        'Your Stablecoins',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: AppTheme.mutedForeground,
                        ),
                      ),
                      const SizedBox(height: 12),

                      if (_isLoadingBalances)
                        const Center(
                          child: Padding(
                            padding: EdgeInsets.all(24),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: AppTheme.mutedForeground,
                                  ),
                                ),
                                SizedBox(width: 12),
                                Text(
                                  'Loading balances...',
                                  style: TextStyle(color: AppTheme.mutedForeground),
                                ),
                              ],
                            ),
                          ),
                        )
                      else if (_availableStablecoins.isEmpty)
                        Container(
                          padding: const EdgeInsets.all(24),
                          decoration: BoxDecoration(
                            color: AppTheme.card.withOpacity(0.3),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppTheme.border.withOpacity(0.5)),
                          ),
                          child: Column(
                            children: const [
                              Text(
                                'No stablecoins found',
                                style: TextStyle(
                                  fontWeight: FontWeight.w500,
                                  color: AppTheme.mutedForeground,
                                ),
                              ),
                              SizedBox(height: 4),
                              Text(
                                'USDT/USDC/DAI with a non-zero balance will appear here.',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 12,
                                  color: AppTheme.mutedForeground,
                                ),
                              ),
                            ],
                          ),
                        )
                      else
                        ...(_availableStablecoins.map((token) => _buildStablecoinCard(token))),

                      const SizedBox(height: 16),

                      // Stake button
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton.icon(
                          onPressed: _showTokenSheet,
                          icon: const Icon(Icons.add, size: 20),
                          label: const Text(
                            'Stake Stablecoins',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.primary,
                            foregroundColor: AppTheme.primaryForeground,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Active Stakes section
                      const Text(
                        'Active Stakes',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: AppTheme.mutedForeground,
                        ),
                      ),
                      const SizedBox(height: 12),

                      if (_isLoading)
                        const Center(
                          child: Padding(
                            padding: EdgeInsets.all(32),
                            child: CircularProgressIndicator(color: AppTheme.primary),
                          ),
                        )
                      else if (_positions.isEmpty)
                        Container(
                          width: MediaQuery.of(context).size.width,
                          padding: const EdgeInsets.all(32),
                          decoration: BoxDecoration(
                            color: AppTheme.card.withOpacity(0.3),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppTheme.border.withOpacity(0.5)),
                          ),
                          child: Column(
                            children: [
                              Container(
                                width: 64,
                                height: 64,
                                decoration: BoxDecoration(
                                  color: AppTheme.muted.withOpacity(0.5),
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                child: const Icon(
                                  Icons.toll,
                                  size: 32,
                                  color: AppTheme.mutedForeground,
                                ),
                              ),
                              const SizedBox(height: 16),
                              const Text(
                                'No active stakes',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w500,
                                  color: AppTheme.mutedForeground,
                                ),
                              ),
                              const SizedBox(height: 4),
                              const Text(
                                'Start earning 15% monthly today',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: AppTheme.mutedForeground,
                                ),
                              ),
                            ],
                          ),
                        )
                      else
                        ...(_positions.map((position) => _buildPositionCard(position))),

                      const SizedBox(height: 100), // Bottom padding for nav
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStablecoinCard(StablecoinEntry token) {
    return GestureDetector(
      onTap: () => _selectToken(token),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.card.withOpacity(0.5),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.border.withOpacity(0.5)),
        ),
        child: Row(
          children: [
            _buildTokenLogo(token.symbol, size: 40),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    token.symbol,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.foreground,
                    ),
                  ),
                  Text(
                    token.name,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppTheme.mutedForeground,
                    ),
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  _formatTokenAmount(token.balance),
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.foreground,
                  ),
                ),
                const Text(
                  '15% /month',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: AppTheme.primary,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard({
    required IconData icon,
    required String label,
    required String value,
    required bool isPrimary,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.card.withOpacity(0.5),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border.withOpacity(0.5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                icon,
                size: 16,
                color: isPrimary ? AppTheme.primary : AppTheme.mutedForeground,
              ),
              const SizedBox(width: 8),
              Text(
                label,
                style: const TextStyle(
                  fontSize: 12,
                  color: AppTheme.mutedForeground,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: isPrimary ? AppTheme.primary : AppTheme.foreground,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPositionCard(StakingPosition position) {
    final earnings = _calculateEarnings(position);
    final unlockDate = position.unlockAt;
    final isUnlocked = unlockDate.isBefore(DateTime.now());
    final daysRemaining = isUnlocked
        ? 0
        : (unlockDate.difference(DateTime.now()).inDays + 1).clamp(0, 999);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.card.withOpacity(0.5),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border.withOpacity(0.5)),
      ),
      child: Column(
        children: [
          // Header row
          Row(
            children: [
              _buildTokenLogo(position.tokenSymbol, size: 40),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      position.tokenSymbol,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.foreground,
                      ),
                    ),
                    Text(
                      position.chain.toUpperCase(),
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppTheme.mutedForeground,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: isUnlocked
                      ? AppTheme.primary.withOpacity(0.2)
                      : AppTheme.muted,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  isUnlocked ? 'Unlocked' : '${daysRemaining}d left',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: isUnlocked ? AppTheme.primary : AppTheme.mutedForeground,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Stats row
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.muted.withOpacity(0.3),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Staked',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppTheme.mutedForeground,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _formatCurrency(position.amount),
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.foreground,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Earned',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppTheme.mutedForeground,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '+${_formatCurrency(earnings)}',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.primary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Footer row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(
                    Icons.access_time,
                    size: 14,
                    color: AppTheme.mutedForeground,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    _formatDate(unlockDate),
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppTheme.mutedForeground,
                    ),
                  ),
                ],
              ),
              Text(
                '${position.apyRate.toStringAsFixed(0)}% /month',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: AppTheme.mutedForeground,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Unstake button
          SizedBox(
            width: double.infinity,
            height: 40,
            child: OutlinedButton.icon(
              onPressed: isUnlocked ? () => _handleUnstake(position) : null,
              icon: const Icon(Icons.remove, size: 18),
              label: Text(isUnlocked ? 'Unstake + Claim' : 'Locked'),
              style: OutlinedButton.styleFrom(
                foregroundColor: isUnlocked ? AppTheme.primary : AppTheme.mutedForeground,
                side: BorderSide(
                  color: isUnlocked
                      ? AppTheme.primary
                      : AppTheme.border.withOpacity(0.5),
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    final months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return '${months[date.month - 1]} ${date.day}, ${date.year}';
  }
}
