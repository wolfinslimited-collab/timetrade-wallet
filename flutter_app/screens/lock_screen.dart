import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../services/wallet_service.dart';

class LockScreen extends StatefulWidget {
  final VoidCallback onUnlock;

  const LockScreen({super.key, required this.onUnlock});

  @override
  State<LockScreen> createState() => _LockScreenState();
}

class _LockScreenState extends State<LockScreen> with SingleTickerProviderStateMixin {
  String _pin = '';
  int _attempts = 0;
  bool _isLocked = false;
  int _lockTimer = 0;
  bool _showError = false;
  late AnimationController _shakeController;
  late Animation<double> _shakeAnimation;

  @override
  void initState() {
    super.initState();
    _shakeController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    _shakeAnimation = Tween<double>(begin: 0, end: 10).chain(
      CurveTween(curve: Curves.elasticIn),
    ).animate(_shakeController);
  }

  @override
  void dispose() {
    _shakeController.dispose();
    super.dispose();
  }

  void _handleKeyPress(String digit) {
    if (_isLocked || _pin.length >= 6) return;
    
    HapticFeedback.lightImpact();
    setState(() {
      _pin += digit;
      _showError = false;
    });

    if (_pin.length == 6) {
      Future.delayed(const Duration(milliseconds: 200), _verifyPin);
    }
  }

  void _verifyPin() {
    final walletService = context.read<WalletService>();
    
    if (walletService.verifyPin(_pin)) {
      HapticFeedback.mediumImpact();
      widget.onUnlock();
    } else {
      _attempts++;
      _showError = true;
      _shakeController.forward().then((_) => _shakeController.reset());
      HapticFeedback.heavyImpact();
      
      if (_attempts >= 5) {
        setState(() {
          _isLocked = true;
          _lockTimer = 30;
        });
        _startLockTimer();
      }
      
      setState(() => _pin = '');
    }
  }

  void _startLockTimer() {
    Future.delayed(const Duration(seconds: 1), () {
      if (mounted && _lockTimer > 0) {
        setState(() => _lockTimer--);
        if (_lockTimer > 0) {
          _startLockTimer();
        } else {
          setState(() {
            _isLocked = false;
            _attempts = 0;
          });
        }
      }
    });
  }

  void _handleDelete() {
    if (_isLocked || _pin.isEmpty) return;
    HapticFeedback.lightImpact();
    setState(() {
      _pin = _pin.substring(0, _pin.length - 1);
      _showError = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // App Logo
                  Container(
                    width: 80,
                    height: 80,
                    child: Image.asset(
                      'assets/app-logo.png',
                      fit: BoxFit.contain,
                    ),
                  ),
                  const SizedBox(height: 24),
                  
                  // Title
                  const Text(
                    'Welcome Back',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.foreground,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Enter your PIN to unlock',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppTheme.mutedForeground,
                    ),
                  ),
                  const SizedBox(height: 32),
                  
                  // Lock timer
                  if (_isLocked)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppTheme.destructive.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppTheme.destructive.withOpacity(0.2)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.lock, size: 14, color: AppTheme.destructive),
                          const SizedBox(width: 8),
                          Text(
                            'Try again in ${_lockTimer}s',
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppTheme.destructive,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  
                  const SizedBox(height: 24),
                  
                  // PIN dots
                  AnimatedBuilder(
                    animation: _shakeAnimation,
                    builder: (context, child) {
                      return Transform.translate(
                        offset: Offset(_showError ? _shakeAnimation.value : 0, 0),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: List.generate(6, (index) {
                            final isFilled = index < _pin.length;
                            return Container(
                              width: 12,
                              height: 12,
                              margin: const EdgeInsets.symmetric(horizontal: 6),
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: isFilled
                                    ? (_showError ? AppTheme.destructive : AppTheme.primary)
                                    : AppTheme.mutedForeground.withOpacity(0.2),
                              ),
                            );
                          }),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
            
            // Keypad
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 48),
              child: GridView.count(
                shrinkWrap: true,
                crossAxisCount: 3,
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 1.3,
                physics: const NeverScrollableScrollPhysics(),
                children: [
                  ...List.generate(9, (i) => _buildKeypadButton('${i + 1}')),
                  const SizedBox(), // Empty space
                  _buildKeypadButton('0'),
                  _buildKeypadButton('⌫', isDelete: true),
                ],
              ),
            ),
            
            const SizedBox(height: 24),
            
            // Footer
            const Padding(
              padding: EdgeInsets.only(bottom: 24),
              child: Text(
                'Forgot PIN? Reset wallet from settings',
                style: TextStyle(
                  fontSize: 10,
                  color: AppTheme.mutedForeground,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildKeypadButton(String label, {bool isDelete = false}) {
    final isDisabled = _isLocked;
    
    return GestureDetector(
      onTap: isDisabled
          ? null
          : () => isDelete ? _handleDelete() : _handleKeyPress(label),
      child: Container(
        decoration: BoxDecoration(
          color: AppTheme.card.withOpacity(0.8),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppTheme.border.withOpacity(0.5)),
        ),
        child: Center(
          child: isDelete
              ? Icon(
                  Icons.backspace_outlined,
                  color: isDisabled
                      ? AppTheme.mutedForeground.withOpacity(0.4)
                      : AppTheme.mutedForeground,
                  size: 20,
                )
              : Text(
                  label,
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w500,
                    color: isDisabled
                        ? AppTheme.foreground.withOpacity(0.4)
                        : AppTheme.foreground,
                  ),
                ),
        ),
      ),
    );
  }
}
