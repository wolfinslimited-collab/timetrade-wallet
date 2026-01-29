# Timetrade Wallet - Flutter Reference Code

This folder contains Flutter/Dart reference code for rebuilding the Timetrade Wallet app.

## ⚠️ Important Notice

These `.dart` files are **reference code only** - they will NOT run in Lovable.

To use this code:
1. Create a new Flutter project: `flutter create timetrade_wallet`
2. Copy these files into your Flutter project's `lib/` folder
3. Add required dependencies to `pubspec.yaml`
4. Run `flutter pub get`

## Project Structure

```
flutter_reference/
├── main.dart                    # App entry point
├── models/
│   ├── wallet_account.dart      # Account model
│   └── token.dart               # Token/asset model
├── screens/
│   ├── home_screen.dart         # Main wallet dashboard
│   ├── lock_screen.dart         # PIN unlock screen
│   ├── onboarding/
│   │   ├── welcome_screen.dart
│   │   ├── pin_setup_screen.dart
│   │   └── import_wallet_screen.dart
│   ├── settings_screen.dart
│   └── history_screen.dart
├── widgets/
│   ├── quick_actions.dart       # Send/Receive/Swap buttons
│   ├── token_list.dart          # Asset list
│   └── bottom_nav.dart          # Navigation bar
├── services/
│   ├── wallet_service.dart      # Wallet derivation & storage
│   ├── blockchain_service.dart  # API calls
│   └── encryption_service.dart  # PIN encryption
└── theme/
    └── app_theme.dart           # Dark theme colors
```

## Required Dependencies (pubspec.yaml)

```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # State Management
  provider: ^6.1.1
  flutter_riverpod: ^2.4.9
  
  # Crypto & Wallet
  bip39: ^1.0.6
  bip32: ^2.0.0
  web3dart: ^2.7.1
  solana: ^0.30.1
  
  # Security
  flutter_secure_storage: ^9.0.0
  local_auth: ^2.1.6
  
  # UI
  qr_flutter: ^4.1.0
  cached_network_image: ^3.3.0
  shimmer: ^3.0.0
  
  # HTTP
  dio: ^5.4.0
  
  # Utils
  intl: ^0.18.1
```

## Key Features to Implement

1. **Multi-chain support**: Ethereum, Polygon, Solana, Tron
2. **BIP39 seed phrase**: 12/24 word generation & import
3. **PIN + Biometric**: 6-digit PIN with optional Face ID/fingerprint
4. **Real-time balances**: Via blockchain APIs
5. **Transaction signing**: Client-side signing for all chains
6. **Dark theme**: Professional black/white design
