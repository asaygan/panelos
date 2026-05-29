/// Compile-time environment configuration.
/// Pass via `--dart-define=API_URL=... --dart-define=ENV=...`.
class Env {
  const Env._();

  static const String apiUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://localhost:3000',
  );

  static const String environment = String.fromEnvironment(
    'ENV',
    defaultValue: 'dev',
  );

  static const String sentryDsn = String.fromEnvironment(
    'SENTRY_DSN',
    defaultValue: '',
  );

  static bool get isProd => environment == 'prod';
  static bool get isStaging => environment == 'staging';
  static bool get isDev => environment == 'dev';
}
