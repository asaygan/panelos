import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../env.dart';
import 'errors.dart';

/// Storage key for the bearer token, also referenced by auth_repository.
const String kAuthTokenKey = 'panelos.auth.token';

/// Dio HTTP client with:
///   - auth interceptor (attaches bearer from secure storage)
///   - normalized [ApiException] on errors
final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());

class ApiClient {
  ApiClient({Dio? dio, FlutterSecureStorage? storage})
    : _storage = storage ?? const FlutterSecureStorage(),
      _dio =
          dio ??
          Dio(
            BaseOptions(
              baseUrl: Env.apiUrl,
              connectTimeout: const Duration(seconds: 15),
              receiveTimeout: const Duration(seconds: 30),
              sendTimeout: const Duration(seconds: 30),
              headers: <String, String>{
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-Client': 'panelos-mobile',
              },
            ),
          ) {
    _dio.interceptors.add(_authInterceptor());
  }

  final Dio _dio;
  final FlutterSecureStorage _storage;

  Dio get raw => _dio;

  InterceptorsWrapper _authInterceptor() {
    return InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: kAuthTokenKey);
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (e, handler) {
        handler.reject(e);
      },
    );
  }

  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? query,
  }) async {
    try {
      return await _dio.get<T>(path, queryParameters: query);
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  Future<Response<T>> post<T>(
    String path, {
    Object? data,
    Map<String, dynamic>? query,
  }) async {
    try {
      return await _dio.post<T>(path, data: data, queryParameters: query);
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  Future<Response<T>> delete<T>(String path) async {
    try {
      return await _dio.delete<T>(path);
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  ApiException _toApiException(DioException e) {
    final status = e.response?.statusCode;
    final data = e.response?.data;
    String message = e.message ?? 'Network error';
    String? code;
    if (data is Map) {
      final dynamic m = data['message'] ?? data['error'];
      if (m is String) message = m;
      final dynamic c = data['code'];
      if (c is String) code = c;
    }
    return ApiException(
      message: message,
      statusCode: status,
      code: code,
      cause: e,
    );
  }
}
