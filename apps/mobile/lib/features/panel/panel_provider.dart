import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';
import '../../core/storage/offline_cache.dart';
import '../../shared/models/panel.dart';

final panelProvider =
    FutureProvider.family<Panel, String>((ref, id) async {
  final client = ref.watch(apiClientProvider);
  final cache = ref.watch(offlineCacheProvider);
  try {
    final res =
        await client.get<Map<String, dynamic>>(Endpoints.panel(id));
    final panel = Panel.fromJson(res.data ?? <String, dynamic>{});
    await cache.putPanel(panel);
    return panel;
  } catch (e) {
    final cached = cache.getPanel(id);
    if (cached != null) return cached;
    rethrow;
  }
});
