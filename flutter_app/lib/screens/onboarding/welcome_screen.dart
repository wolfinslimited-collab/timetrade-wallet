import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
  final WalletService _walletService = WalletService();

  void _handleCreateWallet() {
    HapticFeedback.mediumImpact();
    
    // Generate seed phrase
    final seedPhrase = _walletService.generateSeedPhrase(wordCount: 12);
    
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => _CreateWalletFlow(
          seedPhrase: seedPhrase,
          walletService: _walletService,
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
          walletService: _walletService,
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
                                    color: Colors.black.withOpacity(0.3),
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
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: const [
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
                    backgroundColor: AppTheme.card.withOpacity(0.6),
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
          color: AppTheme.primary.withOpacity(0.7),
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
  final WalletService walletService;
  final VoidCallback onComplete;

  const _CreateWalletFlow({
    required this.seedPhrase,
    required this.walletService,
    required this.onComplete,
  });

  @override
  State<_CreateWalletFlow> createState() => _CreateWalletFlowState();
}

class _CreateWalletFlowState extends State<_CreateWalletFlow> {
  String _currentStep = 'security';
  String _walletName = 'Main Wallet';

  @override
  Widget build(BuildContext context) {
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
          onComplete: () async {
            // Store mnemonic for later encryption with PIN
            await widget.walletService.storeMnemonic(widget.seedPhrase.join(' '));
            setState(() => _currentStep = 'pin');
          },
          onBack: () => setState(() => _currentStep = 'seedphrase'),
        );

      case 'pin':
        return PinSetupScreen(
          onComplete: () => setState(() => _currentStep = 'biometric'),
          onBack: () => setState(() => _currentStep = 'verify'),
        );

      case 'biometric':
        return BiometricSetupScreen(
          onComplete: (enabled) async {
            await widget.walletService.setBiometric(enabled);
            setState(() => _currentStep = 'success');
          },
          onSkip: () async {
            await widget.walletService.setBiometric(false);
            setState(() => _currentStep = 'success');
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
  final WalletService walletService;
  final VoidCallback onComplete;

  const _ImportWalletFlow({
    required this.walletService,
    required this.onComplete,
  });

  @override
  State<_ImportWalletFlow> createState() => _ImportWalletFlowState();
}

class _ImportWalletFlowState extends State<_ImportWalletFlow> {
  String _currentStep = 'import';
  List<String> _importedPhrase = [];
  String _walletName = 'Main Wallet';

  @override
  Widget build(BuildContext context) {
    switch (_currentStep) {
      case 'import':
        return ImportWalletScreen(
          onComplete: (words) async {
            _importedPhrase = words;
            // Store mnemonic for later encryption with PIN
            await widget.walletService.storeMnemonic(words.join(' '));
            setState(() => _currentStep = 'pin');
          },
          onBack: () => Navigator.pop(context),
        );

      case 'pin':
        return PinSetupScreen(
          onComplete: () => setState(() => _currentStep = 'biometric'),
          onBack: () => setState(() => _currentStep = 'import'),
        );

      case 'biometric':
        return BiometricSetupScreen(
          onComplete: (enabled) async {
            await widget.walletService.setBiometric(enabled);
            setState(() => _currentStep = 'success');
          },
          onSkip: () async {
            await widget.walletService.setBiometric(false);
            setState(() => _currentStep = 'success');
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
