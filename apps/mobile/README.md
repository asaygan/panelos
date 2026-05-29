# PanelOS Mobile

Field technician companion app for PanelOS. QR scan, panel info, schematic
viewer with revision history, and offline cache.

> Status: **skeleton**. Routing, theme and navigation are wired; screen bodies
> are placeholders while the web MVP ships first.

## Requirements

- Flutter `>= 3.24.0`
- Dart `^3.5.0`
- Xcode 15+ (iOS) / Android Studio Hedgehog+ (Android)

## Setup

```bash
cd apps/mobile
flutter pub get
```

## Run

Dev (against local API):

```bash
flutter run \
  --dart-define=API_URL=http://localhost:3000 \
  --dart-define=ENV=dev
```

Staging:

```bash
flutter run \
  --dart-define=API_URL=https://api.staging.panelos.app \
  --dart-define=ENV=staging
```

## Project layout

```
lib/
  main.dart            Entry point. Initializes Hive + ProviderScope.
  app.dart             MaterialApp.router with PanelOS theme.
  router.dart          GoRouter routes + auth redirect guard.
  theme/               PanelOS design tokens (colors, typography, theme).
  core/                api/, auth/, storage/, env.
  features/            scanner, panel, viewer, revisions, offline, auth.
  shared/              Reusable widgets + plain Dart models.
  l10n/                Localization (placeholder).
```

## Conventions

- **State**: Riverpod 2.x (`flutter_riverpod`).
- **Models**: Plain immutable Dart classes (`final` fields + `const`
  constructor + `copyWith`). No code generation required to build.
- **Fonts**: `google_fonts` (Inter + JetBrains Mono) — no asset bundling.
- **Theme**: Material 3, mirrors PanelOS web tokens.

## Routes

| Path                      | Screen                  |
| ------------------------- | ----------------------- |
| `/login`                  | Login                   |
| `/scan`                   | QR scanner              |
| `/panel/:id`              | Panel info              |
| `/panel/:id/schematic`    | PDF schematic viewer    |
| `/panel/:id/revisions`    | Revision history        |
| `/offline`                | Cached panels           |

## Test

```bash
flutter test
```
