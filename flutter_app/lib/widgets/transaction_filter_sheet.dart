import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../theme/app_theme.dart';

class TransactionFilters {
  final DateTime? dateFrom;
  final DateTime? dateTo;
  final List<String> types;
  final List<String> statuses;
  final List<String> tokens;

  const TransactionFilters({
    this.dateFrom,
    this.dateTo,
    this.types = const [],
    this.statuses = const [],
    this.tokens = const [],
  });

  TransactionFilters copyWith({
    DateTime? dateFrom,
    DateTime? dateTo,
    List<String>? types,
    List<String>? statuses,
    List<String>? tokens,
    bool clearDateFrom = false,
    bool clearDateTo = false,
  }) {
    return TransactionFilters(
      dateFrom: clearDateFrom ? null : (dateFrom ?? this.dateFrom),
      dateTo: clearDateTo ? null : (dateTo ?? this.dateTo),
      types: types ?? this.types,
      statuses: statuses ?? this.statuses,
      tokens: tokens ?? this.tokens,
    );
  }

  int get activeCount {
    int count = 0;
    if (dateFrom != null) count++;
    if (dateTo != null) count++;
    if (types.isNotEmpty) count++;
    if (statuses.isNotEmpty) count++;
    if (tokens.isNotEmpty) count++;
    return count;
  }

  bool get hasActiveFilters => activeCount > 0;

  static const empty = TransactionFilters();
}

class TransactionFilterSheet extends StatefulWidget {
  final TransactionFilters filters;
  final List<String> availableTokens;
  final Function(TransactionFilters) onApply;
  final VoidCallback onClose;

  const TransactionFilterSheet({
    super.key,
    required this.filters,
    required this.availableTokens,
    required this.onApply,
    required this.onClose,
  });

  @override
  State<TransactionFilterSheet> createState() => _TransactionFilterSheetState();
}

class _TransactionFilterSheetState extends State<TransactionFilterSheet> {
  late TransactionFilters _localFilters;

  @override
  void initState() {
    super.initState();
    _localFilters = widget.filters;
  }

  void _toggleType(String type) {
    HapticFeedback.lightImpact();
    setState(() {
      final types = List<String>.from(_localFilters.types);
      if (types.contains(type)) {
        types.remove(type);
      } else {
        types.add(type);
      }
      _localFilters = _localFilters.copyWith(types: types);
    });
  }

  void _toggleStatus(String status) {
    HapticFeedback.lightImpact();
    setState(() {
      final statuses = List<String>.from(_localFilters.statuses);
      if (statuses.contains(status)) {
        statuses.remove(status);
      } else {
        statuses.add(status);
      }
      _localFilters = _localFilters.copyWith(statuses: statuses);
    });
  }

  void _toggleToken(String token) {
    HapticFeedback.lightImpact();
    setState(() {
      final tokens = List<String>.from(_localFilters.tokens);
      if (tokens.contains(token)) {
        tokens.remove(token);
      } else {
        tokens.add(token);
      }
      _localFilters = _localFilters.copyWith(tokens: tokens);
    });
  }

  void _handleReset() {
    HapticFeedback.mediumImpact();
    setState(() {
      _localFilters = TransactionFilters.empty;
    });
  }

  void _handleApply() {
    HapticFeedback.mediumImpact();
    widget.onApply(_localFilters);
    widget.onClose();
  }

