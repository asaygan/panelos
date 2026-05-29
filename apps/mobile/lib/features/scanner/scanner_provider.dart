import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';

final scannerProvider = Provider<ScannerService>((ref) {
  return ScannerService(ref.watch(apiClientProvider));
});

class ScannerService {
  ScannerService(this._client);
  final ApiClient _client;

  /// Resolves a QR token to a panel id via `GET /qr/:token/resolve`.
  Future<String> resolveQrToken(String token) async {
    final res = await _client.get<Map<String, dynamic>>(
      Endpoints.qrResolve(token),
    );
    final data = res.data ?? <String, dynamic>{};
    final panelId = data['panelId'];
    if (panelId is! String || panelId.isEmpty) {
      throw StateError('QR resolve response missing panelId');
    }
    return panelId;
  }
}
