import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:timetrade_wallet/services/wallet_service.dart';
import 'package:timetrade_wallet/theme/app_theme.dart';
import 'package:timetrade_wallet/screens/onboarding/pin_setup_screen.dart';

class SeedPhraseScreen extends StatefulWidget {
  const SeedPhraseScreen({super.key});

  @override
  State<SeedPhraseScreen> createState() => _SeedPhraseScreenState();
}

class _SeedPhraseScreenState extends State<SeedPhraseScreen> {
  late List<String> _words;
  bool _revealed = false;
  bool _backed = false;

  @override
  void initState() {
    super.initState();
    final wallet = context.read<WalletService>();
    _words = wallet.generateSeedPhrase().split(' ');
  }

  void _copyToClipboard() {
    Clipboard.setData(ClipboardData(text: _words.join(' ')));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Seed phrase copied'), duration: Duration(seconds: 2)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Your Seed Phrase')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.destructive.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.destructive.withOpacity(0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.warning_amber, color: AppColors.destructive, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Write these words down and store them safely. Never share your seed phrase.',
                        style: TextStyle(fontSize: 12, color: AppColors.destructive.withOpacity(0.9)),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              Expanded(
                child: GestureDetector(
                  onTap: () => setState(() => _revealed = true),
                  child: GridView.builder(
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 3,
                      mainAxisSpacing: 8,
                      crossAxisSpacing: 8,
                      childAspectRatio: 2.8,
                    ),
                    itemCount: _words.length,
                    itemBuilder: (_, i) => Container(
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: AppColors.card,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Text(
                        _revealed ? '${i + 1}. ${_words[i]}' : '${i + 1}. ••••',
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _copyToClipboard,
                      icon: const Icon(Icons.copy, size: 16),
                      label: const Text('Copy'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.foreground,
                        side: const BorderSide(color: AppColors.border),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => setState(() => _revealed = !_revealed),
                      icon: Icon(_revealed ? Icons.visibility_off : Icons.visibility, size: 16),
                      label: Text(_revealed ? 'Hide' : 'Reveal'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.foreground,
                        side: const BorderSide(color: AppColors.border),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Checkbox(
                    value: _backed,
                    onChanged: (v) => setState(() => _backed = v ?? false),
                    activeColor: AppColors.primary,
                  ),
                  const Expanded(
                    child: Text(
                      'I have securely saved my seed phrase',
                      style: TextStyle(fontSize: 13, color: AppColors.mutedForeground),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity, height: 52,
                child: ElevatedButton(
                  onPressed: _backed
                      ? () => Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => PinSetupScreen(seedPhrase: _words.join(' ')),
                          ),
                        )
                      : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: AppColors.primaryForeground,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    disabledBackgroundColor: AppColors.primary.withOpacity(0.3),
                  ),
                  child: const Text('Continue', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
