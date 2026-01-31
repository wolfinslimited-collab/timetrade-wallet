import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../theme/app_theme.dart';
import '../../services/wallet_service.dart';
import 'security_warning_screen.dart';
import 'seed_phrase_screen.dart';
import 'verify_seed_screen.dart';
import 'pin_setup_screen.dart';
import 'biometric_setup_screen.dart';
import 'success_screen.dart';
import 'import_wallet_screen.dart';

class WelcomeScreen extends StatefulWidget {
  final VoidCallback onComplete;

  const WelcomeScreen({super.key, required this.onComplete});

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen> {
  void _handleCreateWallet() {
    HapticFeedback.mediumImpact();
    
    // Generate seed phrase using provider
    final walletService = context.read<WalletService>();
    final seedPhrase = walletService.generateSeedPhrase(wordCount: 12);
    
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => _CreateWalletFlow(
          seedPhrase: seedPhrase,
          onComplete: widget.onComplete,
        ),
      ),
    );
  }

  void _handleImportWallet() {
    HapticFeedback.mediumImpact();
    
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => _ImportWalletFlow(
          onComplete: widget.onComplete,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            children: [
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // App Logo
                    SizedBox(
                      width: 112,
                      height: 112,
                      child: Stack(
                        children: [
                          Image.asset(
                            'assets/images/app-logo.png',
                            fit: BoxFit.contain,
                            errorBuilder: (context, error, stackTrace) {
                              return Container(
                                width: 112,
                                height: 112,
                                decoration: BoxDecoration(
                                  color: AppTheme.card,
                                  borderRadius: BorderRadius.circular(24),
                                ),
                                child: const Icon(
                                  Icons.account_balance_wallet,
                                  size: 48,
                                  color: AppTheme.primary,
                                ),
                              );
                            },
                          ),
                          Positioned(
                            bottom: -1,
                            right: -1,
                            child: Container(
                              width: 36,
                              height: 36,
                              decoration: BoxDecoration(
                                color: AppTheme.primary,
                                shape: BoxShape.circle,
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.3),
                                    blurRadius: 8,
                                  ),
                                ],
                                border: Border.all(
                                  color: AppTheme.background,
                                  width: 2,
                                ),
                              ),
                              child: const Icon(
                                Icons.shield_outlined,
                                color: AppTheme.primaryForeground,
                                size: 18,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 40),

                    // Title with gradient
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          'Welcome to ',
                          style: TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.foreground,
                          ),
                        ),
                        GradientText(
                          text: 'Timetrade',
                          style: TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Description
                    const Text(
                      'Your secure, non-custodial crypto wallet\nwith multi-chain support',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 14,
                        color: AppTheme.mutedForeground,
                        height: 1.5,
                      ),
                    ),
                    const SizedBox(height: 40),

                    // Feature badges
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        _buildFeatureBadge('Multi-Chain'),
                        const SizedBox(width: 24),
                        _buildFeatureBadge('Self-Custody'),
                        const SizedBox(width: 24),
                        _buildFeatureBadge('Secure'),
                      ],
                    ),
                  ],
                ),
              ),

              // Action buttons
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: _handleCreateWallet,
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.add, size: 20),
                      SizedBox(width: 8),
                      Text('Create New Wallet'),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),

              SizedBox(
                width: double.infinity,
                height: 56,
                child: OutlinedButton(
                  onPressed: _handleImportWallet,
                  style: OutlinedButton.styleFrom(
                    backgroundColor: AppTheme.card.withValues(alpha: 0.6),
                  ),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.download, size: 20),
                      SizedBox(width: 8),
                      Text('Import Existing Wallet'),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Terms
              const Padding(
                padding: EdgeInsets.only(bottom: 24),
                child: Text(
                  'By continuing, you agree to our Terms of Service and Privacy Policy',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 10,
                    color: AppTheme.mutedForeground,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFeatureBadge(String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          Icons.auto_awesome,
          size: 12,
          color: AppTheme.primary.withValues(alpha: 0.7),
        ),
        const SizedBox(width: 4),
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            color: AppTheme.mutedForeground,
          ),
        ),
      ],
    );
  }
}

/// Create wallet flow - handles the full onboarding for new wallets
class _CreateWalletFlow extends StatefulWidget {
  final List<String> seedPhrase;
  final VoidCallback onComplete;

  const _CreateWalletFlow({
    required this.seedPhrase,
    required this.onComplete,
  });

  @override
  State<_CreateWalletFlow> createState() => _CreateWalletFlowState();
}

class _CreateWalletFlowState extends State<_CreateWalletFlow> {
  String _currentStep = 'security';
  final String _walletName = 'Main Wallet';
  String? _pin;
  bool _isProcessing = false;

