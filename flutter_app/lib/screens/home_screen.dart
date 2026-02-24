import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:timetrade_wallet/services/wallet_service.dart';
import 'package:timetrade_wallet/services/blockchain_service.dart';
import 'package:timetrade_wallet/theme/app_theme.dart';
import 'package:timetrade_wallet/screens/wallet_tab.dart';
import 'package:timetrade_wallet/screens/history_tab.dart';
import 'package:timetrade_wallet/screens/staking_tab.dart';
import 'package:timetrade_wallet/screens/settings_tab.dart';
import 'package:timetrade_wallet/widgets/bottom_nav_bar.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  final List<Widget> _tabs = const [
    WalletTab(),
    HistoryTab(),
    StakingTab(),
    SettingsTab(),
  ];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  void _loadData() {
    final wallet = context.read<WalletService>();
    final account = wallet.activeAccount;
    if (account != null) {
      final addresses = <String, String>{};
      if (account.evmAddress.isNotEmpty) addresses['evm'] = account.evmAddress;
      if (account.solanaAddress.isNotEmpty) addresses['solana'] = account.solanaAddress;
      if (account.tronAddress.isNotEmpty) addresses['tron'] = account.tronAddress;
      if (account.btcAddress.isNotEmpty) addresses['btc'] = account.btcAddress;
      context.read<BlockchainService>().refreshAll(addresses);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _tabs,
      ),
      bottomNavigationBar: BottomNavBar(
        currentIndex: _currentIndex,
        onTap: (i) => setState(() => _currentIndex = i),
      ),
    );
  }
}
