import 'package:flutter/material.dart';

import '../../../theme/colors.dart';
import '../../../theme/typography.dart';

class PanelMetaGrid extends StatelessWidget {
  const PanelMetaGrid({required this.entries, super.key});

  /// Ordered key/value pairs to render.
  final List<MapEntry<String, String>> entries;

  @override
  Widget build(BuildContext context) {
    if (entries.isEmpty) return const SizedBox.shrink();
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: PanelOsColors.borderLight),
      ),
      child: Column(
        children: <Widget>[
          for (var i = 0; i < entries.length; i++) ...<Widget>[
            _MetaRow(entry: entries[i]),
            if (i != entries.length - 1) const Divider(height: 1),
          ],
        ],
      ),
    );
  }
}

class _MetaRow extends StatelessWidget {
  const _MetaRow({required this.entry});
  final MapEntry<String, String> entry;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          SizedBox(
            width: 120,
            child: Text(
              entry.key,
              style: Theme.of(context).textTheme.labelMedium,
            ),
          ),
          Expanded(
            child: Text(
              entry.value,
              style: PanelOsTypography.mono(
                size: 13,
                color: Theme.of(context).colorScheme.onSurface,
              ),
              textAlign: TextAlign.right,
            ),
          ),
        ],
      ),
    );
  }
}
