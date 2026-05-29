import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

import '../../shared/models/panel.dart';
import 'hive_setup.dart';

final offlineCacheProvider = Provider<OfflineCache>((_) => OfflineCache());

/// Lightweight cache for panel metadata and file blobs.
///
/// Stores panels as raw JSON maps to avoid requiring a generated
/// Hive adapter at skeleton stage. Swap to a typed adapter once codegen is
/// wired up.
class OfflineCache {
  Box<dynamic> get _panels => Hive.box<dynamic>(HiveSetup.panelsBox);
  Box<dynamic> get _files => Hive.box<dynamic>(HiveSetup.filesBox);

  // ── Panels ───────────────────────────────────────────────────────────
  Future<void> putPanel(Panel panel) async {
    await _panels.put(panel.id, panel.toJson());
  }

  Panel? getPanel(String id) {
    final raw = _panels.get(id);
    if (raw is Map) {
      return Panel.fromJson(Map<String, dynamic>.from(raw));
    }
    return null;
  }

  List<Panel> allPanels() {
    return _panels.values
        .whereType<Map<dynamic, dynamic>>()
        .map((m) => Panel.fromJson(Map<String, dynamic>.from(m)))
        .toList(growable: false);
  }

  Future<void> removePanel(String id) => _panels.delete(id);

  // ── File blobs ───────────────────────────────────────────────────────
  Future<void> putFileBytes(String fileId, List<int> bytes) async {
    await _files.put(fileId, bytes);
  }

  List<int>? getFileBytes(String fileId) {
    final raw = _files.get(fileId);
    if (raw is List) return List<int>.from(raw);
    return null;
  }

  Future<void> clearAll() async {
    await _panels.clear();
    await _files.clear();
  }

  /// Approximate bytes used by cached file blobs.
  int approximateBytesUsed() {
    var total = 0;
    for (final v in _files.values) {
      if (v is List) total += v.length;
    }
    return total;
  }
}
