import 'package:flutter/material.dart';

import 'colors.dart';
import 'typography.dart';

ThemeData buildLightTheme() {
  const ink = PanelOsColors.inkLight;
  const inkMuted = PanelOsColors.inkMutedLight;
  const surface = PanelOsColors.surfaceLight;
  const canvas = PanelOsColors.canvasLight;
  const border = PanelOsColors.borderLight;

  final colorScheme = const ColorScheme.light(
    primary: PanelOsColors.accent,
    onPrimary: Colors.white,
    secondary: PanelOsColors.accent,
    onSecondary: Colors.white,
    surface: surface,
    onSurface: ink,
    surfaceContainerHighest: PanelOsColors.surfaceAltLight,
    error: PanelOsColors.statusError,
    onError: Colors.white,
    outline: border,
  );

  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    colorScheme: colorScheme,
    scaffoldBackgroundColor: canvas,
    canvasColor: canvas,
    dividerColor: border,
    textTheme: PanelOsTypography.buildTextTheme(ink, inkMuted),
    appBarTheme: AppBarTheme(
      backgroundColor: surface,
      foregroundColor: ink,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: PanelOsTypography.buildTextTheme(ink, inkMuted).titleLarge,
      iconTheme: const IconThemeData(color: ink),
      shape: const Border(bottom: BorderSide(color: border)),
    ),
    cardTheme: CardTheme(
      color: surface,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: border),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: PanelOsColors.accent,
        foregroundColor: Colors.white,
        minimumSize: const Size.fromHeight(48),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
        ),
        textStyle: const TextStyle(
          fontWeight: FontWeight.w600,
          letterSpacing: 0.2,
        ),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: ink,
        minimumSize: const Size.fromHeight(48),
        side: const BorderSide(color: border),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
        ),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: surface,
      hintStyle: const TextStyle(color: inkMuted),
      contentPadding: const EdgeInsets.symmetric(
        horizontal: 14,
        vertical: 14,
      ),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: PanelOsColors.accent, width: 1.5),
      ),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: PanelOsColors.surfaceAltLight,
      side: const BorderSide(color: border),
      labelStyle: const TextStyle(color: ink, fontWeight: FontWeight.w500),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
    ),
    dividerTheme: const DividerThemeData(
      color: border,
      thickness: 1,
      space: 1,
    ),
    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: surface,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
    ),
  );
}

ThemeData buildDarkTheme() {
  const ink = PanelOsColors.inkDark;
  const inkMuted = PanelOsColors.inkMutedDark;
  const surface = PanelOsColors.surfaceDark;
  const canvas = PanelOsColors.canvasDark;
  const border = PanelOsColors.borderDark;

  final colorScheme = const ColorScheme.dark(
    primary: PanelOsColors.accent,
    onPrimary: Colors.white,
    secondary: PanelOsColors.accent,
    onSecondary: Colors.white,
    surface: surface,
    onSurface: ink,
    surfaceContainerHighest: PanelOsColors.surfaceAltDark,
    error: PanelOsColors.statusError,
    onError: Colors.white,
    outline: border,
  );

  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    colorScheme: colorScheme,
    scaffoldBackgroundColor: canvas,
    canvasColor: canvas,
    dividerColor: border,
    textTheme: PanelOsTypography.buildTextTheme(ink, inkMuted),
    appBarTheme: AppBarTheme(
      backgroundColor: surface,
      foregroundColor: ink,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: PanelOsTypography.buildTextTheme(ink, inkMuted).titleLarge,
      iconTheme: const IconThemeData(color: ink),
      shape: const Border(bottom: BorderSide(color: border)),
    ),
    dividerTheme: const DividerThemeData(
      color: border,
      thickness: 1,
      space: 1,
    ),
  );
}
