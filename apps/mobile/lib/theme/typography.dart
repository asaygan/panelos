import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// PanelOS typography. Inter for UI text, JetBrains Mono for tags/serials.
class PanelOsTypography {
  const PanelOsTypography._();

  static TextTheme buildTextTheme(Color ink, Color inkMuted) {
    final base = GoogleFonts.interTextTheme();
    return base.copyWith(
      displayLarge: base.displayLarge?.copyWith(
        color: ink,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.5,
      ),
      displayMedium: base.displayMedium?.copyWith(
        color: ink,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.4,
      ),
      headlineLarge: base.headlineLarge?.copyWith(
        color: ink,
        fontWeight: FontWeight.w700,
      ),
      headlineMedium: base.headlineMedium?.copyWith(
        color: ink,
        fontWeight: FontWeight.w700,
      ),
      headlineSmall: base.headlineSmall?.copyWith(
        color: ink,
        fontWeight: FontWeight.w600,
      ),
      titleLarge: base.titleLarge?.copyWith(
        color: ink,
        fontWeight: FontWeight.w600,
      ),
      titleMedium: base.titleMedium?.copyWith(
        color: ink,
        fontWeight: FontWeight.w600,
      ),
      titleSmall: base.titleSmall?.copyWith(
        color: ink,
        fontWeight: FontWeight.w600,
      ),
      bodyLarge: base.bodyLarge?.copyWith(color: ink, height: 1.4),
      bodyMedium: base.bodyMedium?.copyWith(color: ink, height: 1.4),
      bodySmall: base.bodySmall?.copyWith(color: inkMuted, height: 1.4),
      labelLarge: base.labelLarge?.copyWith(
        color: ink,
        fontWeight: FontWeight.w600,
        letterSpacing: 0.2,
      ),
      labelMedium: base.labelMedium?.copyWith(
        color: inkMuted,
        fontWeight: FontWeight.w500,
      ),
      labelSmall: base.labelSmall?.copyWith(
        color: inkMuted,
        fontWeight: FontWeight.w500,
      ),
    );
  }

  /// Monospace style for tags, serial numbers, panel IDs.
  static TextStyle mono({
    double size = 13,
    FontWeight weight = FontWeight.w500,
    Color? color,
  }) {
    return GoogleFonts.jetBrainsMono(
      fontSize: size,
      fontWeight: weight,
      color: color,
      letterSpacing: 0,
    );
  }
}
