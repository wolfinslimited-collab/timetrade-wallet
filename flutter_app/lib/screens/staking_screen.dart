import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../services/wallet_service.dart';
import '../services/staking_service.dart';
import '../models/staking_position.dart';
import '../widgets/pin_modal.dart';

class StakingScreen extends StatefulWidget {
  final VoidCallback? onBack;

  const StakingScreen({super.key, this.onBack});

  @override
  State<StakingScreen> createState() => _StakingScreenState();
}

class _StakingScreenState extends State<StakingScreen> {
  final StakingService _stakingService = StakingService();
  List<StakingPosition> _positions = [];
  bool _isLoading = true;
  bool _showStakeSheet = false;
  String? _selectedToken;
  double _selectedBalance = 0;
  int _selectedDuration = 30;
  final TextEditingController _amountController = TextEditingController();

  // 15% monthly rate
  static const double monthlyRate = 15;

  static const List<Map<String, dynamic>> stakingOptions = [
    {'duration': 30, 'label': '30 Days'},
    {'duration': 90, 'label': '90 Days'},
    {'duration': 180, 'label': '180 Days'},
    {'duration': 365, 'label': '1 Year'},
  ];

  static const List<Map<String, String>> stablecoins = [
    {'symbol': 'USDT', 'name': 'Tether USD'},
    {'symbol': 'USDC', 'name': 'USD Coin'},
    {'symbol': 'DAI', 'name': 'Dai Stablecoin'},
  ];

  @override
  void initState() {
    super.initState();
    _fetchPositions();
  }

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
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

  double _calculateEarnings(StakingPosition position) {
    final stakedAt = position.stakedAt.millisecondsSinceEpoch;
    final now = DateTime.now().millisecondsSinceEpoch;
    final daysStaked = (now - stakedAt) / (1000 * 60 * 60 * 24);
    final dailyRate = position.apyRate / 30 / 100;
    return position.amount * dailyRate * daysStaked;
  }

  double get _totalStaked =>
      _positions.fold(0.0, (sum, p) => sum + p.amount);

  double get _totalEarnings =>
      _positions.fold(0.0, (sum, p) => sum + _calculateEarnings(p));

