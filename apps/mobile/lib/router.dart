import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'core/auth/auth_provider.dart';
import 'core/auth/auth_state.dart';
import 'features/auth/login_screen.dart';
import 'features/offline/offline_screen.dart';
import 'features/panel/panel_screen.dart';
import 'features/revisions/revision_history_screen.dart';
import 'features/scanner/scanner_screen.dart';
import 'features/viewer/schematic_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authNotifier = ref.watch(authProvider.notifier);

  return GoRouter(
    initialLocation: '/scan',
    refreshListenable: authNotifier,
    redirect: (context, state) {
      final auth = ref.read(authProvider);
      final loggingIn = state.matchedLocation == '/login';
      final loggedIn = auth.status == AuthStatus.authenticated;

      if (!loggedIn && !loggingIn) return '/login';
      if (loggedIn && loggingIn) return '/scan';
      return null;
    },
    routes: <RouteBase>[
      GoRoute(
        path: '/login',
        name: 'login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/scan',
        name: 'scan',
        builder: (context, state) => const ScannerScreen(),
      ),
      GoRoute(
        path: '/offline',
        name: 'offline',
        builder: (context, state) => const OfflineScreen(),
      ),
      GoRoute(
        path: '/panel/:id',
        name: 'panel',
        builder: (context, state) => PanelScreen(
          panelId: state.pathParameters['id'] ?? '',
        ),
        routes: <RouteBase>[
          GoRoute(
            path: 'schematic',
            name: 'schematic',
            builder: (context, state) => SchematicScreen(
              panelId: state.pathParameters['id'] ?? '',
            ),
          ),
          GoRoute(
            path: 'revisions',
            name: 'revisions',
            builder: (context, state) => RevisionHistoryScreen(
              panelId: state.pathParameters['id'] ?? '',
            ),
          ),
        ],
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      appBar: AppBar(title: const Text('Not found')),
      body: Center(child: Text('Route not found: ${state.uri}')),
    ),
  );
});
