import 'package:flutter/material.dart';

import '../../../shared/widgets/status_badge.dart';

class PanelStatusBadge extends StatelessWidget {
  const PanelStatusBadge({required this.status, super.key});

  final String status;

  @override
  Widget build(BuildContext context) {
    final tone = _toneFor(status);
    return StatusBadge(label: status.toUpperCase(), tone: tone);
  }

  StatusTone _toneFor(String s) {
    switch (s.toLowerCase()) {
      case 'live':
      case 'active':
      case 'commissioned':
        return StatusTone.ok;
      case 'maintenance':
      case 'pending':
        return StatusTone.warn;
      case 'fault':
      case 'offline':
        return StatusTone.error;
      case 'draft':
        return StatusTone.info;
      default:
        return StatusTone.neutral;
    }
  }
}
