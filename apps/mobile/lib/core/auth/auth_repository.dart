import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../shared/models/user.dart';
import '../api/api_client.dart';
import '../api/endpoints.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(client: ref.watch(apiClientProvider));
});

class AuthRepository {
  AuthRepository({
    required ApiClient client,
    FlutterSecureStorage? storage,
  }) : _client = client,
       _storage = storage ?? const FlutterSecureStorage();

  final ApiClient _client;
  final FlutterSecureStorage _storage;

  Future<String?> readToken() => _storage.read(key: kAuthTokenKey);

  Future<void> _writeToken(String token) =>
      _storage.write(key: kAuthTokenKey, value: token);

  Future<void> _clearToken() => _storage.delete(key: kAuthTokenKey);

  /// POST /auth/login → { token, user }
  Future<User> login({required String email, required String password}) async {
    final res = await _client.post<Map<String, dynamic>>(
      Endpoints.authLogin,
      data: <String, String>{'email': email, 'password': password},
    );
    final data = res.data ?? <String, dynamic>{};
    final token = data['token'];
    if (token is! String || token.isEmpty) {
      throw StateError('Login response missing token');
    }
    await _writeToken(token);
    final userJson = data['user'];
    if (userJson is! Map<String, dynamic>) {
      throw StateError('Login response missing user');
    }
    return User.fromJson(userJson);
  }

  /// GET /auth/me → current user, or null if not authenticated.
  Future<User?> currentUser() async {
    final token = await readToken();
    if (token == null || token.isEmpty) return null;
    try {
      final res = await _client.get<Map<String, dynamic>>(Endpoints.authMe);
      final data = res.data;
      if (data == null) return null;
      return User.fromJson(data);
    } catch (_) {
      return null;
    }
  }

  Future<void> logout() async {
    try {
      await _client.post<void>(Endpoints.authLogout);
    } catch (_) {
      // Best-effort; clear local state regardless.
    }
    await _clearToken();
  }
}