  Future<void> _handlePinComplete(String pin) async {
    if (_isProcessing) return;
    
    setState(() {
      _isProcessing = true;
      _pin = pin;
    });

    try {
      final walletService = context.read<WalletService>();
      
      // Store mnemonic first, then set PIN
      await walletService.storeMnemonic(widget.seedPhrase.join(' '));
      await walletService.setPin(pin);
      
      if (mounted) {
        setState(() {
          _currentStep = 'biometric';
          _isProcessing = false;
        });
      }
    } catch (e) {
      debugPrint('PIN setup error: $e');
      if (mounted) {
        setState(() => _isProcessing = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error setting up PIN: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isProcessing) {
      return Scaffold(
        backgroundColor: AppTheme.background,
        body: const Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(color: AppTheme.primary),
              SizedBox(height: 24),
              Text(
                'Setting up your wallet...',
                style: TextStyle(color: AppTheme.foreground),
              ),
            ],
          ),
        ),
      );
    }

    switch (_currentStep) {
      case 'security':
        return SecurityWarningScreen(
          onContinue: () => setState(() => _currentStep = 'seedphrase'),
          onBack: () => Navigator.pop(context),
        );

      case 'seedphrase':
        return SeedPhraseScreen(
          seedPhrase: widget.seedPhrase,
          onContinue: () => setState(() => _currentStep = 'verify'),
          onBack: () => setState(() => _currentStep = 'security'),
        );

      case 'verify':
        return VerifySeedScreen(
          seedPhrase: widget.seedPhrase,
          onComplete: () {
            setState(() => _currentStep = 'pin');
          },
          onBack: () => setState(() => _currentStep = 'seedphrase'),
        );

      case 'pin':
        return PinSetupScreen(
          onComplete: _handlePinComplete,
          onBack: () => setState(() => _currentStep = 'verify'),
        );

      case 'biometric':
        return BiometricSetupScreen(
          onComplete: (enabled) async {
            final walletService = context.read<WalletService>();
            await walletService.setBiometric(enabled);
            if (mounted) {
              setState(() => _currentStep = 'success');
            }
          },
          onSkip: () async {
            final walletService = context.read<WalletService>();
            await walletService.setBiometric(false);
            if (mounted) {
              setState(() => _currentStep = 'success');
            }
          },
        );

      case 'success':
        return SuccessScreen(
          walletName: _walletName,
          onFinish: () {
            Navigator.of(context).popUntil((route) => route.isFirst);
            widget.onComplete();
          },
        );

      default:
        return const SizedBox();
    }
  }
}

/// Import wallet flow - handles the onboarding for imported wallets
class _ImportWalletFlow extends StatefulWidget {
  final VoidCallback onComplete;

  const _ImportWalletFlow({
    required this.onComplete,
  });

  @override
  State<_ImportWalletFlow> createState() => _ImportWalletFlowState();
}

class _ImportWalletFlowState extends State<_ImportWalletFlow> {
  String _currentStep = 'import';
  List<String> _importedPhrase = [];
  final String _walletName = 'Main Wallet';
  bool _isProcessing = false;

  Future<void> _handlePinComplete(String pin) async {
    if (_isProcessing) return;
    
    setState(() => _isProcessing = true);

    try {
      final walletService = context.read<WalletService>();
      
      // Store mnemonic first, then set PIN
      await walletService.storeMnemonic(_importedPhrase.join(' '));
      await walletService.setPin(pin);
      
      if (mounted) {
        setState(() {
          _currentStep = 'biometric';
          _isProcessing = false;
        });
      }
    } catch (e) {
      debugPrint('PIN setup error: $e');
      if (mounted) {
        setState(() => _isProcessing = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error setting up PIN: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isProcessing) {
      return Scaffold(
        backgroundColor: AppTheme.background,
        body: const Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(color: AppTheme.primary),
              SizedBox(height: 24),
              Text(
                'Setting up your wallet...',
                style: TextStyle(color: AppTheme.foreground),
              ),
            ],
          ),
        ),
      );
    }

    switch (_currentStep) {
      case 'import':
        return ImportWalletScreen(
          onComplete: (words) {
            _importedPhrase = words;
            setState(() => _currentStep = 'pin');
          },
          onBack: () => Navigator.pop(context),
        );

      case 'pin':
        return PinSetupScreen(
          onComplete: _handlePinComplete,
          onBack: () => setState(() => _currentStep = 'import'),
        );

      case 'biometric':
        return BiometricSetupScreen(
          onComplete: (enabled) async {
            final walletService = context.read<WalletService>();
            await walletService.setBiometric(enabled);
            if (mounted) {
              setState(() => _currentStep = 'success');
            }
          },
          onSkip: () async {
            final walletService = context.read<WalletService>();
            await walletService.setBiometric(false);
            if (mounted) {
              setState(() => _currentStep = 'success');
            }
          },
        );

      case 'success':
        return SuccessScreen(
          walletName: _walletName,
          onFinish: () {
            Navigator.of(context).popUntil((route) => route.isFirst);
            widget.onComplete();
          },
        );

      default:
        return const SizedBox();
    }
  }
}

/// Gradient text widget
class GradientText extends StatelessWidget {
  final String text;
  final TextStyle style;

  const GradientText({
    super.key,
    required this.text,
    required this.style,
  });

  @override
  Widget build(BuildContext context) {
    return ShaderMask(
      shaderCallback: (bounds) => const LinearGradient(
        colors: [AppTheme.primary, AppTheme.accent],
      ).createShader(bounds),
      child: Text(
        text,
        style: style.copyWith(color: Colors.white),
      ),
    );
  }
}
