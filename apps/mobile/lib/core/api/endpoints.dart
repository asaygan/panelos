/// Centralized API endpoint paths.
/// Keep in sync with `apps/api/` and `docs/api/`.
class Endpoints {
  const Endpoints._();

  // Auth
  static const String authLogin = '/auth/login';
  static const String authLogout = '/auth/logout';
  static const String authMe = '/auth/me';
  static const String authRefresh = '/auth/refresh';

  // QR
  static String qrResolve(String token) => '/qr/$token/resolve';

  // Panels
  static String panel(String id) => '/panels/$id';
  static String panelRevisions(String id) => '/panels/$id/revisions';

  // Files
  static String file(String id) => '/files/$id';
  static String fileDownload(String id) => '/files/$id/download';
}
