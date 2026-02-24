import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:timetrade_wallet/services/wallet_service.dart';
import 'package:timetrade_wallet/theme/app_theme.dart';
import 'package:timetrade_wallet/screens/home_screen.dart';

class LockScreen extends StatefulWidget {
  const LockScreen({super.key});

  @override
  State<LockScreen> createState() => _LockScreenState();
}

class _LockScreenState extends State<LockScreen> {
  String _pin = '';
  String? _error;

  void _onDigit(String digit) {
    if (_pin.length >= 6) return;
    HapticFeedback.lightImpact();
    setState(() {
      _pin += digit;
      _error = null;
    });
    if (_pin.length == 6) {
      Future.delayed(const Duration(milliseconds: 200), _validate);
    }
  }

  void _onDelete() {
    if (_pin.isEmpty) return;
    HapticFeedback.lightImpact();
    setState(() => _pin = _pin.substring(0, _pin.length - 1));
  }

  void _validate() {
    final wallet = context.read<WalletService>();
    if (wallet.validatePin(_pin)) {
      wallet.unlock();
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const HomeScreen()),
      );
    } else {
      HapticFeedback.heavyImpact();
      setState(() {
        _error = 'Incorrect PIN';
        _pin = '';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            const Spacer(),
            Image.asset('assets/images/app-logo.png', width: 64, height: 64,
              errorBuilder: (_, __, ___) => Icon(Icons.lock, size: 48, color: AppColors.primary),
            ),
            const SizedBox(height: 24),
            Text('Welcome back', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            Text('Enter your PIN to unlock', style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 32),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(6, (i) =>
                Container(
                  width: 14, height: 14,
                  margin: const EdgeInsets.symmetric(horizontal: 8),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: i < _pin.length ? AppColors.primary : Colors.transparent,
                    border: Border.all(
                      color: _error != null ? AppColors.destructive : (i < _pin.length ? AppColors.primary : AppColors.border),
                      width: 2,
                    ),
                  ),
                ),
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 16),
              Text(_error!, style: const TextStyle(color: AppColors.destructive, fontSize: 13)),
            ],
            const Spacer(),
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
                    return _keypadBtn(
                      child: const Icon(Icons.backspace_outlined, size: 22, color: AppColors.foreground),
                      onTap: _onDelete,
                    );
                  }
                  return _keypadBtn(
                    child: Text(key, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w500)),
                    onTap: () => _onDigit(key),
                  );
                }).toList(),
              ),
            ),
        ],
      ),
    );
  }

  Widget _keypadBtn({required Widget child, required VoidCallback onTap}) {
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
