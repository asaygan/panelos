import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'auth_repository.dart';
import 'auth_state.dart';

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.watch(authRepositoryProvider))..bootstrap();
});

class AuthNotifier extends StateNotifier<AuthState>
    implements Listenable {
  AuthNotifier(this._repo) : super(const AuthState.unknown());

  final AuthRepository _repo;
  final List<VoidCallback> _listeners = <VoidCallback>[];

  Future<void> bootstrap() async {
    final user = await _repo.currentUser();
    state = user == null
        ? const AuthState.unauthenticated()
        : AuthState.authenticated(user);
  }

  Future<void> login({
    required String email,
    required String password,
  }) async {
    try {
      final user = await _repo.login(email: email, password: password);
      state = AuthState.authenticated(user);
    } catch (e) {
      state = AuthState.unauthenticated(error: e.toString());
      rethrow;
    }
  }

  Future<void> logout() async {
    await _repo.logout();
    state = const AuthState.unauthenticated();
  }

  // ── Listenable (for GoRouter.refreshListenable) ─────────────────────
  @override
  void addListener(VoidCallback listener) => _listeners.add(listener);

  @override
  void removeListener(VoidCallback listener) => _listeners.remove(listener);

  @override
  set state(AuthState value) {
    super.state = value;
    for (final l in List<VoidCallback>.of(_listeners)) {
      l();
    }
  }
}
