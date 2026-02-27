import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:bip39/bip39.dart' as bip39;
import '../../../core/theme/app_theme.dart';

class ImportWalletStep extends StatefulWidget {
  final void Function(List<String> seedPhrase) onImport;
  final VoidCallback onBack;
  const ImportWalletStep({super.key, required this.onImport, required this.onBack});

  @override
  State<ImportWalletStep> createState() => _ImportWalletStepState();
}

class _ImportWalletStepState extends State<ImportWalletStep> {
  int _wordCount = 12;
  late List<TextEditingController> _controllers;
  late List<FocusNode> _focusNodes;

  @override
  void initState() {
    super.initState();
    _initControllers(12);
  }

  void _initControllers(int count) {
    _controllers = List.generate(count, (_) => TextEditingController());
    _focusNodes = List.generate(count, (_) => FocusNode());
  }

  @override
  void dispose() {
    for (final c in _controllers) c.dispose();
    for (final f in _focusNodes) f.dispose();
    super.dispose();
  }

  void _changeWordCount(int count) {
    final existing = _controllers.map((c) => c.text).toList();
    setState(() {
      _wordCount = count;
      for (final c in _controllers) c.dispose();
      for (final f in _focusNodes) f.dispose();
      _initControllers(count);
      for (int i = 0; i < existing.length && i < count; i++) {
        _controllers[i].text = existing[i];
      }
    });
  }

  Future<void> _pasteFromClipboard() async {
    final data = await Clipboard.getData(Clipboard.kTextPlain);
    if (data?.text == null) return;
    final words = data!.text!.toLowerCase().trim().split(RegExp(r'\s+'));
    if (words.length >= 12) {
      final count = words.length >= 24 ? 24 : 12;
      _changeWordCount(count);
      for (int i = 0; i < count && i < words.length; i++) {
        _controllers[i].text = words[i];
      }
      setState(() {});
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('${words.length} words pasted')));
    }
  }

  void _clearAll() {
    for (final c in _controllers) c.clear();
    setState(() {});
  }

  void _import() {
    final words = _controllers.map((c) => c.text.trim().toLowerCase()).toList();
    final empty = words.where((w) => w.isEmpty).length;
    if (empty > 0) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Please fill all $_wordCount words'), backgroundColor: AppColors.destructive));
      return;
    }
    final phrase = words.join(' ');
    if (!bip39.validateMnemonic(phrase)) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Invalid seed phrase. Check word order.'), backgroundColor: AppColors.destructive));
      return;
    }
    widget.onImport(words);
  }

  int get _validCount => _controllers.where((c) => c.text.trim().isNotEmpty && bip39.validateMnemonic(c.text.trim()) == false).length;
  int get _filledCount => _controllers.where((c) => c.text.trim().isNotEmpty).length;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
            child: Row(
              children: [
                GestureDetector(
                  onTap: widget.onBack,
                  child: Container(
                    width: 40, height: 40,
                    decoration: BoxDecoration(shape: BoxShape.circle, color: AppColors.surfaceLight.withOpacity(0.4), border: Border.all(color: AppColors.border.withOpacity(0.4))),
                    child: const Icon(Icons.chevron_left, size: 20),
                  ),
                ),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('IMPORT WALLET', style: TextStyle(fontSize: 11, color: AppColors.textMuted, letterSpacing: 1.5, fontWeight: FontWeight.w600)),
                    const Text('Enter Seed Phrase', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
                  ],
                ),
              ],
            ),
          ),

          // Progress
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 4),
            child: Column(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: _filledCount / _wordCount,
                    backgroundColor: AppColors.surfaceLight.withOpacity(0.3),
                    color: AppColors.primary,
                    minHeight: 6,
                  ),
                ),
                const SizedBox(height: 4),
                Align(
                  alignment: Alignment.centerRight,
                  child: Text('$_filledCount/$_wordCount filled', style: TextStyle(fontSize: 11, color: AppColors.textMuted, fontFamily: 'monospace', fontWeight: FontWeight.w500)),
                ),
              ],
            ),
          ),

          // Word count toggle
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(borderRadius: BorderRadius.circular(12), color: AppColors.surfaceLight.withOpacity(0.25), border: Border.all(color: AppColors.border.withOpacity(0.3))),
              child: Row(
                children: [12, 24].map((count) {
                  final active = _wordCount == count;
                  return Expanded(
                    child: GestureDetector(
                      onTap: () => _changeWordCount(count),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(8),
                          color: active ? AppColors.textPrimary : Colors.transparent,
                        ),
                        child: Center(
                          child: Text('$count Words', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: active ? AppColors.background : AppColors.textMuted.withOpacity(0.6))),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ),

          // Quick actions
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
            child: Row(
              children: [
                _QuickAction(icon: Icons.paste, label: 'Paste', onTap: _pasteFromClipboard),
                const SizedBox(width: 8),
                _QuickAction(icon: Icons.delete_outline, label: 'Clear', onTap: _clearAll),
              ],
            ),
          ),

          // Word grid
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
              child: Wrap(
                spacing: 6, runSpacing: 6,
                children: List.generate(_wordCount, (i) {
                  return SizedBox(
                    width: (MediaQuery.of(context).size.width - 52) / 3,
                    child: TextField(
                      controller: _controllers[i],
                      focusNode: _focusNodes[i],
                      style: const TextStyle(fontSize: 13, fontFamily: 'monospace'),
                      decoration: InputDecoration(
                        prefixText: '${i + 1}. ',
                        prefixStyle: TextStyle(fontSize: 12, color: AppColors.textMuted),
                        isDense: true,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
                        filled: true,
                        fillColor: AppColors.surfaceLight.withOpacity(0.5),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: AppColors.border)),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: AppColors.border)),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: AppColors.primary)),
                      ),
                      textInputAction: i < _wordCount - 1 ? TextInputAction.next : TextInputAction.done,
                      onSubmitted: (_) {
                        if (i < _wordCount - 1) _focusNodes[i + 1].requestFocus();
                      },
                      onChanged: (_) => setState(() {}),
                    ),
                  );
                }),
              ),
            ),
          ),

          // Import button
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
            child: SizedBox(
              width: double.infinity, height: 56,
              child: ElevatedButton.icon(
                onPressed: _filledCount == _wordCount ? _import : null,
                icon: const Icon(Icons.download),
                label: const Text('Import Wallet'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _filledCount == _wordCount ? AppColors.textPrimary : AppColors.surfaceLight.withOpacity(0.4),
                  foregroundColor: _filledCount == _wordCount ? AppColors.background : AppColors.textMuted.withOpacity(0.5),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _QuickAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _QuickAction({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          color: AppColors.surfaceLight.withOpacity(0.25),
          border: Border.all(color: AppColors.border.withOpacity(0.3)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14),
            const SizedBox(width: 6),
            Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textPrimary.withOpacity(0.8))),
          ],
        ),
      ),
    );
  }
}
