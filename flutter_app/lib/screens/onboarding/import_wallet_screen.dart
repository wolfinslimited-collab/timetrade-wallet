import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:timetrade_wallet/services/wallet_service.dart';
import 'package:timetrade_wallet/theme/app_theme.dart';
import 'package:timetrade_wallet/screens/onboarding/pin_setup_screen.dart';

class ImportWalletScreen extends StatefulWidget {
  const ImportWalletScreen({super.key});

  @override
  State<ImportWalletScreen> createState() => _ImportWalletScreenState();
}

class _ImportWalletScreenState extends State<ImportWalletScreen> {
  int _wordCount = 12;
  late List<TextEditingController> _controllers;
  String? _error;

  @override
  void initState() {
    super.initState();
    _controllers = List.generate(12, (_) => TextEditingController());
  }

  void _setWordCount(int count) {
    setState(() {
      _wordCount = count;
      if (count > _controllers.length) {
        _controllers.addAll(List.generate(count - _controllers.length, (_) => TextEditingController()));
      }
      _error = null;
    });
  }

  Future<void> _pasteFromClipboard() async {
    final data = await Clipboard.getData(Clipboard.kTextPlain);
    if (data?.text == null) return;
    final words = data!.text!.trim().split(RegExp(r'\s+'));
    if (words.length == 12 || words.length == 24) {
      _setWordCount(words.length);
      for (int i = 0; i < words.length && i < _controllers.length; i++) {
        _controllers[i].text = words[i].toLowerCase();
      }
      setState(() {});
    }
  }

  void _validate() {
    final phrase = _controllers.sublist(0, _wordCount).map((c) => c.text.trim().toLowerCase()).join(' ');
    final wallet = context.read<WalletService>();
    if (wallet.validateSeedPhrase(phrase)) {
      Navigator.push(context, MaterialPageRoute(
        builder: (_) => PinSetupScreen(seedPhrase: phrase, isImport: true),
      ));
    } else {
      setState(() => _error = 'Invalid seed phrase. Please check your words.');
    }
  }

  @override
  void dispose() {
    for (final c in _controllers) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Import Wallet')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              // Word count toggle
              Row(
                children: [12, 24].map((count) =>
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text('$count words'),
                      selected: _wordCount == count,
                      onSelected: (_) => _setWordCount(count),
                      selectedColor: AppColors.primary,
                      labelStyle: TextStyle(
                        color: _wordCount == count ? AppColors.primaryForeground : AppColors.foreground,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ).toList(),
              ),
              const SizedBox(height: 8),
              TextButton.icon(
                onPressed: _pasteFromClipboard,
                icon: const Icon(Icons.paste, size: 16),
                label: const Text('Paste from clipboard'),
              ),
              if (_error != null) ...[
                const SizedBox(height: 8),
                Text(_error!, style: const TextStyle(color: AppColors.destructive, fontSize: 12)),
              ],
              const SizedBox(height: 16),
              Expanded(
                child: GridView.builder(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 3,
                    mainAxisSpacing: 8,
                    crossAxisSpacing: 8,
                    childAspectRatio: 2.5,
                  ),
                  itemCount: _wordCount,
                  itemBuilder: (_, i) => TextField(
                    controller: _controllers[i],
                    style: const TextStyle(fontSize: 13),
                    decoration: InputDecoration(
                      prefixText: '${i + 1}. ',
                      prefixStyle: const TextStyle(color: AppColors.mutedForeground, fontSize: 12),
                      isDense: true,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: AppColors.border)),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: AppColors.border)),
                      filled: true,
                      fillColor: AppColors.card,
                    ),
                    autocorrect: false,
                    textInputAction: i < _wordCount - 1 ? TextInputAction.next : TextInputAction.done,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity, height: 52,
                child: ElevatedButton(
                  onPressed: _validate,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: AppColors.primaryForeground,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: const Text('Import Wallet', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
