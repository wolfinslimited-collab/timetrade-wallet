import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../theme/app_theme.dart';
import '../../services/wallet_service.dart';
import '../../widgets/seed_word_input.dart';
import 'pin_setup_screen.dart';

class ImportWalletScreen extends StatefulWidget {
  final VoidCallback? onBack;

  const ImportWalletScreen({
    super.key,
    this.onBack,
  });

  @override
  State<ImportWalletScreen> createState() => _ImportWalletScreenState();
}

class _ImportWalletScreenState extends State<ImportWalletScreen> {
  int _wordCount = 12;
  late List<String> _words;
  bool _isValidating = false;
  final List<GlobalKey> _inputKeys = [];

  @override
  void initState() {
    super.initState();
    _words = List.filled(12, '');
    _generateInputKeys();
  }

  void _generateInputKeys() {
    _inputKeys.clear();
    for (int i = 0; i < _wordCount; i++) {
      _inputKeys.add(GlobalKey());
    }
  }

  void _handleWordCountChange(int count) {
    setState(() {
      _wordCount = count;
      if (count == 12) {
        _words = _words.sublist(0, 12);
      } else {
        _words = [..._words.sublist(0, 12), ...List.filled(12, '')];
      }
      _generateInputKeys();
    });
  }

  void _handleWordChange(int index, String value) {
    setState(() {
      _words[index] = value;
    });
  }

  void _handleClearAll() {
    setState(() {
      _words = List.filled(_wordCount, '');
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('All words have been cleared'),
        duration: Duration(seconds: 2),
      ),
    );
  }

