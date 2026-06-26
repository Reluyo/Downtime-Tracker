import 'package:flutter/material.dart';

/// Astemo corporate palette and the app's dark theme.
///
/// The identity is driven by the three primary brand colors — Astemo Red,
/// White and Black — on a near-black dark surface. Functional status colors
/// (green / amber / red) are kept for their safety meaning on the floor.
class AstemoColors {
  AstemoColors._();

  // Primary brand palette.
  static const red = Color(0xFFB6001A); // Astemo Red
  static const redBright = Color(0xFFE11D2E); // hover / emphasis
  static const white = Color(0xFFFFFFFF);
  static const black = Color(0xFF000000);

  // Dark theme surfaces (neutral near-black so red reads as the accent).
  static const bg = Color(0xFF0B0B0D);
  static const surface = Color(0xFF17171C);
  static const surfaceElevated = Color(0xFF1F1F25);
  static const border = Color(0xFF2C2C34);
  static const textMuted = Color(0xFFA0A4AD);

  // Functional status (resolved / pending / down).
  static const ok = Color(0xFF22C55E);
  static const warn = Color(0xFFF59E0B);
  static const error = Color(0xFFEF4444);
}

/// The dark, Astemo-branded Material theme used across the tablet app.
ThemeData astemoDarkTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: AstemoColors.red,
    brightness: Brightness.dark,
  ).copyWith(
    primary: AstemoColors.red,
    onPrimary: AstemoColors.white,
    surface: AstemoColors.bg,
  );

  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    colorScheme: scheme,
    scaffoldBackgroundColor: AstemoColors.bg,
    appBarTheme: const AppBarTheme(
      backgroundColor: AstemoColors.black,
      foregroundColor: AstemoColors.white,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        color: AstemoColors.white,
        fontSize: 22,
        fontWeight: FontWeight.w600,
      ),
    ),
    // Large, high-contrast touch targets for the production floor. Default
    // (non-coloured) buttons use an elevated neutral surface with white text.
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AstemoColors.surfaceElevated,
        foregroundColor: AstemoColors.white,
        minimumSize: const Size(160, 96),
        textStyle: const TextStyle(fontSize: 22, fontWeight: FontWeight.w600),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: const BorderSide(color: AstemoColors.border),
        ),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(foregroundColor: AstemoColors.textMuted),
    ),
    dialogTheme: const DialogThemeData(backgroundColor: AstemoColors.surface),
    inputDecorationTheme: const InputDecorationTheme(
      border: OutlineInputBorder(),
      focusedBorder: OutlineInputBorder(
        borderSide: BorderSide(color: AstemoColors.red, width: 2),
      ),
    ),
  );
}
