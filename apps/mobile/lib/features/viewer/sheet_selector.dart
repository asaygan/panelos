import 'package:flutter/material.dart';

/// Bottom sheet listing the sheets within a schematic revision.
/// Stub — replace with real sheet list once viewer pipeline is wired.
class SheetSelector extends StatelessWidget {
  const SheetSelector({
    required this.sheetIds,
    required this.activeIndex,
    required this.onSelect,
    super.key,
  });

  final List<String> sheetIds;
  final int activeIndex;
  final ValueChanged<int> onSelect;

  static Future<void> show(
    BuildContext context, {
    required List<String> sheetIds,
    required int activeIndex,
    required ValueChanged<int> onSelect,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (_) => SheetSelector(
        sheetIds: sheetIds,
        activeIndex: activeIndex,
        onSelect: onSelect,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            Text('Sheets', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            if (sheetIds.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 16),
                child: Text(
                  'No sheets in this revision.',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              )
            else
              ...List<Widget>.generate(sheetIds.length, (i) {
                final id = sheetIds[i];
                final active = i == activeIndex;
                return ListTile(
                  dense: true,
                  selected: active,
                  leading: CircleAvatar(
                    radius: 14,
                    child: Text('${i + 1}'),
                  ),
                  title: Text('Sheet ${i + 1}'),
                  subtitle: Text(id),
                  trailing: active ? const Icon(Icons.check) : null,
                  onTap: () {
                    onSelect(i);
                    Navigator.of(context).pop();
                  },
                );
              }),
          ],
        ),
      ),
    );
  }
}
