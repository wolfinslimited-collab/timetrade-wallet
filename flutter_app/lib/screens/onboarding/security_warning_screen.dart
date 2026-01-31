import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../theme/app_theme.dart';

class SecurityWarningScreen extends StatefulWidget {
  final VoidCallback onContinue;
  final VoidCallback onBack;

  const SecurityWarningScreen({
    super.key,
    required this.onContinue,
    required this.onBack,
  });

  @override
  State<SecurityWarningScreen> createState() => _SecurityWarningScreenState();
}

class _SecurityWarningScreenState extends State<SecurityWarningScreen> {
  bool _acknowledged = false;

  final List<_SecurityTip> _securityTips = [
    _SecurityTip(
      icon: Icons.visibility_outlined,
      title: 'Write it down',
      description: 'Write your seed phrase on paper and store it in a secure location. Never save it digitally.',
    ),
    _SecurityTip(
      icon: Icons.lock_outline,
      title: 'Keep it secret',
      description: 'Never share your seed phrase with anyone. Timetrade will never ask for it.',
    ),
    _SecurityTip(
      icon: Icons.shield_outlined,
      title: 'No screenshots',
      description: 'Never take screenshots or photos of your seed phrase. This compromises security.',
    ),
  ];

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
              Row(
                children: [
                  GestureDetector(
                    onTap: widget.onBack,
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
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'STEP 1 OF 3',
                        style: TextStyle(
                          fontSize: 10,
                          letterSpacing: 1.2,
                          color: AppTheme.mutedForeground,
                        ),
                      ),
                      const Text(
                        'Security First',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.foreground,
                        ),
                      ),
                    ],
                  ),
                ],
              ),

              const SizedBox(height: 24),

              // Warning Banner
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.accent.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.accent.withValues(alpha: 0.3)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppTheme.accent.withValues(alpha: 0.2),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.warning_amber_rounded,
                        color: AppTheme.accent,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Important Security Notice',
                            style: TextStyle(
                              fontWeight: FontWeight.w600,
                              color: AppTheme.accent,
                              fontSize: 14,
                            ),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Your seed phrase is the only way to recover your wallet. If you lose it, your funds are gone forever.',
                            style: TextStyle(
                              fontSize: 13,
                              color: AppTheme.mutedForeground,
                              height: 1.4,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Security Tips
              Expanded(
                child: ListView.separated(
                  itemCount: _securityTips.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final tip = _securityTips[index];
                    return Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppTheme.card,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.border),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: AppTheme.primary.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Icon(
                              tip.icon,
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
                                  tip.title,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w500,
                                    color: AppTheme.foreground,
                                    fontSize: 14,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  tip.description,
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: AppTheme.mutedForeground,
                                    height: 1.4,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),

              const SizedBox(height: 16),

              // Acknowledgment Checkbox
              GestureDetector(
                onTap: () {
                  HapticFeedback.lightImpact();
                  setState(() => _acknowledged = !_acknowledged);
                },
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: _acknowledged ? AppTheme.primary.withOpacity(0.1) : AppTheme.card,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: _acknowledged ? AppTheme.primary.withOpacity(0.5) : AppTheme.border,
                    ),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 20,
                        height: 20,
                        decoration: BoxDecoration(
                          color: _acknowledged ? AppTheme.primary : Colors.transparent,
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(
                            color: _acknowledged ? AppTheme.primary : AppTheme.border,
                            width: 2,
                          ),
                        ),
                        child: _acknowledged
                            ? const Icon(
                                Icons.check,
                                color: AppTheme.primaryForeground,
                                size: 14,
                              )
                            : null,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: RichText(
                          text: TextSpan(
                            style: TextStyle(
                              fontSize: 13,
                              color: AppTheme.foreground,
                              height: 1.4,
                            ),
                            children: const [
                              TextSpan(text: 'I understand that if I lose my seed phrase, I will '),
                              TextSpan(
                                text: 'permanently lose access',
                                style: TextStyle(fontWeight: FontWeight.bold),
                              ),
                              TextSpan(text: ' to my wallet and all funds.'),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // Continue Button
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: _acknowledged
                      ? () {
                          HapticFeedback.mediumImpact();
                          widget.onContinue();
                        }
                      : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    foregroundColor: AppTheme.primaryForeground,
                    disabledBackgroundColor: AppTheme.primary.withOpacity(0.5),
                    disabledForegroundColor: AppTheme.primaryForeground.withOpacity(0.5),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.check, size: 20),
                      SizedBox(width: 8),
                      Text(
                        'I Understand, Show Seed Phrase',
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 15,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}

class _SecurityTip {
  final IconData icon;
  final String title;
  final String description;

  const _SecurityTip({
    required this.icon,
    required this.title,
    required this.description,
  });
}
