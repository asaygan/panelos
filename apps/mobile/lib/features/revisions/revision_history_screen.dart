import 'package:flutter/material.dart';

import '../../shared/widgets/empty_state.dart';

class RevisionHistoryScreen extends StatelessWidget {
  const RevisionHistoryScreen({required this.panelId, super.key});

  final String panelId;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Revision history')),
      body: EmptyState(
        icon: Icons.history_toggle_off,
        title: 'Coming soon',
        message:
            'Revision history for panel $panelId will land alongside the web MVP.',
      ),
    );
  }
}