  Future<void> _selectDateFrom() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _localFilters.dateFrom ?? DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: _localFilters.dateTo ?? DateTime.now(),
      builder: (context, child) {
        return Theme(
          data: ThemeData.dark().copyWith(
            colorScheme: const ColorScheme.dark(
              primary: AppTheme.primary,
              surface: AppTheme.card,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() {
        _localFilters = _localFilters.copyWith(dateFrom: picked);
      });
    }
  }

  Future<void> _selectDateTo() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _localFilters.dateTo ?? DateTime.now(),
      firstDate: _localFilters.dateFrom ?? DateTime(2020),
      lastDate: DateTime.now(),
      builder: (context, child) {
        return Theme(
          data: ThemeData.dark().copyWith(
            colorScheme: const ColorScheme.dark(
              primary: AppTheme.primary,
              surface: AppTheme.card,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() {
        _localFilters = _localFilters.copyWith(dateTo: picked);
      });
    }
  }

  String _formatDate(DateTime date) {
    final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${months[date.month - 1]} ${date.day}, ${date.year}';
  }

  @override
  Widget build(BuildContext context) {
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
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Filter Transactions',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.foreground,
                  ),
                ),
                if (_localFilters.hasActiveFilters)
                  GestureDetector(
                    onTap: _handleReset,
                    child: Row(
                      children: [
                        const Icon(Icons.close, size: 16, color: AppTheme.mutedForeground),
                        const SizedBox(width: 4),
                        const Text(
                          'Reset',
                          style: TextStyle(
                            fontSize: 14,
                            color: AppTheme.mutedForeground,
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          // Content
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Date Range
                  const Text(
                    'Date Range',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.foreground,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: _selectDateFrom,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                            decoration: BoxDecoration(
                              color: AppTheme.card,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppTheme.border),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.calendar_today, size: 16, color: AppTheme.mutedForeground),
                                const SizedBox(width: 8),
                                Text(
                                  _localFilters.dateFrom != null
                                      ? _formatDate(_localFilters.dateFrom!)
                                      : 'From',
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: _localFilters.dateFrom != null
                                        ? AppTheme.foreground
                                        : AppTheme.mutedForeground,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: GestureDetector(
                          onTap: _selectDateTo,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                            decoration: BoxDecoration(
                              color: AppTheme.card,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppTheme.border),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.calendar_today, size: 16, color: AppTheme.mutedForeground),
                                const SizedBox(width: 8),
                                Text(
                                  _localFilters.dateTo != null
                                      ? _formatDate(_localFilters.dateTo!)
                                      : 'To',
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: _localFilters.dateTo != null
                                        ? AppTheme.foreground
                                        : AppTheme.mutedForeground,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Transaction Type
                  const Text(
                    'Transaction Type',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.foreground,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _buildTypeChip('send', '↗ Send'),
                      _buildTypeChip('receive', '↙ Receive'),
                      _buildTypeChip('swap', '⇄ Swap'),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Status
                  const Text(
                    'Status',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.foreground,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _buildStatusChip('completed', '✓ Completed', AppTheme.success),
                      _buildStatusChip('pending', '◔ Pending', AppTheme.accent),
                      _buildStatusChip('failed', '✕ Failed', AppTheme.destructive),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Token
                  if (widget.availableTokens.isNotEmpty) ...[
                    const Text(
                      'Token',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.foreground,
                      ),
                    ),
                    const SizedBox(height: 12),
                    ...widget.availableTokens.map((token) => _buildTokenRow(token)),
                  ],
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
          // Apply Button
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              border: Border(top: BorderSide(color: AppTheme.border)),
            ),
            child: SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: _handleApply,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primary,
                  foregroundColor: AppTheme.primaryForeground,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.check, size: 18),
                    SizedBox(width: 8),
                    Text(
                      'Apply Filters',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTypeChip(String type, String label) {
    final isSelected = _localFilters.types.contains(type);
    return GestureDetector(
      onTap: () => _toggleType(type),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primary : AppTheme.card,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? AppTheme.primary : AppTheme.border,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: isSelected ? AppTheme.primaryForeground : AppTheme.mutedForeground,
          ),
        ),
      ),
    );
  }

  Widget _buildStatusChip(String status, String label, Color activeColor) {
    final isSelected = _localFilters.statuses.contains(status);
    return GestureDetector(
      onTap: () => _toggleStatus(status),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? activeColor : AppTheme.card,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? activeColor : AppTheme.border,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: isSelected ? Colors.white : AppTheme.mutedForeground,
          ),
        ),
      ),
    );
  }

  Widget _buildTokenRow(String token) {
    final isSelected = _localFilters.tokens.contains(token);
    return GestureDetector(
      onTap: () => _toggleToken(token),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppTheme.card,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppTheme.primary.withOpacity(0.3) : AppTheme.border,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 20,
              height: 20,
              decoration: BoxDecoration(
                color: isSelected ? AppTheme.primary : Colors.transparent,
                borderRadius: BorderRadius.circular(4),
                border: Border.all(
                  color: isSelected ? AppTheme.primary : AppTheme.mutedForeground,
                  width: 2,
                ),
              ),
              child: isSelected
                  ? const Icon(Icons.check, size: 14, color: AppTheme.primaryForeground)
                  : null,
            ),
            const SizedBox(width: 12),
            Text(
              token,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppTheme.foreground,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
