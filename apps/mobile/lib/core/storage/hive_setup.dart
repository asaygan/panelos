import 'package:hive_flutter/hive_flutter.dart';

/// Hive bootstrapping. Adapters for cached panels and file blobs are
/// registered here once the model adapters are generated.
class HiveSetup {
  const HiveSetup._();

  static const String panelsBox = 'panels_cache';
  static const String filesBox = 'files_cache';
  static const String metaBox = 'panelos_meta';

  static bool _initialized = false;

  static Future<void> initialize() async {
    if (_initialized) return;
    await Hive.initFlutter('panelos');

    // Adapters: registered here once `dart run build_runner build` runs.
    // e.g. Hive.registerAdapter(CachedPanelAdapter());

    await Hive.openBox<dynamic>(panelsBox);
    await Hive.openBox<dynamic>(filesBox);
    await Hive.openBox<dynamic>(metaBox);

    _initialized = true;
  }
}
