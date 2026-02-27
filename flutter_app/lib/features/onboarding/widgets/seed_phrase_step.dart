import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../core/theme/app_theme.dart';

class SeedPhraseStep extends StatefulWidget {
  final List<String> seedPhrase;
  final VoidCallback onContinue;
  final VoidCallback onBack;
  const SeedPhraseStep({super.key, required this.seedPhrase, required this.onContinue, required this.onBack});

  @override
  State<SeedPhraseStep> createState() => _SeedPhraseStepState();
}

class _SeedPhraseStepState extends State<SeedPhraseStep> {
  bool _revealed = false;
  bool _copied = false;

  Future<void> _copy() async {
    await Clipboard.setData(ClipboardData(text: widget.seedPhrase.join(' ')));
    setState(() => _copied = true);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Copied! Remember to clear your clipboard.'), duration: Duration(seconds: 2)),
    );
    Future.delayed(const Duration(seconds: 3), () { if (mounted) setState(() => _copied = false); });
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                GestureDetector(
                  onTap: widget.onBack,
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(shape: BoxShape.circle, color: AppColors.card, border: Border.all(color: AppColors.border)),
                    child: const Icon(Icons.chevron_left, size: 20),
                  ),
                ),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('STEP 2 OF 3', style: TextStyle(fontSize: 11, color: AppColors.textMuted, letterSpacing: 1.5)),
                    const Text('Your Seed Phrase', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text('Write down these 12 words in order and store them safely.',
                style: TextStyle(fontSize: 14, color: AppColors.textSecondary)),
            const SizedBox(height: 24),

            // Seed phrase grid with blur
            Stack(
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
                  child: Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: widget.seedPhrase.asMap().entries.map((e) {
                      return Container(
                        width: (MediaQuery.of(context).size.width - 80) / 3,
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceLight.withOpacity(0.5),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Row(
                          children: [
                            Text('${e.key + 1}.', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                            const SizedBox(width: 4),
                            Text(e.value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, fontFamily: 'monospace')),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
                ),
                if (!_revealed)
                  Positioned.fill(
                    child: GestureDetector(
                      onTap: () => setState(() => _revealed = true),
                      child: Container(
                        decoration: BoxDecoration(
                          color: AppColors.card.withOpacity(0.8),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(shape: BoxShape.circle, color: AppColors.primary.withOpacity(0.1)),
                              child: const Icon(Icons.visibility, size: 24, color: AppColors.primary),
                            ),
                            const SizedBox(height: 12),
                            const Text('Tap to reveal', style: TextStyle(fontWeight: FontWeight.w500)),
                            Text('Make sure no one is watching', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                          ],
                        ),
                      ),
                    ),
                  ),
              ],
            ),

            if (_revealed) ...[
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _copy,
                      icon: Icon(_copied ? Icons.check : Icons.copy, size: 16, color: _copied ? AppColors.primary : null),
                      label: Text(_copied ? 'Copied!' : 'Copy'),
                      style: OutlinedButton.styleFrom(side: BorderSide(color: AppColors.border)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  OutlinedButton(
                    onPressed: () => setState(() => _revealed = false),
                    style: OutlinedButton.styleFrom(side: BorderSide(color: AppColors.border)),
                    child: const Icon(Icons.visibility_off, size: 16),
                  ),
                ],
              ),
            ],

            const SizedBox(height: 24),
            // Warning
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.destructive.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.destructive.withOpacity(0.3)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.refresh, size: 20, color: AppColors.destructive),
                  const SizedBox(width: 12),
                  Expanded(
                    child: RichText(
                      text: TextSpan(
                        style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
                        children: [
                          TextSpan(text: 'Never share ', style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.destructive)),
                          const TextSpan(text: 'your seed phrase with anyone. Timetrade support will '),
                          const TextSpan(text: 'never', style: TextStyle(fontWeight: FontWeight.w700)),
                          const TextSpan(text: ' ask for it.'),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const Spacer(),
            SizedBox(
              width: double.infinity, height: 56,
              child: ElevatedButton(
                onPressed: _revealed ? widget.onContinue : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  disabledBackgroundColor: AppColors.primary.withOpacity(0.3),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                child: const Text("I've Written It Down"),
              ),
            ),
            const SizedBox(height: 8),
            Center(child: Text("You'll need to verify your seed phrase next", style: TextStyle(fontSize: 12, color: AppColors.textMuted))),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}
