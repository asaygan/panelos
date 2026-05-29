import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/storage/offline_cache.dart';
import '../../shared/models/panel.dart';

class OfflineSnapshot {
  const OfflineSnapshot({required this.panels, required this.bytesUsed});
  final List<Panel> panels;
  final int bytesUsed;
}

final offlineSnapshotProvider = Provider<OfflineSnapshot>((ref) {
  final cache = ref.watch(offlineCacheProvider);
  return OfflineSnapshot(
    panels: cache.allPanels(),
    bytesUsed: cache.approximateBytesUsed(),
  );
});
