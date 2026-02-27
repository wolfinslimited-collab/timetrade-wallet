import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/config/networks.dart';

class ReceiveScreen extends StatefulWidget {
  const ReceiveScreen({super.key});
  @override
  State<ReceiveScreen> createState() => _ReceiveScreenState();
}

class _ReceiveScreenState extends State<ReceiveScreen> {
  String? _selectedNetwork;

  // Placeholder addresses - in production from secure storage
  String get _address {
    if (_selectedNetwork == null) return '';
    final net = getNetwork(_selectedNetwork!);
    switch (net.addressKey) {
      case AddressKey.evm: return '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18';
      case AddressKey.solana: return 'HN7cABqLq46Es1jh92dQQisAi5YqjjSAcDBGQf7CJ6Jn';
      case AddressKey.tron: return 'TLsV52sRDL79HXGGm9yzwKibb6BeruhUzy';
      case AddressKey.btc: return 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
    }
  }

  void _copyAddress() {
    Clipboard.setData(ClipboardData(text: _address));
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Address copied to clipboard'), duration: Duration(seconds: 2)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  GestureDetector(
                    onTap: () {
                      if (_selectedNetwork != null) {
                        setState(() => _selectedNetwork = null);
                      } else {
                        context.go('/');
                      }
                    },
                    child: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(shape: BoxShape.circle, color: AppColors.card, border: Border.all(color: AppColors.border)),
                      child: const Icon(Icons.chevron_left, size: 20),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(_selectedNetwork != null ? 'Receive ${getNetwork(_selectedNetwork!).symbol}' : 'Receive Crypto',
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
                ],
              ),
            ),

            Expanded(
              child: _selectedNetwork == null ? _buildNetworkGrid() : _buildQrDisplay(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNetworkGrid() {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('SELECT NETWORK', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textMuted, letterSpacing: 1.5)),
          const SizedBox(height: 16),
          GridView.count(
            crossAxisCount: 3, shrinkWrap: true, crossAxisSpacing: 12, mainAxisSpacing: 12,
            physics: const NeverScrollableScrollPhysics(),
            children: networks.map((net) {
              return GestureDetector(
                onTap: () => setState(() => _selectedNetwork = net.id),
                child: Container(
                  decoration: BoxDecoration(borderRadius: BorderRadius.circular(12), color: AppColors.surfaceLight.withOpacity(0.3), border: Border.all(color: AppColors.border)),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 40, height: 40,
                        decoration: BoxDecoration(shape: BoxShape.circle, color: Color(net.color).withOpacity(0.1)),
                        child: ClipOval(child: CachedNetworkImage(imageUrl: net.logoUrl, width: 40, height: 40, fit: BoxFit.contain, errorWidget: (_, __, ___) => Center(child: Text(net.symbol, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700))))),
                      ),
                      const SizedBox(height: 8),
                      Text(net.name, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500), textAlign: TextAlign.center),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildQrDisplay() {
    final net = getNetwork(_selectedNetwork!);
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const Spacer(),
          // QR Code
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20)),
            child: QrImageView(data: _address, version: QrVersions.auto, size: 220),
          ),
          const SizedBox(height: 24),

          Text(net.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),

          // Address
          GestureDetector(
            onTap: _copyAddress,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: AppColors.card, borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      _address,
                      style: TextStyle(fontSize: 13, fontFamily: 'monospace', color: AppColors.textSecondary),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Icon(Icons.copy, size: 16, color: AppColors.textMuted),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Copy button
          SizedBox(
            width: double.infinity, height: 56,
            child: ElevatedButton.icon(
              onPressed: _copyAddress,
              icon: const Icon(Icons.copy, size: 18),
              label: const Text('Copy Address'),
            ),
          ),

          const SizedBox(height: 12),

          // Share button
          SizedBox(
            width: double.infinity, height: 56,
            child: OutlinedButton.icon(
              onPressed: () {}, // TODO: Share
              icon: const Icon(Icons.share, size: 18),
              label: const Text('Share'),
            ),
          ),

          const Spacer(),

          // Warning
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.accent.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.accent.withOpacity(0.3)),
            ),
            child: Row(
              children: [
                Icon(Icons.warning_amber, size: 16, color: AppColors.accent),
                const SizedBox(width: 8),
                Expanded(child: Text('Only send ${net.name} assets to this address', style: TextStyle(fontSize: 12, color: AppColors.textSecondary))),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