  void _handlePaste() async {
    final clipboardData = await Clipboard.getData(Clipboard.kTextPlain);
    if (clipboardData?.text == null) return;

    final pastedWords = clipboardData!.text!
        .toLowerCase()
        .trim()
        .split(RegExp(r'\s+'))
        .where((w) => w.isNotEmpty)
        .toList();

    if (pastedWords.length >= 12) {
      final targetCount = pastedWords.length >= 24 ? 24 : 12;
      setState(() {
        _wordCount = targetCount;
        _words = pastedWords.sublist(0, targetCount).toList();
        while (_words.length < targetCount) {
          _words.add('');
        }
        _generateInputKeys();
      });
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${pastedWords.length.clamp(0, targetCount)} words detected'),
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Clipboard doesn\'t contain a valid seed phrase'),
            backgroundColor: AppTheme.destructive,
            duration: Duration(seconds: 2),
          ),
        );
      }
    }
  }

  void _handleQRScan() {
    // TODO: Implement QR scanner using mobile_scanner package
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('QR Scanner - Coming soon'),
        duration: Duration(seconds: 2),
      ),
    );
  }

  int get _filledCount => _words.where((w) => w.isNotEmpty).length;
  int get _validCount => _words.where((w) => isValidBip39Word(w)).length;
  bool get _allFilled => _filledCount == _wordCount;
  bool get _allValid => _validCount == _wordCount;

  Future<void> _handleImport() async {
    if (!_allFilled) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Please enter all $_wordCount words'),
          backgroundColor: AppTheme.destructive,
          duration: const Duration(seconds: 2),
        ),
      );
      return;
    }

    if (!_allValid) {
      final invalidIndices = _words
          .asMap()
          .entries
          .where((e) => !isValidBip39Word(e.value))
          .map((e) => e.key + 1)
          .toList();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Invalid words at positions: ${invalidIndices.join(", ")}'),
          backgroundColor: AppTheme.destructive,
          duration: const Duration(seconds: 3),
        ),
      );
      return;
    }

    setState(() => _isValidating = true);

    try {
      final walletService = Provider.of<WalletService>(context, listen: false);
      final mnemonic = _words.join(' ');
      final isValid = await walletService.validateMnemonic(mnemonic);

      if (!isValid) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Invalid checksum. Please verify your words are in the correct order.'),
              backgroundColor: AppTheme.destructive,
              duration: Duration(seconds: 3),
            ),
          );
        }
        setState(() => _isValidating = false);
        return;
      }

      // Store mnemonic temporarily
      await walletService.storeMnemonic(mnemonic);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Wallet imported successfully! Setting up PIN...'),
            duration: Duration(seconds: 2),
          ),
        );

        // Navigate to PIN setup
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => const PinSetupScreen(),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('An error occurred. Please try again.'),
            backgroundColor: AppTheme.destructive,
            duration: Duration(seconds: 2),
          ),
        );
      }
      setState(() => _isValidating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  GestureDetector(
                    onTap: widget.onBack ?? () => Navigator.pop(context),
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
                        'IMPORT WALLET',
                        style: TextStyle(
                          fontSize: 10,
                          color: AppTheme.mutedForeground,
                          letterSpacing: 1.5,
                        ),
                      ),
                      const SizedBox(height: 2),
                      const Text(
                        'Enter Seed Phrase',
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
            ),

            // Word Count Selector
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () => _handleWordCountChange(12),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: _wordCount == 12 
                              ? AppTheme.primary 
                              : AppTheme.card,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: _wordCount == 12 
                                ? AppTheme.primary 
                                : AppTheme.border,
                          ),
                        ),
                        child: Center(
                          child: Text(
                            '12 Words',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                              color: _wordCount == 12 
                                  ? AppTheme.primaryForeground 
                                  : AppTheme.mutedForeground,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: GestureDetector(
                      onTap: () => _handleWordCountChange(24),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: _wordCount == 24 
                              ? AppTheme.primary 
                              : AppTheme.card,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: _wordCount == 24 
                                ? AppTheme.primary 
                                : AppTheme.border,
                          ),
                        ),
                        child: Center(
                          child: Text(
                            '24 Words',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                              color: _wordCount == 24 
                                  ? AppTheme.primaryForeground 
                                  : AppTheme.mutedForeground,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // Action Buttons
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  // QR Scan Button
                  GestureDetector(
                    onTap: _handleQRScan,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      decoration: BoxDecoration(
                        color: AppTheme.card,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.border),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.qr_code_scanner, size: 16, color: AppTheme.foreground),
                          SizedBox(width: 6),
                          Text(
                            'Scan QR',
                            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AppTheme.foreground),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Paste Button
                  GestureDetector(
                    onTap: _handlePaste,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      decoration: BoxDecoration(
                        color: AppTheme.card,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.border),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.content_paste, size: 16, color: AppTheme.foreground),
                          SizedBox(width: 6),
                          Text(
                            'Paste',
                            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AppTheme.foreground),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const Spacer(),
                  // Clear All Button
                  GestureDetector(
                    onTap: _words.every((w) => w.isEmpty) ? null : _handleClearAll,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      decoration: BoxDecoration(
                        color: AppTheme.card,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.border),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.delete_outline,
                            size: 16,
                            color: _words.every((w) => w.isEmpty) 
                                ? AppTheme.mutedForeground 
                                : AppTheme.foreground,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            'Clear',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                              color: _words.every((w) => w.isEmpty) 
                                  ? AppTheme.mutedForeground 
                                  : AppTheme.foreground,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // Security Warning
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.destructive.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.destructive.withOpacity(0.2)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      Icons.warning_amber_rounded,
                      size: 16,
                      color: AppTheme.destructive,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: RichText(
                        text: TextSpan(
                          style: TextStyle(
                            fontSize: 12,
                            color: AppTheme.mutedForeground,
                            height: 1.4,
                          ),
                          children: [
                            TextSpan(
                              text: 'Security: ',
                              style: TextStyle(
                                fontWeight: FontWeight.w600,
                                color: AppTheme.destructive,
                              ),
                            ),
                            const TextSpan(
                              text: 'Never share your seed phrase. Timetrade will never ask for it outside this screen.',
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 12),

            // Word Grid
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  children: [
                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 3,
                        mainAxisSpacing: 8,
                        crossAxisSpacing: 8,
                        childAspectRatio: 2.5,
                      ),
                      itemCount: _wordCount,
                      itemBuilder: (context, index) {
                        return SeedWordInput(
                          key: ValueKey('word_$index'),
                          index: index,
                          value: _words[index],
                          onChanged: (value) => _handleWordChange(index, value),
                          onMoveToNext: index < _wordCount - 1
                              ? () => FocusScope.of(context).nextFocus()
                              : null,
                          onMoveToPrevious: index > 0
                              ? () => FocusScope.of(context).previousFocus()
                              : null,
                          autoFocus: index == 0,
                        );
                      },
                    ),

                    const SizedBox(height: 16),

                    // Status
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '$_validCount / $_wordCount valid',
                          style: TextStyle(
                            fontSize: 13,
                            fontFamily: 'monospace',
                            color: _filledCount == 0 
                                ? AppTheme.mutedForeground 
                                : _allValid 
                                    ? AppTheme.success 
                                    : AppTheme.foreground,
                          ),
                        ),
                        if (_filledCount > 0 && !_allValid)
                          Text(
                            '${_wordCount - _validCount} invalid',
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppTheme.destructive,
                            ),
                          ),
                      ],
                    ),

                    const SizedBox(height: 16),

                    // Tips
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '💡 Tap "Paste" to auto-fill from clipboard',
                          style: TextStyle(
                            fontSize: 12,
                            color: AppTheme.mutedForeground,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '⌨️ Use Space or Enter to move between words',
                          style: TextStyle(
                            fontSize: 12,
                            color: AppTheme.mutedForeground,
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),

            // Import Button
            Padding(
              padding: const EdgeInsets.all(16),
              child: SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: _allValid && !_isValidating ? _handleImport : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    disabledBackgroundColor: AppTheme.muted,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: _isValidating
                      ? const SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AppTheme.primaryForeground,
                          ),
                        )
                      : const Text(
                          'Import Wallet',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.primaryForeground,
                          ),
                        ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
