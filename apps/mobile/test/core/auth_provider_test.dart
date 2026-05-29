import 'package:flutter_test/flutter_test.dart';

import 'package:panelos_mobile/core/auth/auth_state.dart';
import 'package:panelos_mobile/shared/models/user.dart';

void main() {
  group('AuthState', () {
    test('unknown is the initial status', () {
      const state = AuthState.unknown();
      expect(state.status, AuthStatus.unknown);
      expect(state.user, isNull);
    });

    test('authenticated carries a user', () {
      const user = User(
        id: 'u_1',
        email: 'tech@example.com',
        name: 'Tech',
        role: 'technician',
      );
      const state = AuthState.authenticated(user);
      expect(state.status, AuthStatus.authenticated);
      expect(state.user?.id, 'u_1');
    });

    test('unauthenticated preserves error message', () {
      const state = AuthState.unauthenticated(error: 'bad creds');
      expect(state.status, AuthStatus.unauthenticated);
      expect(state.errorMessage, 'bad creds');
    });
  });
}
