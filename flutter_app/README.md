# Timetrade Wallet - Flutter App

This folder contains complete Flutter/Dart code for the Timetrade Wallet mobile application.

## ⚠️ Important Notice

These `.dart` files are **Flutter code** - they will NOT run in Lovable (which uses React).

To use this code:
1. Create a new Flutter project: `flutter create timetrade_wallet`
2. Copy these files into your Flutter project's `lib/` folder
3. Add required dependencies to `pubspec.yaml`
4. Run `flutter pub get`
5. Run `flutter run`

## Project Structure

```
flutter_app/
├── main.dart                          # App entry point with Provider
├── models/
│   ├── wallet_account.dart            # Account model
│   └── token.dart                     # Token/asset model
├── screens/
│   ├── home_screen.dart               # Main wallet dashboard
│   ├── lock_screen.dart               # PIN unlock screen
│   ├── settings_screen.dart           # Settings page
│   ├── history_screen.dart            # Transaction history
│   ├── market_screen.dart             # Market prices
│   ├── onboarding/
│   │   ├── welcome_screen.dart        # Welcome/create wallet
│   │   ├── pin_setup_screen.dart      # PIN creation
│   │   └── import_wallet_screen.dart  # Seed phrase import
│   ├── send/
│   │   └── send_crypto_screen.dart    # Send crypto flow
│   └── receive/
│       └── receive_crypto_screen.dart # Receive with QR code
├── widgets/
│   ├── quick_actions.dart             # Send/Receive/Swap buttons
│   ├── token_list.dart                # Asset list
│   ├── bottom_nav.dart                # Navigation bar
│   ├── wallet_header.dart             # Header with avatar
│   ├── balance_display.dart           # Balance with change
│   └── sparkline.dart                 # Price chart widget
├── services/
│   ├── wallet_service.dart            # Wallet derivation & storage
│   ├── blockchain_service.dart        # API calls
│   └── encryption_service.dart        # PIN encryption
└── theme/
    └── app_theme.dart                 # Dark theme colors
```

## Required Dependencies (pubspec.yaml)

```yaml
name: timetrade_wallet
description: Non-custodial multi-chain crypto wallet

environment:
  sdk: '>=3.0.0 <4.0.0'

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
  pointycastle: ^3.7.3
  
  # Security
  flutter_secure_storage: ^9.0.0
  local_auth: ^2.1.6
  crypto: ^3.0.3
  
  # UI
  qr_flutter: ^4.1.0
  cached_network_image: ^3.3.0
  shimmer: ^3.0.0
  
  # HTTP
  dio: ^5.4.0
  
  # Utils
  intl: ^0.18.1
  shared_preferences: ^2.2.2

dev_dependencies:
  flutter_test:
    sdk: flutter

flutter:
  uses-material-design: true
```

## Key Features

1. **Multi-chain Support**: Ethereum, Polygon, Solana, Tron
2. **BIP39 Seed Phrase**: 12/24 word generation & import
3. **PIN + Biometric**: 6-digit PIN with optional Face ID/fingerprint
4. **Real-time Balances**: Via blockchain APIs
5. **Transaction Signing**: Client-side signing for all chains
6. **Dark Theme**: Professional black/white design

## Screens Overview

| Screen | Description |
|--------|-------------|
| `LockScreen` | PIN/biometric unlock on app launch |
| `HomeScreen` | Main dashboard with balance, assets, quick actions |
| `HistoryScreen` | Transaction history with filters |
| `MarketScreen` | Live crypto prices with sparklines |
| `SettingsScreen` | Security settings, view seed phrase, reset |
| `SendCryptoScreen` | Multi-step send flow |
| `ReceiveCryptoScreen` | QR code with address display |
| `WelcomeScreen` | Onboarding - create/import wallet |
| `PinSetupScreen` | Create 6-digit PIN |
| `ImportWalletScreen` | Enter seed phrase words |

## Getting Started

1. Clone and setup:
   ```bash
   flutter create timetrade_wallet
   cd timetrade_wallet
   # Copy flutter_app/ contents to lib/
   ```

2. Install dependencies:
   ```bash
   flutter pub get
   ```

3. Run the app:
   ```bash
   flutter run
   ```

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
