import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class SecurityWarningStep extends StatefulWidget {
  final VoidCallback onContinue;
  final VoidCallback onBack;
  const SecurityWarningStep({super.key, required this.onContinue, required this.onBack});

  @override
  State<SecurityWarningStep> createState() => _SecurityWarningStepState();
}

class _SecurityWarningStepState extends State<SecurityWarningStep> {
  bool _acknowledged = false;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                _BackButton(onTap: widget.onBack),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('STEP 1 OF 3', style: TextStyle(fontSize: 11, color: AppColors.textMuted, letterSpacing: 1.5)),
                    const Text('Security First', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Warning banner
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.accent.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.accent.withOpacity(0.3)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(shape: BoxShape.circle, color: AppColors.accent.withOpacity(0.2)),
                    child: const Icon(Icons.warning_amber, size: 20, color: AppColors.accent),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Important Security Notice', style: TextStyle(fontWeight: FontWeight.w600, color: AppColors.accent)),
                        const SizedBox(height: 4),
                        Text(
                          'Your seed phrase is the only way to recover your wallet. If you lose it, your funds are gone forever.',
                          style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Tips
            ...[
              _SecurityTip(icon: Icons.visibility, title: 'Write it down', desc: 'Write your seed phrase on paper and store it in a secure location. Never save it digitally.'),
              _SecurityTip(icon: Icons.lock, title: 'Keep it secret', desc: 'Never share your seed phrase with anyone. Timetrade will never ask for it.'),
              _SecurityTip(icon: Icons.shield, title: 'No screenshots', desc: 'Never take screenshots or photos of your seed phrase. This compromises security.'),
            ],

            const Spacer(),

            // Acknowledgment
            GestureDetector(
              onTap: () => setState(() => _acknowledged = !_acknowledged),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  color: _acknowledged ? AppColors.primary.withOpacity(0.1) : AppColors.card,
                  border: Border.all(color: _acknowledged ? AppColors.primary.withOpacity(0.5) : AppColors.border),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 24, height: 24,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: _acknowledged ? AppColors.primary : AppColors.border, width: 2),
                        color: _acknowledged ? AppColors.primary : Colors.transparent,
                      ),
                      child: _acknowledged ? const Icon(Icons.check, size: 16, color: Colors.white) : null,
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Text(
                        'I understand that if I lose my seed phrase, I will permanently lose access to my wallet and all funds.',
                        style: TextStyle(fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity, height: 56,
              child: ElevatedButton.icon(
                onPressed: _acknowledged ? widget.onContinue : null,
                icon: const Icon(Icons.check, size: 20),
                label: const Text('I Understand, Show Seed Phrase'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  disabledBackgroundColor: AppColors.primary.withOpacity(0.3),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
              ),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}

class _SecurityTip extends StatelessWidget {
  final IconData icon;
  final String title;
  final String desc;
  const _SecurityTip({required this.icon, required this.title, required this.desc});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.card, borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(borderRadius: BorderRadius.circular(8), color: AppColors.primary.withOpacity(0.1)),
              child: Icon(icon, size: 20, color: AppColors.primary),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.w500)),
                  const SizedBox(height: 4),
                  Text(desc, style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BackButton extends StatelessWidget {
  final VoidCallback onTap;
  const _BackButton({required this.onTap});
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(shape: BoxShape.circle, color: AppColors.card, border: Border.all(color: AppColors.border)),
        child: const Icon(Icons.chevron_left, size: 20),
      ),
    );
  }
}
