# Timetrade Wallet - Flutter Native App

A full native Flutter implementation of the Timetrade multi-chain crypto wallet.

## Getting Started

### Prerequisites
- Flutter SDK >= 3.2.0
- Dart SDK >= 3.2.0
- Xcode (for iOS)
- Android Studio (for Android)

### Setup

```bash
cd flutter_app
flutter pub get
flutter run
```

### Architecture

```
lib/
├── app/              # App entry point & configuration
├── core/
│   ├── theme/        # Design system (colors, typography)
│   └── router/       # Navigation (go_router)
├── features/
│   ├── home/         # Wallet home screen
│   │   ├── screens/
│   │   └── widgets/
│   ├── send/         # Send crypto flow
│   ├── receive/      # Receive / QR display
│   ├── swap/         # Token swap
│   ├── settings/     # App settings
│   ├── onboarding/   # Wallet creation / import
│   └── lock/         # PIN lock screen
└── main.dart
```

### State Management
Uses **Riverpod** for state management.

### Backend
Connects to the same Supabase backend as the React web app.

### TODO
- [ ] Wallet creation with BIP39 seed phrase
- [ ] Multi-chain address derivation (BTC, ETH, SOL, TRX)
- [ ] Real balance fetching via edge functions
- [ ] Send transaction flow with signing
- [ ] QR code receive display
- [ ] Token swap integration
- [ ] Biometric authentication
- [ ] Push notifications
- [ ] Price charts with fl_chart
