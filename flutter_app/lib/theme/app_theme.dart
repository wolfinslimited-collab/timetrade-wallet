import 'package:flutter/material.dart';

class AppColors {
  static const background = Color(0xFF0A0A0B);
  static const card = Color(0xFF141416);
  static const cardHover = Color(0xFF1A1A1E);
  static const border = Color(0xFF27272A);
  static const foreground = Color(0xFFFAFAFA);
  static const mutedForeground = Color(0xFFA1A1AA);
  static const muted = Color(0xFF27272A);
  static const primary = Color(0xFF22C55E);
  static const primaryForeground = Color(0xFF052E16);
  static const destructive = Color(0xFFEF4444);
  static const success = Color(0xFF22C55E);
  static const secondary = Color(0xFF1E1E22);
  static const accent = Color(0xFF1E1E22);
}

class AppTheme {
  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: AppColors.background,
      primaryColor: AppColors.primary,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.primary,
        onPrimary: AppColors.primaryForeground,
        surface: AppColors.card,
        onSurface: AppColors.foreground,
        error: AppColors.destructive,
        outline: AppColors.border,
      ),
      fontFamily: 'Inter',
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: TextStyle(
          color: AppColors.foreground,
          fontSize: 18,
          fontWeight: FontWeight.w600,
        ),
        iconTheme: IconThemeData(color: AppColors.foreground),
      ),
      cardTheme: CardThemeData(
        color: AppColors.card,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        elevation: 0,
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: Colors.transparent,
        selectedItemColor: AppColors.foreground,
        unselectedItemColor: AppColors.mutedForeground,
      ),
      textTheme: const TextTheme(
        headlineLarge: TextStyle(fontSize: 42, fontWeight: FontWeight.w700, color: AppColors.foreground),
        headlineMedium: TextStyle(fontSize: 28, fontWeight: FontWeight.w700, color: AppColors.foreground),
        titleLarge: TextStyle(fontSize: 20, fontWeight: FontWeight.w600, color: AppColors.foreground),
        titleMedium: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.foreground),
        bodyLarge: TextStyle(fontSize: 16, color: AppColors.foreground),
        bodyMedium: TextStyle(fontSize: 14, color: AppColors.foreground),
        bodySmall: TextStyle(fontSize: 12, color: AppColors.mutedForeground),
        labelSmall: TextStyle(fontSize: 10, color: AppColors.mutedForeground),
      ),
    );
  }
}
