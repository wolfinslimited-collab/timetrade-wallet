import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/app_theme.dart';

class PinKeypad extends StatelessWidget {
  final bool isLocked;
  final bool biometricAvailable;
  final ValueChanged<String> onKeyPress;
  final VoidCallback onDelete;
  final VoidCallback? onBiometric;
  final VoidCallback? onClear;

  const PinKeypad({
    super.key,
    this.isLocked = false,
    this.biometricAvailable = false,
    required this.onKeyPress,
    required this.onDelete,
    this.onBiometric,
    this.onClear,
  });

  Widget _buildButton(BuildContext context, {String? digit, Widget? child, VoidCallback? onTap}) {
    return GestureDetector(
      onTap: isLocked ? null : () {
        HapticFeedback.lightImpact();
        onTap?.call();
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 100),
        width: 76,
        height: 76,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: Colors.white.withOpacity(0.06),
          border: Border.all(color: Colors.white.withOpacity(0.08)),
          boxShadow: [
            BoxShadow(color: Colors.white.withOpacity(0.05), offset: const Offset(0, 1), blurRadius: 1, spreadRadius: 0),
            BoxShadow(color: Colors.black.withOpacity(0.3), offset: const Offset(0, 2), blurRadius: 4),
          ],
        ),
        child: Center(
          child: child ?? Text(
            digit ?? '',
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (int row = 0; row < 3; row++) ...[
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              for (int col = 0; col < 3; col++) ...[
                if (col > 0) const SizedBox(width: 12),
                _buildButton(context, digit: '${row * 3 + col + 1}', onTap: () => onKeyPress('${row * 3 + col + 1}')),
              ],
            ],
          ),
          const SizedBox(height: 12),
        ],
        // Bottom row
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Biometric / Clear
            if (biometricAvailable)
              _buildButton(context, child: Icon(Icons.fingerprint, color: AppColors.textSecondary, size: 24), onTap: onBiometric)
            else if (onClear != null)
              _buildButton(context, child: Text('Clear', style: TextStyle(fontSize: 14, color: AppColors.textMuted)), onTap: onClear)
            else
              const SizedBox(width: 76, height: 76),
            const SizedBox(width: 12),
            _buildButton(context, digit: '0', onTap: () => onKeyPress('0')),
            const SizedBox(width: 12),
            _buildButton(context, child: Icon(Icons.arrow_back, color: AppColors.textMuted, size: 24), onTap: onDelete),
          ],
        ),
      ],
    );
  }
}

class PinDots extends StatelessWidget {
  final int length;
  final int filled;
  final bool showError;

  const PinDots({super.key, this.length = 6, required this.filled, this.showError = false});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(length, (i) {
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 6),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            width: 24,
            height: 24,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: i < filled
                  ? (showError ? AppColors.destructive : AppColors.textPrimary)
                  : AppColors.textMuted.withOpacity(0.3),
            ),
          ),
        );
      }),
    );
  }
}
