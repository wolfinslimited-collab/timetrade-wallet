import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../theme/app_theme.dart';

class SeedPhraseScreen extends StatefulWidget {
  final List<String> seedPhrase;
  final VoidCallback onContinue;
  final VoidCallback onBack;

  const SeedPhraseScreen({
    super.key,
    required this.seedPhrase,
    required this.onContinue,
    required this.onBack,
  });

  @override
  State<SeedPhraseScreen> createState() => _SeedPhraseScreenState();
}

class _SeedPhraseScreenState extends State<SeedPhraseScreen> {
  bool _isRevealed = false;
  bool _hasCopied = false;

  Future<void> _handleCopy() async {
    HapticFeedback.mediumImpact();
    await Clipboard.setData(ClipboardData(text: widget.seedPhrase.join(' ')));
    
    setState(() => _hasCopied = true);
    
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Copied! Remember to clear your clipboard after writing it down.'),
          backgroundColor: AppTheme.card,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
    }
    
    Future.delayed(const Duration(seconds: 3), () {
      if (mounted) {
        setState(() => _hasCopied = false);
      }
    });
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
                        'STEP 2 OF 3',
                        style: TextStyle(
                          fontSize: 10,
                          letterSpacing: 1.2,
                          color: AppTheme.mutedForeground,
                        ),
                      ),
                      const Text(
                        'Your Seed Phrase',
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

              const SizedBox(height: 16),

              Text(
                'Write down these ${widget.seedPhrase.length} words in order and store them safely. This is your wallet backup.',
                style: TextStyle(
                  fontSize: 14,
                  color: AppTheme.mutedForeground,
                  height: 1.4,
                ),
              ),

              const SizedBox(height: 24),

              // Seed Phrase Grid
              Expanded(
                child: Stack(
                  children: [
                    // Words Grid
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppTheme.card,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppTheme.border),
                      ),
                      child: GridView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 3,
                          mainAxisSpacing: 8,
                          crossAxisSpacing: 8,
                          childAspectRatio: 2.5,
                        ),
                        itemCount: widget.seedPhrase.length,
                        itemBuilder: (context, index) {
                          return AnimatedOpacity(
                            duration: const Duration(milliseconds: 200),
                            opacity: _isRevealed ? 1.0 : 0.0,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                              decoration: BoxDecoration(
                                color: AppTheme.secondary.withOpacity(0.5),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: AppTheme.border),
                              ),
                              child: Row(
                                children: [
                                  Text(
                                    '${index + 1}.',
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: AppTheme.mutedForeground,
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  Expanded(
                                    child: Text(
                                      widget.seedPhrase[index],
                                      style: const TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w500,
                                        fontFamily: 'monospace',
                                        color: AppTheme.foreground,
                                      ),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),

                    // Blur Overlay
                    if (!_isRevealed)
                      Positioned.fill(
                        child: GestureDetector(
                          onTap: () {
                            HapticFeedback.mediumImpact();
                            setState(() => _isRevealed = true);
                          },
                          child: Container(
                            decoration: BoxDecoration(
                              color: AppTheme.card.withOpacity(0.9),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: AppTheme.border),
                            ),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: AppTheme.primary.withOpacity(0.1),
                                    shape: BoxShape.circle,
                                  ),
                                  child: Icon(
                                    Icons.visibility,
                                    color: AppTheme.primary,
                                    size: 24,
                                  ),
                                ),
                                const SizedBox(height: 12),
                                const Text(
                                  'Tap to reveal',
                                  style: TextStyle(
                                    fontWeight: FontWeight.w500,
                                    color: AppTheme.foreground,
                                    fontSize: 14,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Make sure no one is watching',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: AppTheme.mutedForeground,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),

              // Actions (Copy / Hide)
              if (_isRevealed) ...[
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _handleCopy,
                        style: OutlinedButton.styleFrom(
                          backgroundColor: AppTheme.card,
                          foregroundColor: AppTheme.foreground,
                          side: BorderSide(color: AppTheme.border),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              _hasCopied ? Icons.check : Icons.copy,
                              size: 18,
                              color: _hasCopied ? AppTheme.primary : null,
                            ),
                            const SizedBox(width: 8),
                            Text(_hasCopied ? 'Copied!' : 'Copy'),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    OutlinedButton(
                      onPressed: () {
                        HapticFeedback.lightImpact();
                        setState(() => _isRevealed = false);
                      },
                      style: OutlinedButton.styleFrom(
                        backgroundColor: AppTheme.card,
                        foregroundColor: AppTheme.foreground,
                        side: BorderSide(color: AppTheme.border),
                        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Icon(Icons.visibility_off, size: 18),
                    ),
                  ],
                ),
              ],

              const SizedBox(height: 16),

              // Warning Box
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.destructive.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.destructive.withOpacity(0.3)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      Icons.sync_problem,
                      color: AppTheme.destructive,
                      size: 20,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: RichText(
                        text: TextSpan(
                          style: TextStyle(
                            fontSize: 13,
                            color: AppTheme.mutedForeground,
                            height: 1.4,
                          ),
                          children: [
                            TextSpan(
                              text: 'Never share ',
                              style: TextStyle(
                                color: AppTheme.destructive,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const TextSpan(text: 'your seed phrase with anyone. Timetrade support will '),
                            const TextSpan(
                              text: 'never',
                              style: TextStyle(fontWeight: FontWeight.bold),
                            ),
                            const TextSpan(text: ' ask for it.'),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Continue Button
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: _isRevealed
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
                  child: const Text(
                    "I've Written It Down",
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 15,
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 8),

              Center(
                child: Text(
                  "You'll need to verify your seed phrase next",
                  style: TextStyle(
                    fontSize: 12,
                    color: AppTheme.mutedForeground,
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
