import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../theme/app_theme.dart';

class VerifySeedScreen extends StatefulWidget {
  final List<String> seedPhrase;
  final VoidCallback onComplete;
  final VoidCallback onBack;

  const VerifySeedScreen({
    super.key,
    required this.seedPhrase,
    required this.onComplete,
    required this.onBack,
  });

  @override
  State<VerifySeedScreen> createState() => _VerifySeedScreenState();
}

class _VerifySeedScreenState extends State<VerifySeedScreen> {
  late List<int> _verificationIndices;
  late List<String?> _selectedWords;
  late List<String> _wordOptions;
  int _currentSlot = 0;

  @override
  void initState() {
    super.initState();
    _generateVerificationChallenge();
  }

  void _generateVerificationChallenge() {
    final random = Random();
    final indices = <int>{};
    
    // Pick 3 random positions
    while (indices.length < 3) {
      indices.add(random.nextInt(widget.seedPhrase.length));
    }
    
    _verificationIndices = indices.toList()..sort();
    _selectedWords = [null, null, null];
    _currentSlot = 0;

    // Generate word options: correct words + 6 random others
    final correctWords = _verificationIndices.map((i) => widget.seedPhrase[i]).toList();
    final otherWords = widget.seedPhrase
        .where((w) => !correctWords.contains(w))
        .toList()
      ..shuffle();
    
    _wordOptions = [...correctWords, ...otherWords.take(6)]..shuffle();
  }

  void _handleWordSelect(String word) {
    if (_currentSlot >= 3) return;
    
    HapticFeedback.lightImpact();
    
    setState(() {
      _selectedWords[_currentSlot] = word;
      if (_currentSlot < 2) {
        _currentSlot++;
      }
    });
  }

  void _handleClearSlot(int slotIndex) {
    HapticFeedback.lightImpact();
    
    setState(() {
      _selectedWords[slotIndex] = null;
      _currentSlot = slotIndex;
    });
  }

  void _handleVerify() {
    final isCorrect = _verificationIndices.asMap().entries.every((entry) {
      return _selectedWords[entry.key] == widget.seedPhrase[entry.value];
    });

    if (isCorrect) {
      HapticFeedback.heavyImpact();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Verification successful!'),
          backgroundColor: AppTheme.primary,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
      widget.onComplete();
    } else {
      HapticFeedback.heavyImpact();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Incorrect words. Please check your seed phrase and try again.'),
          backgroundColor: AppTheme.destructive,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
      setState(() {
        _selectedWords = [null, null, null];
        _currentSlot = 0;
      });
    }
  }

  bool get _allFilled => _selectedWords.every((w) => w != null);

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
                        'STEP 3 OF 3',
                        style: TextStyle(
                          fontSize: 10,
                          letterSpacing: 1.2,
                          color: AppTheme.mutedForeground,
                        ),
                      ),
                      const Text(
                        'Verify Seed Phrase',
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
                "Select the correct word for each position to verify you've saved your seed phrase.",
                style: TextStyle(
                  fontSize: 14,
                  color: AppTheme.mutedForeground,
                  height: 1.4,
                ),
              ),

              const SizedBox(height: 24),

              // Verification Slots
              ...List.generate(3, (slotIndex) {
                final phraseIndex = _verificationIndices[slotIndex];
                final isActive = _currentSlot == slotIndex;
                final selectedWord = _selectedWords[slotIndex];

                return Padding(
                  padding: EdgeInsets.only(bottom: slotIndex < 2 ? 12 : 0),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isActive
                          ? AppTheme.primary.withOpacity(0.1)
                          : AppTheme.card,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isActive
                            ? AppTheme.primary.withOpacity(0.5)
                            : selectedWord != null
                                ? AppTheme.primary.withOpacity(0.3)
                                : AppTheme.border,
                      ),
                    ),
                    child: Row(
                      children: [
                        Text(
                          'Word #${phraseIndex + 1}',
                          style: TextStyle(
                            fontSize: 13,
                            fontFamily: 'monospace',
                            color: AppTheme.mutedForeground,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: selectedWord != null
                              ? Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      selectedWord,
                                      style: const TextStyle(
                                        fontFamily: 'monospace',
                                        fontWeight: FontWeight.w500,
                                        color: AppTheme.foreground,
                                      ),
                                    ),
                                    GestureDetector(
                                      onTap: () => _handleClearSlot(slotIndex),
                                      child: Container(
                                        padding: const EdgeInsets.all(4),
                                        decoration: BoxDecoration(
                                          color: AppTheme.secondary,
                                          shape: BoxShape.circle,
                                        ),
                                        child: Icon(
                                          Icons.close,
                                          size: 14,
                                          color: AppTheme.mutedForeground,
                                        ),
                                      ),
                                    ),
                                  ],
                                )
                              : Text(
                                  isActive ? 'Select word below...' : '—',
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: AppTheme.mutedForeground,
                                  ),
                                ),
                        ),
                      ],
                    ),
                  ),
                );
              }),

              const SizedBox(height: 24),

              // Word Options
              Row(
                children: [
                  Icon(
                    Icons.help_outline,
                    size: 16,
                    color: AppTheme.mutedForeground,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Tap the correct word for position #${_verificationIndices[_currentSlot] + 1}',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppTheme.mutedForeground,
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 12),

              Expanded(
                child: GridView.builder(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 3,
                    mainAxisSpacing: 8,
                    crossAxisSpacing: 8,
                    childAspectRatio: 2.5,
                  ),
                  itemCount: _wordOptions.length,
                  itemBuilder: (context, index) {
                    final word = _wordOptions[index];
                    final isSelected = _selectedWords.contains(word);

                    return GestureDetector(
                      onTap: isSelected ? null : () => _handleWordSelect(word),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 150),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? AppTheme.secondary.withOpacity(0.5)
                              : AppTheme.card,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: isSelected
                                ? AppTheme.border
                                : AppTheme.border,
                          ),
                        ),
                        child: Center(
                          child: Text(
                            word,
                            style: TextStyle(
                              fontSize: 13,
                              fontFamily: 'monospace',
                              fontWeight: FontWeight.w500,
                              color: isSelected
                                  ? AppTheme.mutedForeground.withOpacity(0.5)
                                  : AppTheme.foreground,
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),

              const SizedBox(height: 16),

              // Verify Button
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: _allFilled ? _handleVerify : null,
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
                    'Verify & Create Wallet',
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 15,
                    ),
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
