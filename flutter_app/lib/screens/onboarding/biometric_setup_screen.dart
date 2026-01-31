import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:local_auth/local_auth.dart';
import '../../theme/app_theme.dart';

class BiometricSetupScreen extends StatefulWidget {
  final Function(bool enabled) onComplete;
  final VoidCallback onSkip;

  const BiometricSetupScreen({
    super.key,
    required this.onComplete,
    required this.onSkip,
  });

  @override
  State<BiometricSetupScreen> createState() => _BiometricSetupScreenState();
}

class _BiometricSetupScreenState extends State<BiometricSetupScreen> {
  final LocalAuthentication _localAuth = LocalAuthentication();
  bool _isAvailable = false;
  bool _isEnabling = false;
  List<BiometricType> _availableBiometrics = [];

  @override
  void initState() {
    super.initState();
    _checkBiometricAvailability();
  }

  Future<void> _checkBiometricAvailability() async {
    try {
      final canAuthenticate = await _localAuth.canCheckBiometrics;
      final isDeviceSupported = await _localAuth.isDeviceSupported();
      
      if (canAuthenticate && isDeviceSupported) {
        final biometrics = await _localAuth.getAvailableBiometrics();
        setState(() {
          _isAvailable = biometrics.isNotEmpty;
          _availableBiometrics = biometrics;
        });
      }
    } catch (e) {
      debugPrint('Biometric check error: $e');
    }
  }

  String get _biometricLabel {
    if (_availableBiometrics.contains(BiometricType.face)) {
      return 'Face ID';
    } else if (_availableBiometrics.contains(BiometricType.fingerprint)) {
      return 'Fingerprint';
    } else if (_availableBiometrics.contains(BiometricType.iris)) {
      return 'Iris';
    }
    return 'Biometric';
  }

  Future<void> _handleEnableBiometric() async {
    setState(() => _isEnabling = true);
    HapticFeedback.mediumImpact();

    try {
      final authenticated = await _localAuth.authenticate(
        localizedReason: 'Authenticate to enable biometric unlock',
        options: const AuthenticationOptions(
          stickyAuth: true,
          biometricOnly: true,
        ),
      );

      if (authenticated) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('$_biometricLabel enabled!'),
              backgroundColor: AppTheme.primary,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          );
        }
        widget.onComplete(true);
      } else {
        setState(() => _isEnabling = false);
      }
    } catch (e) {
      debugPrint('Biometric enrollment error: $e');
      setState(() => _isEnabling = false);
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Biometric authentication failed. Please try again.'),
            backgroundColor: AppTheme.destructive,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'OPTIONAL',
                    style: TextStyle(
                      fontSize: 10,
                      letterSpacing: 1.2,
                      color: AppTheme.mutedForeground,
                    ),
                  ),
                  const Text(
                    'Enable Biometrics',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.foreground,
                    ),
                  ),
                ],
              ),

              const Spacer(),

              // Biometric Icon
              Center(
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    Container(
                      width: 128,
                      height: 128,
                      decoration: BoxDecoration(
                        color: AppTheme.primary.withOpacity(0.1),
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: AppTheme.primary.withOpacity(0.3),
                          width: 2,
                        ),
                      ),
                      child: Icon(
                        Icons.fingerprint,
                        size: 64,
                        color: AppTheme.primary,
                      ),
                    ),
                    if (_isEnabling)
                      SizedBox(
                        width: 136,
                        height: 136,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation(AppTheme.primary),
                        ),
                      ),
                  ],
                ),
              ),

              const SizedBox(height: 32),

              // Title
              Center(
                child: Text(
                  _isAvailable ? 'Quick & Secure Access' : 'Biometric Authentication',
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.foreground,
                  ),
                ),
              ),

              const SizedBox(height: 12),

              // Description
              Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Text(
                    _isAvailable
                        ? 'Use $_biometricLabel to unlock your wallet instantly without entering your PIN'
                        : 'Biometric authentication is not available on this device. You can still use your PIN to unlock.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 14,
                      color: AppTheme.mutedForeground,
                      height: 1.5,
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 32),

              // Benefits
              _buildBenefitCard(
                icon: Icons.shield_outlined,
                title: 'Enhanced Security',
                description: 'Your biometric data never leaves your device',
              ),
              
              const SizedBox(height: 12),
              
              _buildBenefitCard(
                icon: Icons.smartphone,
                title: 'Instant Access',
                description: 'Unlock in under a second',
              ),

              const Spacer(),

              // Actions
              if (_isAvailable)
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    onPressed: _isEnabling ? null : _handleEnableBiometric,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primary,
                      foregroundColor: AppTheme.primaryForeground,
                      disabledBackgroundColor: AppTheme.primary.withOpacity(0.7),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    child: _isEnabling
                        ? Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  valueColor: AlwaysStoppedAnimation(AppTheme.primaryForeground),
                                ),
                              ),
                              const SizedBox(width: 12),
                              const Text(
                                'Setting up...',
                                style: TextStyle(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 15,
                                ),
                              ),
                            ],
                          )
                        : Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.fingerprint, size: 20),
                              const SizedBox(width: 8),
                              const Text(
                                'Enable Biometrics',
                                style: TextStyle(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 15,
                                ),
                              ),
                            ],
                          ),
                  ),
                ),

              if (_isAvailable) const SizedBox(height: 12),

              SizedBox(
                width: double.infinity,
                height: 56,
                child: OutlinedButton(
                  onPressed: _isEnabling ? null : widget.onSkip,
                  style: OutlinedButton.styleFrom(
                    backgroundColor: AppTheme.card,
                    foregroundColor: AppTheme.foreground,
                    side: BorderSide(color: AppTheme.border),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        _isAvailable ? 'Skip for now' : 'Continue with PIN only',
                        style: const TextStyle(
                          fontWeight: FontWeight.w500,
                          fontSize: 15,
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Icon(Icons.chevron_right, size: 20),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBenefitCard({
    required IconData icon,
    required String title,
    required String description,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppTheme.primary.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              icon,
              color: AppTheme.primary,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.w500,
                    fontSize: 14,
                    color: AppTheme.foreground,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  description,
                  style: TextStyle(
                    fontSize: 12,
                    color: AppTheme.mutedForeground,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
