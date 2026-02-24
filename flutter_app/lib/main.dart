import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:timetrade_wallet/services/wallet_service.dart';
import 'package:timetrade_wallet/services/blockchain_service.dart';
import 'package:timetrade_wallet/services/staking_service.dart';
import 'package:timetrade_wallet/theme/app_theme.dart';
import 'package:timetrade_wallet/screens/splash_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    systemNavigationBarColor: Colors.black,
  ));
  runApp(const TimetradeApp());
}

class TimetradeApp extends StatelessWidget {
  const TimetradeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => WalletService()),
        ChangeNotifierProvider(create: (_) => BlockchainService()),
        ChangeNotifierProvider(create: (_) => StakingService()),
      ],
      child: MaterialApp(
        title: 'Timetrade',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.darkTheme,
        home: const SplashScreen(),
      ),
    );
  }
}
