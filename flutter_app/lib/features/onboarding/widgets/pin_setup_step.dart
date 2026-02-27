import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/pin_keypad.dart';

class PinSetupStep extends StatefulWidget {
  final Future<void> Function(String pin) onComplete;
  final VoidCallback onBack;
  const PinSetupStep({super.key, required this.onComplete, required this.onBack});

  @override
  State<PinSetupStep> createState() => _PinSetupStepState();
}

class _PinSetupStepState extends State<PinSetupStep> {
  String _step = 'create'; // 'create' or 'confirm'
  String _pin = '';
  String _confirmPin = '';

  String get _currentPin => _step == 'create' ? _pin : _confirmPin;

  void _onKeyPress(String digit) {
    if (_currentPin.length >= 6) return;
    final newPin = _currentPin + digit;
    setState(() {
      if (_step == 'create') {
        _pin = newPin;
      } else {
        _confirmPin = newPin;
      }
    });

    if (newPin.length == 6) {
      if (_step == 'create') {
        Future.delayed(const Duration(milliseconds: 300), () {
          setState(() => _step = 'confirm');
        });
      } else {
        if (newPin == _pin) {
          widget.onComplete(newPin);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text("PINs don't match. Try again."), backgroundColor: AppColors.destructive),
          );
          setState(() { _pin = ''; _confirmPin = ''; _step = 'create'; });
        }
      }
    }
  }

  void _onDelete() {
    setState(() {
      if (_step == 'create') {
        _pin = _pin.isNotEmpty ? _pin.substring(0, _pin.length - 1) : '';
      } else {
        _confirmPin = _confirmPin.isNotEmpty ? _confirmPin.substring(0, _confirmPin.length - 1) : '';
      }
    });
  }

  void _onClear() {
    setState(() {
      if (_step == 'create') { _pin = ''; } else { _confirmPin = ''; }
    });
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            // Header
            Row(
              children: [
                GestureDetector(
                  onTap: widget.onBack,
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white.withOpacity(0.06),
                      border: Border.all(color: Colors.white.withOpacity(0.08)),
                    ),
                    child: const Icon(Icons.chevron_left, size: 20),
                  ),
                ),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('SECURITY SETUP', style: TextStyle(fontSize: 11, color: AppColors.textMuted, letterSpacing: 1.5)),
                    Text(_step == 'create' ? 'Create PIN' : 'Confirm PIN', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
                  ],
                ),
              ],
            ),

            const Spacer(flex: 2),

            Text(
              _step == 'create' ? 'Create a 6-digit PIN to secure your wallet' : 'Re-enter your PIN to confirm',
              style: TextStyle(color: AppColors.textSecondary),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),

            PinDots(filled: _currentPin.length),
            const SizedBox(height: 40),

            PinKeypad(
              onKeyPress: _onKeyPress,
              onDelete: _onDelete,
              onClear: _onClear,
            ),

            const Spacer(),
          ],
        ),
      ),
    );
  }
}
