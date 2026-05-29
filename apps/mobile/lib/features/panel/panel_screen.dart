import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../shared/models/panel.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import '../../theme/colors.dart';
import '../../theme/typography.dart';
import 'panel_provider.dart';
import 'widgets/panel_meta_grid.dart';
import 'widgets/panel_status_badge.dart';

class PanelScreen extends ConsumerWidget {
  const PanelScreen({required this.panelId, super.key});

  final String panelId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final panelAsync = ref.watch(panelProvider(panelId));

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
        title: Row(
          children: <Widget>[
            Container(
              width: 22,
              height: 22,
              decoration: BoxDecoration(
                color: PanelOsColors.accent,
                borderRadius: BorderRadius.circular(5),
              ),
              alignment: Alignment.center,
              child: const Icon(Icons.bolt, color: Colors.white, size: 14),
            ),
            const SizedBox(width: 8),
            const Text('PanelOS'),
          ],
        ),
        actions: <Widget>[
          IconButton(
            tooltip: 'Revisions',
            icon: const Icon(Icons.history),
            onPressed: () => context.push('/panel/$panelId/revisions'),
          ),
        ],
      ),
      body: panelAsync.when(
        loading: () => const LoadingView(label: 'Loading panel'),
        error: (e, _) => ErrorView(
          message: e.toString(),
          onRetry: () => ref.invalidate(panelProvider(panelId)),
        ),
        data: (panel) => _PanelBody(panel: panel),
      ),
    );
  }
}

class _PanelBody extends StatelessWidget {
  const _PanelBody({required this.panel});

  final Panel panel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final meta = <MapEntry<String, String>>[
      if (panel.customer != null)
        MapEntry('Customer', panel.customer!),
      if (panel.location != null)
        MapEntry('Location', panel.location!),
      if (panel.voltage != null)
        MapEntry('Voltage', panel.voltage!),
      if (panel.currentRevisionId != null)
        MapEntry('Revision', panel.currentRevisionId!),
      ...panel.metadata.entries,
    ];

    return ListView(
      padding: const EdgeInsets.all(16),
      children: <Widget>[
        Row(
          children: <Widget>[
            Expanded(
              child: Text(
                panel.tag,
                style: PanelOsTypography.mono(
                  size: 15,
                  color: PanelOsColors.inkMutedLight,
                ),
              ),
            ),
            PanelStatusBadge(status: panel.status),
          ],
        ),
        const SizedBox(height: 6),
        Text(panel.name, style: theme.textTheme.headlineSmall),
        const SizedBox(height: 20),
        PanelMetaGrid(entries: meta),
        const SizedBox(height: 20),
        FilledButton.icon(
          onPressed: () => context.push('/panel/${panel.id}/schematic'),
          icon: const Icon(Icons.description_outlined),
          label: const Text('View schematic'),
        ),
        const SizedBox(height: 10),
        OutlinedButton.icon(
          onPressed: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Report issue — coming soon'),
              ),
            );
          },
          icon: const Icon(Icons.report_problem_outlined),
          label: const Text('Report issue'),
        ),
        const SizedBox(height: 24),
        Center(
          child: Text(
            'Panel ID: ${panel.id}',
            style: PanelOsTypography.mono(
              size: 11,
              color: PanelOsColors.inkMutedLight,
            ),
          ),
        ),
      ],
    );
  }
}
