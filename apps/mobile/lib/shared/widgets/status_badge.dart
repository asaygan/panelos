import 'package:flutter/material.dart';

import '../../theme/colors.dart';

/// A small pill-shaped status badge with a colored dot.
class StatusBadge extends StatelessWidget {
  const StatusBadge({
    required this.label,
    this.tone = StatusTone.neutral,
    super.key,
  });

  final String label;
  final StatusTone tone;

  @override
  Widget build(BuildContext context) {
    final color = _toneColor(tone);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.10),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withOpacity(0.25)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: color,
              letterSpacing: 0.2,
            ),
          ),
        ],
      ),
    );
  }

  Color _toneColor(StatusTone t) {
    switch (t) {
      case StatusTone.ok:
        return PanelOsColors.statusOk;
      case StatusTone.warn:
        return PanelOsColors.statusWarn;
      case StatusTone.error:
        return PanelOsColors.statusError;
      case StatusTone.info:
        return PanelOsColors.statusInfo;
      case StatusTone.neutral:
        return PanelOsColors.statusNeutral;
    }
  }
}

enum StatusTone { ok, warn, error, info, neutral }
