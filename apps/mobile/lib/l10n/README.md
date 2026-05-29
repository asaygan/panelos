# l10n

Localization placeholder. The mobile app is English-only at skeleton stage.

Planned setup:

1. Add `flutter_localizations` and `intl` to `pubspec.yaml`.
2. Enable `generate: true` under `flutter:` in `pubspec.yaml`.
3. Add `l10n.yaml` at the project root pointing at `lib/l10n/arb/`.
4. Add ARB files: `app_en.arb`, `app_tr.arb` (Turkish — primary customer base).
5. Reference strings via `AppLocalizations.of(context)!.someKey`.

Until then, strings live inline in widgets.
