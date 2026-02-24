import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:timetrade_wallet/services/wallet_service.dart';
import 'package:timetrade_wallet/theme/app_theme.dart';
import 'package:timetrade_wallet/screens/home_screen.dart';

class PinSetupScreen extends StatefulWidget {
  final String seedPhrase;
  final bool isImport;

  const PinSetupScreen({super.key, required this.seedPhrase, this.isImport = false});

  @override
  State<PinSetupScreen> createState() => _PinSetupScreenState();
}

class _PinSetupScreenState extends State<PinSetupScreen> {
  String _pin = '';
  String? _firstPin;
  String? _error;
  bool _isConfirming = false;

  void _onDigit(String digit) {
    if (_pin.length >= 6) return;
    HapticFeedback.lightImpact();
    setState(() {
      _pin += digit;
      _error = null;
    });
    if (_pin.length == 6) {
      Future.delayed(const Duration(milliseconds: 200), _submit);
    }
  }

  void _onDelete() {
    if (_pin.isEmpty) return;
    HapticFeedback.lightImpact();
    setState(() => _pin = _pin.substring(0, _pin.length - 1));
  }

  Future<void> _submit() async {
    if (!_isConfirming) {
      setState(() {
        _firstPin = _pin;
        _pin = '';
        _isConfirming = true;
      });
    } else {
      if (_pin == _firstPin) {
        final wallet = context.read<WalletService>();
        if (widget.isImport) {
          await wallet.importWallet(pin: _pin, seedPhrase: widget.seedPhrase);
        } else {
          await wallet.createWallet(pin: _pin, seedPhrase: widget.seedPhrase);
        }
        if (mounted) {
          Navigator.of(context).pushAndRemoveUntil(
            MaterialPageRoute(builder: (_) => const HomeScreen()),
            (_) => false,
          );
        }
      } else {
        setState(() {
          _error = 'PINs do not match. Try again.';
          _pin = '';
          _firstPin = null;
          _isConfirming = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Set PIN')),
      body: SafeArea(
        child: Column(
          children: [
            const Spacer(),
            Text(
              _isConfirming ? 'Confirm your PIN' : 'Create a 6-digit PIN',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'This PIN secures your wallet',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 32),
            // Pin dots
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(6, (i) =>
                Container(
                  width: 16, height: 16,
                  margin: const EdgeInsets.symmetric(horizontal: 8),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: i < _pin.length ? AppColors.primary : Colors.transparent,
                    border: Border.all(color: i < _pin.length ? AppColors.primary : AppColors.border, width: 2),
                  ),
                ),
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 16),
              Text(_error!, style: const TextStyle(color: AppColors.destructive, fontSize: 13)),
            ],
            const Spacer(),
            // Keypad
            _buildKeypad(),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildKeypad() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 48),
      child: Column(
        children: [
          for (final row in [['1','2','3'], ['4','5','6'], ['7','8','9'], ['','0','⌫']])
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: row.map((key) {
                  if (key.isEmpty) return const SizedBox(width: 72);
                  if (key == '⌫') {
                    return _keypadButton(
                      child: const Icon(Icons.backspace_outlined, size: 22, color: AppColors.foreground),
                      onTap: _onDelete,
                    );
                  }
                  return _keypadButton(
                    child: Text(key, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w500, color: AppColors.foreground)),
                    onTap: () => _onDigit(key),
                  );
                }).toList(),
              ),
            ),
        ],
      ),
    );
  }

  Widget _keypadButton({required Widget child, required VoidCallback onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 72, height: 72,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: AppColors.card,
          border: Border.all(color: AppColors.border.withOpacity(0.5)),
        ),
        child: child,
      ),
    );
  }
}
