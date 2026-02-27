import 'dart:math';
import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class VerifySeedStep extends StatefulWidget {
  final List<String> seedPhrase;
  final VoidCallback onComplete;
  final VoidCallback onBack;
  const VerifySeedStep({super.key, required this.seedPhrase, required this.onComplete, required this.onBack});

  @override
  State<VerifySeedStep> createState() => _VerifySeedStepState();
}

class _VerifySeedStepState extends State<VerifySeedStep> {
  late List<int> _indices;
  late List<String> _options;
  List<String?> _selected = [null, null, null];
  int _currentSlot = 0;

  @override
  void initState() {
    super.initState();
    final rng = Random();
    final indices = <int>{};
    while (indices.length < 3) {
      indices.add(rng.nextInt(widget.seedPhrase.length));
    }
    _indices = indices.toList()..sort();

    final correct = _indices.map((i) => widget.seedPhrase[i]).toList();
    final others = widget.seedPhrase.where((w) => !correct.contains(w)).toList()..shuffle();
    _options = [...correct, ...others.take(6)]..shuffle();
  }

  void _selectWord(String word) {
    if (_currentSlot >= 3) return;
    setState(() {
      _selected[_currentSlot] = word;
      if (_currentSlot < 2) _currentSlot++;
    });
  }

  void _clearSlot(int i) {
    setState(() {
      _selected[i] = null;
      _currentSlot = i;
    });
  }

  void _verify() {
    final correct = _indices.asMap().entries.every((e) => _selected[e.key] == widget.seedPhrase[e.value]);
    if (correct) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Verification successful!')));
      widget.onComplete();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Incorrect words. Try again.'), backgroundColor: AppColors.destructive));
      setState(() { _selected = [null, null, null]; _currentSlot = 0; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final allFilled = _selected.every((w) => w != null);

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
                    Text('STEP 3 OF 3', style: TextStyle(fontSize: 11, color: AppColors.textMuted, letterSpacing: 1.5)),
                    const Text('Verify Seed Phrase', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text('Select the correct word for each position.', style: TextStyle(fontSize: 14, color: AppColors.textSecondary)),
            const SizedBox(height: 24),

            // Slots
            ...List.generate(3, (i) {
              final isActive = _currentSlot == i;
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: GestureDetector(
                  onTap: _selected[i] != null ? () => _clearSlot(i) : null,
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      color: isActive ? AppColors.primary.withOpacity(0.1) : AppColors.card,
                      border: Border.all(color: isActive ? AppColors.primary.withOpacity(0.5) : (_selected[i] != null ? AppColors.primary.withOpacity(0.3) : AppColors.border)),
                    ),
                    child: Row(
                      children: [
                        Text('Word #${_indices[i] + 1}', style: TextStyle(fontSize: 13, color: AppColors.textMuted, fontFamily: 'monospace')),
                        const SizedBox(width: 16),
                        Expanded(
                          child: _selected[i] != null
                              ? Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(_selected[i]!, style: const TextStyle(fontWeight: FontWeight.w500, fontFamily: 'monospace')),
                                    const Icon(Icons.close, size: 16, color: AppColors.textMuted),
                                  ],
                                )
                              : Text(isActive ? 'Select word below...' : '—', style: TextStyle(fontSize: 13, color: AppColors.textMuted)),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }),

            const SizedBox(height: 16),
            Row(
              children: [
                Icon(Icons.help_outline, size: 16, color: AppColors.textMuted),
                const SizedBox(width: 8),
                Text('Tap the correct word for position #${_indices[_currentSlot] + 1}',
                    style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
              ],
            ),
            const SizedBox(height: 12),

            // Options grid
            Wrap(
              spacing: 8, runSpacing: 8,
              children: _options.map((word) {
                final isUsed = _selected.contains(word);
                return GestureDetector(
                  onTap: isUsed ? null : () => _selectWord(word),
                  child: Container(
                    width: (MediaQuery.of(context).size.width - 64) / 3,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(8),
                      color: isUsed ? AppColors.surfaceLight.withOpacity(0.5) : AppColors.card,
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Center(
                      child: Text(word,
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, fontFamily: 'monospace',
                              color: isUsed ? AppColors.textMuted.withOpacity(0.5) : AppColors.textPrimary)),
                    ),
                  ),
                );
              }).toList(),
            ),

            const Spacer(),
            SizedBox(
              width: double.infinity, height: 56,
              child: ElevatedButton(
                onPressed: allFilled ? _verify : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  disabledBackgroundColor: AppColors.primary.withOpacity(0.3),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                child: const Text('Verify & Create Wallet'),
              ),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}
