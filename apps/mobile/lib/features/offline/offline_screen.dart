import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../shared/widgets/empty_state.dart';
import '../../theme/colors.dart';
import '../../theme/typography.dart';
import 'offline_provider.dart';

class OfflineScreen extends ConsumerWidget {
  const OfflineScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final snapshot = ref.watch(offlineSnapshotProvider);
    final mb = (snapshot.bytesUsed / (1024 * 1024)).toStringAsFixed(1);

    return Scaffold(
      appBar: AppBar(title: const Text('Offline cache')),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(offlineSnapshotProvider);
          await Future<void>.delayed(const Duration(milliseconds: 250));
        },
        child: snapshot.panels.isEmpty
            ? ListView(
                children: const <Widget>[
                  SizedBox(height: 120),
                  EmptyState(
                    icon: Icons.cloud_off_outlined,
                    title: 'No cached panels',
                    message:
                        'Panels you open are automatically cached for offline use.',
                  ),
                ],
              )
            : ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                itemCount: snapshot.panels.length + 1,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (context, i) {
                  if (i == 0) {
                    return _StorageBar(mb: mb);
                  }
                  final panel = snapshot.panels[i - 1];
                  return Card(
                    child: ListTile(
                      title: Text(panel.name),
                      subtitle: Text(
                        panel.tag,
                        style: PanelOsTypography.mono(size: 12),
                      ),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => context.push('/panel/${panel.id}'),
                    ),
                  );
                },
              ),
      ),
    );
  }
}

class _StorageBar extends StatelessWidget {
  const _StorageBar({required this.mb});

  final String mb;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: PanelOsColors.surfaceAltLight,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: PanelOsColors.borderLight),
      ),
      child: Row(
        children: <Widget>[
          const Icon(
            Icons.storage_outlined,
            size: 18,
            color: PanelOsColors.inkMutedLight,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Storage used',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ),
          Text(
            '$mb MB',
            style: PanelOsTypography.mono(
              size: 13,
              weight: FontWeight.w600,
              color: PanelOsColors.inkLight,
            ),
          ),
        ],
      ),
    );
  }
}
