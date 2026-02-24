import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:timetrade_wallet/theme/app_theme.dart';

class PinModal extends StatefulWidget {
  final String title;
  final String? subtitle;
  final ValueChanged<String> onComplete;

  const PinModal({
    super.key,
    this.title = 'Enter PIN',
    this.subtitle,
    required this.onComplete,
  });

  @override
  State<PinModal> createState() => _PinModalState();
}

class _PinModalState extends State<PinModal> {
  String _pin = '';

  void _onDigit(String d) {
    if (_pin.length >= 6) return;
    HapticFeedback.lightImpact();
    setState(() => _pin += d);
    if (_pin.length == 6) {
      Future.delayed(const Duration(milliseconds: 150), () => widget.onComplete(_pin));
    }
  }

  void _onDelete() {
    if (_pin.isEmpty) return;
    HapticFeedback.lightImpact();
    setState(() => _pin = _pin.substring(0, _pin.length - 1));
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
      decoration: const BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(widget.title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
          if (widget.subtitle != null) ...[
            const SizedBox(height: 4),
            Text(widget.subtitle!, style: const TextStyle(fontSize: 13, color: AppColors.mutedForeground)),
          ],
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(6, (i) =>
              Container(
                width: 14, height: 14,
                margin: const EdgeInsets.symmetric(horizontal: 6),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: i < _pin.length ? AppColors.primary : Colors.transparent,
                  border: Border.all(color: i < _pin.length ? AppColors.primary : AppColors.border, width: 2),
                ),
              ),
            ),
          ),
          const SizedBox(height: 32),
          _buildKeypad(),
        ],
      ),
    );
  }

  Widget _buildKeypad() {
    return Column(
      children: [
        for (final row in [['1','2','3'], ['4','5','6'], ['7','8','9'], ['','0','⌫']])
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: row.map((key) {
                if (key.isEmpty) return const SizedBox(width: 64);
                if (key == '⌫') {
                  return GestureDetector(
                    onTap: _onDelete,
                    child: Container(
                      width: 64, height: 64,
                      alignment: Alignment.center,
                      child: const Icon(Icons.backspace_outlined, size: 20),
                    ),
                  );
                }
                return GestureDetector(
                  onTap: () => _onDigit(key),
                  child: Container(
                    width: 64, height: 64,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.secondary,
                    ),
                    child: Text(key, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w500)),
                  ),
                );
              }).toList(),
            ),
          ),
      ],
    );
  }
}
