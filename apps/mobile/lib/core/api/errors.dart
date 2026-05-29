/// Normalized API error surfaced to UI / state layer.
class ApiException implements Exception {
  const ApiException({
    required this.message,
    this.statusCode,
    this.code,
    this.cause,
  });

  final String message;
  final int? statusCode;
  final String? code;
  final Object? cause;

  bool get isUnauthorized => statusCode == 401;
  bool get isForbidden => statusCode == 403;
  bool get isNotFound => statusCode == 404;
  bool get isNetwork => statusCode == null;

  @override
  String toString() =>
      'ApiException(${statusCode ?? 'network'}: $message${code != null ? ' [$code]' : ''})';
}
