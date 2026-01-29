import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

class WelcomeScreen extends StatelessWidget {
  final VoidCallback onComplete;

  const WelcomeScreen({super.key, required this.onComplete});

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
                    // App Logo (no rounded corners per user request)
                    SizedBox(
                      width: 112,
                      height: 112,
                      child: Stack(
                        children: [
                          Image.asset(
                            'assets/images/app-logo.png',
                            fit: BoxFit.contain,
                          ),
                          Positioned(
                            bottom: -2,
                            right: -2,
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
                      children: [
                        const Text(
                          'Welcome to ',
                          style: TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.foreground,
                          ),
                        ),
                        const GradientText(
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
                  onPressed: () {
                    // Navigate to create wallet flow
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const _SecurityWarningScreen(),
                      ),
                    );
                  },
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
                  onPressed: () {
                    // Navigate to import wallet flow
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const _ImportWalletScreen(),
                      ),
                    );
                  },
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

// Placeholder screens - implement fully based on React components
class _SecurityWarningScreen extends StatelessWidget {
  const _SecurityWarningScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: const Center(
        child: Text(
          'Security Warning Screen\n(Implement based on SecurityWarningStep.tsx)',
          textAlign: TextAlign.center,
          style: TextStyle(color: AppTheme.mutedForeground),
        ),
      ),
    );
  }
}

class _ImportWalletScreen extends StatelessWidget {
  const _ImportWalletScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: const Center(
        child: Text(
          'Import Wallet Screen\n(Implement based on ImportWalletStep.tsx)',
          textAlign: TextAlign.center,
          style: TextStyle(color: AppTheme.mutedForeground),
        ),
      ),
    );
  }
}
