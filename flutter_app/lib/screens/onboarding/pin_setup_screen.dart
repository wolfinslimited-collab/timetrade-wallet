import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../theme/app_theme.dart';

class PinSetupScreen extends StatefulWidget {
  final Function(String pin) onComplete;
  final VoidCallback? onBack;

  const PinSetupScreen({
    super.key,
    required this.onComplete,
    this.onBack,
  });

  @override
  State<PinSetupScreen> createState() => _PinSetupScreenState();
}

class _PinSetupScreenState extends State<PinSetupScreen> {
  String _pin = '';
  String _confirmPin = '';
  bool _isConfirming = false;
  String? _error;
  bool _isSubmitting = false;

  void _handleKeyPress(String key) {
    if (_isSubmitting) return;
    
    HapticFeedback.lightImpact();
    
    setState(() {
      _error = null;
      
      if (_isConfirming) {
        if (_confirmPin.length < 6) {
          _confirmPin += key;
          
          if (_confirmPin.length == 6) {
            _validatePins();
          }
        }
      } else {
        if (_pin.length < 6) {
          _pin += key;
          
          if (_pin.length == 6) {
            Future.delayed(const Duration(milliseconds: 200), () {
              if (mounted) {
                setState(() => _isConfirming = true);
              }
            });
          }
        }
      }
    });
  }

  void _handleDelete() {
    if (_isSubmitting) return;
    
    HapticFeedback.lightImpact();
    
    setState(() {
      if (_isConfirming) {
        if (_confirmPin.isNotEmpty) {
          _confirmPin = _confirmPin.substring(0, _confirmPin.length - 1);
        }
      } else {
        if (_pin.isNotEmpty) {
          _pin = _pin.substring(0, _pin.length - 1);
        }
      }
    });
  }

  void _validatePins() {
    if (_pin != _confirmPin) {
      setState(() {
        _error = 'PINs do not match. Please try again.';
        _confirmPin = '';
      });
      HapticFeedback.heavyImpact();
      return;
    }

    // PINs match - call onComplete with the PIN
    setState(() => _isSubmitting = true);
    
    // Call the callback - parent will handle storage
    widget.onComplete(_pin);
  }

  @override
  Widget build(BuildContext context) {
    final currentPin = _isConfirming ? _confirmPin : _pin;
    
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  if (widget.onBack != null || _isConfirming)
                    GestureDetector(
                      onTap: _isSubmitting ? null : () {
                        if (_isConfirming) {
                          setState(() {
                            _isConfirming = false;
                            _confirmPin = '';
                            _error = null;
                          });
                        } else {
                          widget.onBack?.call();
                        }
                      },
                      child: Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: AppTheme.card,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: AppTheme.border),
                        ),
                        child: const Icon(
                          Icons.chevron_left,
                          color: AppTheme.foreground,
                        ),
                      ),
                    ),
                ],
              ),
            ),

            const Spacer(),

            // Lock Icon
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: AppTheme.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(40),
              ),
              child: const Icon(
                Icons.lock_outline,
                size: 40,
                color: AppTheme.primary,
              ),
            ),

            const SizedBox(height: 24),

            // Title
            Text(
              _isConfirming ? 'Confirm Your PIN' : 'Create a PIN',
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: AppTheme.foreground,
              ),
            ),

            const SizedBox(height: 8),

            Text(
              _isConfirming 
                  ? 'Re-enter your 6-digit PIN'
                  : 'Enter a 6-digit PIN to secure your wallet',
              style: const TextStyle(
                fontSize: 14,
                color: AppTheme.mutedForeground,
              ),
            ),

            const SizedBox(height: 32),

            // PIN Dots
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(6, (index) {
                final isFilled = index < currentPin.length;
                return Container(
                  width: 16,
                  height: 16,
                  margin: const EdgeInsets.symmetric(horizontal: 8),
                  decoration: BoxDecoration(
                    color: isFilled ? AppTheme.primary : Colors.transparent,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: _error != null 
                          ? AppTheme.destructive 
                          : (isFilled ? AppTheme.primary : AppTheme.border),
                      width: 2,
                    ),
                  ),
                );
              }),
            ),

            // Error Message
            if (_error != null) ...[
              const SizedBox(height: 16),
              Text(
                _error!,
                style: const TextStyle(
                  color: AppTheme.destructive,
                  fontSize: 14,
                ),
              ),
            ],

            // Loading indicator
            if (_isSubmitting) ...[
              const SizedBox(height: 24),
              const CircularProgressIndicator(color: AppTheme.primary),
              const SizedBox(height: 8),
              const Text(
                'Setting up...',
                style: TextStyle(color: AppTheme.mutedForeground),
              ),
            ],

            const Spacer(),

            // Numpad
            if (!_isSubmitting)
              Padding(
                padding: const EdgeInsets.all(24),
                child: _buildNumpad(),
              ),

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildNumpad() {
    final keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];
    
    return GridView.count(
      shrinkWrap: true,
      crossAxisCount: 3,
      mainAxisSpacing: 16,
      crossAxisSpacing: 24,
      childAspectRatio: 1.3,
      physics: const NeverScrollableScrollPhysics(),
      children: keys.map((key) {
        if (key.isEmpty) {
          return const SizedBox();
        }
        
        return GestureDetector(
          onTap: () {
            if (key == 'del') {
              _handleDelete();
            } else {
              _handleKeyPress(key);
            }
          },
          child: Container(
            decoration: BoxDecoration(
              color: key == 'del' ? Colors.transparent : AppTheme.card,
              borderRadius: BorderRadius.circular(16),
              border: key == 'del' ? null : Border.all(color: AppTheme.border),
            ),
            child: Center(
              child: key == 'del'
                  ? const Icon(
                      Icons.backspace_outlined,
                      color: AppTheme.foreground,
                      size: 24,
                    )
                  : Text(
                      key,
                      style: const TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w500,
                        color: AppTheme.foreground,
                      ),
                    ),
            ),
          ),
        );
      }).toList(),
    );
  }
}
