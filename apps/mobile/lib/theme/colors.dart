import 'package:flutter/material.dart';

/// PanelOS design tokens mirrored from the web app.
/// Industrial premium, light-primary, electric-blue accent.
class PanelOsColors {
  const PanelOsColors._();

  // ── Light ────────────────────────────────────────────────────────────
  static const Color canvasLight = Color(0xFFF4F6F8);
  static const Color surfaceLight = Color(0xFFFFFFFF);
  static const Color surfaceAltLight = Color(0xFFF8FAFC);
  static const Color inkLight = Color(0xFF14171A);
  static const Color inkMutedLight = Color(0xFF4B5563);
  static const Color borderLight = Color(0xFFE5E7EB);

  // ── Dark ─────────────────────────────────────────────────────────────
  static const Color canvasDark = Color(0xFF0B0D10);
  static const Color surfaceDark = Color(0xFF14171A);
  static const Color surfaceAltDark = Color(0xFF1B1F24);
  static const Color inkDark = Color(0xFFF4F6F8);
  static const Color inkMutedDark = Color(0xFF9CA3AF);
  static const Color borderDark = Color(0xFF2A2F36);

  // ── Brand accent ─────────────────────────────────────────────────────
  static const Color accent = Color(0xFF3B82F6); // electric blue
  static const Color accentPressed = Color(0xFF2563EB);
  static const Color accentSoft = Color(0xFFDBEAFE);

  // ── Status ───────────────────────────────────────────────────────────
  static const Color statusOk = Color(0xFF10B981);
  static const Color statusWarn = Color(0xFFF59E0B);
  static const Color statusError = Color(0xFFEF4444);
  static const Color statusInfo = Color(0xFF0EA5E9);
  static const Color statusNeutral = Color(0xFF6B7280);
}
