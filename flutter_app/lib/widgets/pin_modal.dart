import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/app_theme.dart';

class PinModal extends StatefulWidget {
  final String title;
  final String? subtitle;
  final Future<void> Function(String pin) onPinEntered;
  final VoidCallback? onCancel;

  const PinModal({
    super.key,
    required this.title,
    this.subtitle,
    required this.onPinEntered,
    this.onCancel,
  });

  @override
  State<PinModal> createState() => _PinModalState();
}

class _PinModalState extends State<PinModal> {
  String _pin = '';
  bool _isLoading = false;
  String? _error;

  void _handleKeyPress(String digit) {
    if (_isLoading || _pin.length >= 6) return;

    HapticFeedback.lightImpact();
    setState(() {
      _pin += digit;
      _error = null;
    });

    if (_pin.length == 6) {
      _submitPin();
    }
  }

  void _handleDelete() {
    if (_isLoading || _pin.isEmpty) return;

    HapticFeedback.lightImpact();
    setState(() {
      _pin = _pin.substring(0, _pin.length - 1);
      _error = null;
    });
  }

  Future<void> _submitPin() async {
    setState(() => _isLoading = true);

    try {
      await widget.onPinEntered(_pin);
    } catch (e) {
      HapticFeedback.heavyImpact();
      setState(() {
        _error = e.toString().replaceAll('Exception: ', '');
        _pin = '';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: AppTheme.card,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(24),
      ),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const SizedBox(width: 40),
                Expanded(
                  child: Text(
                    widget.title,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.foreground,
                    ),
                  ),
                ),
                IconButton(
                  onPressed: widget.onCancel ?? () => Navigator.pop(context),
                  icon: const Icon(Icons.close, size: 20),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
              ],
            ),

            if (widget.subtitle != null) ...[
              const SizedBox(height: 8),
              Text(
                widget.subtitle!,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 14,
                  color: AppTheme.mutedForeground,
                ),
              ),
            ],

            const SizedBox(height: 24),

            // Error message
            if (_error != null)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: AppTheme.destructive.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppTheme.destructive.withOpacity(0.2)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, size: 16, color: AppTheme.destructive),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _error!,
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppTheme.destructive,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

            // PIN dots
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(6, (index) {
                final isFilled = index < _pin.length;
                return Container(
                  width: 14,
                  height: 14,
                  margin: const EdgeInsets.symmetric(horizontal: 6),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: isFilled
                        ? (_error != null ? AppTheme.destructive : AppTheme.primary)
                        : AppTheme.mutedForeground.withOpacity(0.2),
                  ),
                );
              }),
            ),

            const SizedBox(height: 24),

            // Loading indicator
            if (_isLoading)
              const Padding(
                padding: EdgeInsets.only(bottom: 24),
                child: CircularProgressIndicator(color: AppTheme.primary),
              ),

            // Keypad
            if (!_isLoading)
              SizedBox(
                width: 220,
                child: GridView.count(
                  shrinkWrap: true,
                  crossAxisCount: 3,
                  mainAxisSpacing: 8,
                  crossAxisSpacing: 8,
                  childAspectRatio: 1.3,
                  physics: const NeverScrollableScrollPhysics(),
                  children: [
                    ...List.generate(9, (i) => _buildKeypadButton('${i + 1}')),
                    const SizedBox(),
                    _buildKeypadButton('0'),
                    _buildKeypadButton('⌫', isDelete: true),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildKeypadButton(String label, {bool isDelete = false}) {
    return GestureDetector(
      onTap: () => isDelete ? _handleDelete() : _handleKeyPress(label),
      child: Container(
        decoration: BoxDecoration(
          color: AppTheme.background,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppTheme.border),
        ),
        child: Center(
          child: isDelete
              ? const Icon(Icons.backspace_outlined, size: 18, color: AppTheme.mutedForeground)
              : Text(
                  label,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w500,
                    color: AppTheme.foreground,
                  ),
                ),
        ),
      ),
    );
  }
}
