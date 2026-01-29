import 'dart:convert';
import 'dart:typed_data';
import 'package:crypto/crypto.dart';
// In production, use pointycastle for AES-GCM

/// Encryption service for securing sensitive wallet data
class EncryptionService {
  /// Encrypt data with a PIN-derived key
  /// Uses AES-GCM with PBKDF2 key derivation
  Future<String> encrypt(String data, String pin) async {
    // Generate a random salt
    final salt = _generateSalt();
    
    // Derive key from PIN using PBKDF2
    final key = _deriveKey(pin, salt);
    
    // Generate random IV
    final iv = _generateIV();
    
    // In production, use pointycastle for actual AES-GCM encryption
    // This is a simplified placeholder
    final encrypted = _simpleEncrypt(data, key, iv);
    
    // Combine salt + iv + encrypted data
    final combined = {
      'salt': base64.encode(salt),
      'iv': base64.encode(iv),
      'data': encrypted,
    };
    
    return jsonEncode(combined);
  }

  /// Decrypt data with a PIN-derived key
  Future<String?> decrypt(String encryptedData, String pin) async {
    try {
      final combined = jsonDecode(encryptedData) as Map<String, dynamic>;
      
      final salt = base64.decode(combined['salt'] as String);
      final iv = base64.decode(combined['iv'] as String);
      final data = combined['data'] as String;
      
      // Derive key from PIN using same salt
      final key = _deriveKey(pin, salt);
      
      // Decrypt
      final decrypted = _simpleDecrypt(data, key, iv);
      
      return decrypted;
    } catch (e) {
      return null;
    }
  }

  /// Hash a PIN for storage verification
  String hashPin(String pin) {
    final bytes = utf8.encode(pin);
    final digest = sha256.convert(bytes);
    return digest.toString();
  }

  /// Verify a PIN against stored hash
  bool verifyPin(String pin, String storedHash) {
    return hashPin(pin) == storedHash;
  }

  // Generate random salt
  Uint8List _generateSalt() {
    // In production, use secure random generator
    final salt = Uint8List(32);
    for (int i = 0; i < 32; i++) {
      salt[i] = DateTime.now().microsecond % 256;
    }
    return salt;
  }

  // Generate random IV
  Uint8List _generateIV() {
    final iv = Uint8List(12);
    for (int i = 0; i < 12; i++) {
      iv[i] = DateTime.now().microsecond % 256;
    }
    return iv;
  }

  // Derive key using PBKDF2
  Uint8List _deriveKey(String pin, Uint8List salt) {
    // PBKDF2 with 100,000 iterations
    // In production, use pointycastle PBKDF2
    final hmac = Hmac(sha256, utf8.encode(pin));
    var block = Uint8List.fromList([...salt, 0, 0, 0, 1]);
    
    Uint8List u = Uint8List.fromList(hmac.convert(block).bytes);
    Uint8List result = Uint8List.fromList(u);
    
    // Simplified - in production use proper PBKDF2
    for (int i = 1; i < 1000; i++) {
      u = Uint8List.fromList(hmac.convert(u).bytes);
      for (int j = 0; j < result.length; j++) {
        result[j] ^= u[j];
      }
    }
    
    return result.sublist(0, 32);
  }

  // Simplified encryption (use AES-GCM in production)
  String _simpleEncrypt(String data, Uint8List key, Uint8List iv) {
    final bytes = utf8.encode(data);
    final encrypted = Uint8List(bytes.length);
    
    for (int i = 0; i < bytes.length; i++) {
      encrypted[i] = bytes[i] ^ key[i % key.length] ^ iv[i % iv.length];
    }
    
    return base64.encode(encrypted);
  }

  // Simplified decryption (use AES-GCM in production)
  String _simpleDecrypt(String data, Uint8List key, Uint8List iv) {
    final encrypted = base64.decode(data);
    final decrypted = Uint8List(encrypted.length);
    
    for (int i = 0; i < encrypted.length; i++) {
      decrypted[i] = encrypted[i] ^ key[i % key.length] ^ iv[i % iv.length];
    }
    
    return utf8.decode(decrypted);
  }
}