  String _formatCurrency(double value) {
    return '\$${value.toStringAsFixed(2).replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (m) => '${m[1]},',
    )}';
  }

  void _showTokenPicker() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'Select Stablecoin',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.foreground,
                ),
              ),
            ),
            ...stablecoins.map((coin) => ListTile(
              leading: CircleAvatar(
                backgroundColor: AppTheme.secondary,
                child: ClipOval(
                  child: Image.network(
                    'https://api.elbstream.com/logos/crypto/${coin['symbol']!.toLowerCase()}',
                    width: 32,
                    height: 32,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Text(
                      coin['symbol']![0],
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ),
              title: Text(
                coin['symbol']!,
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  color: AppTheme.foreground,
                ),
              ),
              subtitle: Text(
                coin['name']!,
                style: const TextStyle(
                  fontSize: 12,
                  color: AppTheme.mutedForeground,
                ),
              ),
              trailing: const Text(
                '\$0.00',
                style: TextStyle(color: AppTheme.mutedForeground),
              ),
              onTap: () {
                Navigator.pop(context);
                setState(() {
                  _selectedToken = coin['symbol'];
                  _selectedBalance = 0; // TODO: Get real balance
                  _showStakeSheet = true;
                });
              },
            )),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  void _showStakeModal() {
    if (_selectedToken == null) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
          ),
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Stake $_selectedToken',
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.foreground,
                        ),
                      ),
                      IconButton(
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(Icons.close),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Amount input
                  const Text(
                    'Amount',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: AppTheme.mutedForeground,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    decoration: BoxDecoration(
                      color: AppTheme.background,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppTheme.border),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _amountController,
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            style: const TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.foreground,
                            ),
                            decoration: InputDecoration(
                              hintText: '0.00',
                              hintStyle: TextStyle(
                                color: AppTheme.mutedForeground.withOpacity(0.5),
                              ),
                              border: InputBorder.none,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                            ),
                          ),
                        ),
                        TextButton(
                          onPressed: () {
                            _amountController.text = _selectedBalance.toString();
                          },
                          child: const Text(
                            'MAX',
                            style: TextStyle(
                              color: AppTheme.primary,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Available: ${_formatCurrency(_selectedBalance)}',
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppTheme.mutedForeground,
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Duration selector
                  const Text(
                    'Lock Period',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: AppTheme.mutedForeground,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: stakingOptions.map((option) {
                      final isSelected = _selectedDuration == option['duration'];
                      return GestureDetector(
                        onTap: () {
                          setModalState(() {
                            _selectedDuration = option['duration'] as int;
                          });
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                          decoration: BoxDecoration(
                            color: isSelected ? AppTheme.primary : AppTheme.background,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: isSelected ? AppTheme.primary : AppTheme.border,
                            ),
                          ),
                          child: Text(
                            option['label'] as String,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                              color: isSelected ? AppTheme.primaryForeground : AppTheme.foreground,
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 24),

                  // Earnings preview
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppTheme.primary.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppTheme.primary.withOpacity(0.2)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Estimated Earnings',
                          style: TextStyle(
                            color: AppTheme.foreground,
                          ),
                        ),
                        Builder(builder: (context) {
                          final amount = double.tryParse(_amountController.text) ?? 0;
                          final earnings = amount * (monthlyRate / 100) * (_selectedDuration / 30);
                          return Text(
                            '+${_formatCurrency(earnings)}',
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.success,
                            ),
                          );
                        }),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Stake button
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton(
                      onPressed: () => _handleStake(context),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primary,
                        foregroundColor: AppTheme.primaryForeground,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      child: const Text(
                        'Stake Now',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  void _handleStake(BuildContext context) {
    final amount = double.tryParse(_amountController.text);
    if (amount == null || amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid amount')),
      );
      return;
    }

    Navigator.pop(context);

    // Show PIN modal
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => PinModal(
        title: 'Confirm Stake',
        onPinEntered: (pin) async {
          final walletService = this.context.read<WalletService>();
          if (!walletService.verifyPin(pin)) {
            throw Exception('Incorrect PIN');
          }

          // TODO: Execute stake transfer
          await Future.delayed(const Duration(seconds: 2));

          Navigator.pop(context);
          _amountController.clear();
          _fetchPositions();

          ScaffoldMessenger.of(this.context).showSnackBar(
            SnackBar(content: Text('Successfully staked $amount $_selectedToken!')),
          );
        },
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
                onRefresh: _fetchPositions,
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

                      // Stake button
                      SizedBox(
                        width: double.infinity,
                        height: 56,
                        child: ElevatedButton.icon(
                          onPressed: _showTokenPicker,
                          icon: const Icon(Icons.add),
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
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Active positions
                      const Text(
                        'Your Positions',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.foreground,
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
                          padding: const EdgeInsets.all(32),
                          decoration: BoxDecoration(
                            color: AppTheme.card,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppTheme.border),
                          ),
                          child: Column(
                            children: const [
                              Icon(
                                Icons.savings_outlined,
                                size: 48,
                                color: AppTheme.mutedForeground,
                              ),
                              SizedBox(height: 16),
                              Text(
                                'No active positions',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w500,
                                  color: AppTheme.foreground,
                                ),
                              ),
                              SizedBox(height: 4),
                              Text(
                                'Stake stablecoins to start earning',
                                style: TextStyle(
                                  fontSize: 14,
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

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: AppTheme.secondary,
                child: ClipOval(
                  child: Image.network(
                    'https://api.elbstream.com/logos/crypto/${position.tokenSymbol.toLowerCase()}',
                    width: 32,
                    height: 32,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Text(
                      position.tokenSymbol[0],
                      style: const TextStyle(fontWeight: FontWeight.bold),
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
                      '${position.amount.toStringAsFixed(2)} ${position.tokenSymbol}',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.foreground,
                      ),
                    ),
                    Text(
                      '${position.apyRate.toStringAsFixed(0)}% monthly',
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
                    '+${_formatCurrency(earnings)}',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.success,
                    ),
                  ),
                  Text(
                    isUnlocked ? 'Unlocked' : 'Locked',
                    style: TextStyle(
                      fontSize: 12,
                      color: isUnlocked ? AppTheme.success : AppTheme.mutedForeground,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(
                    Icons.access_time,
                    size: 14,
                    color: AppTheme.mutedForeground,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    isUnlocked
                        ? 'Ready to unstake'
                        : 'Unlocks ${_formatDate(unlockDate)}',
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppTheme.mutedForeground,
                    ),
                  ),
                ],
              ),
              if (isUnlocked)
                TextButton(
                  onPressed: () => _handleUnstake(position),
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  child: const Text(
                    'Unstake',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.primary,
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }

  void _handleUnstake(StakingPosition position) {
    // TODO: Implement unstake
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Unstake feature coming soon')),
    );
  }
}
