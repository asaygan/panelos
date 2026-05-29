import 'package:flutter/material.dart';

import '../../shared/widgets/empty_state.dart';
import '../../theme/colors.dart';
import 'sheet_selector.dart';

/// PDF schematic viewer. Wires the AppBar and sheet selector now;
/// the actual `PdfView` call will replace the placeholder once the
/// file-fetch pipeline is hooked up.
class SchematicScreen extends StatefulWidget {
  const SchematicScreen({required this.panelId, super.key});

  final String panelId;

  @override
  State<SchematicScreen> createState() => _SchematicScreenState();
}

class _SchematicScreenState extends State<SchematicScreen> {
  int _activeSheet = 0;
  final List<String> _sheetIds = <String>[];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: const Text('Schematic'),
        actions: <Widget>[
          IconButton(
            tooltip: 'Sheets',
            icon: const Icon(Icons.layers_outlined),
            onPressed: () => SheetSelector.show(
              context,
              sheetIds: _sheetIds,
              activeIndex: _activeSheet,
              onSelect: (i) => setState(() => _activeSheet = i),
            ),
          ),
          IconButton(
            tooltip: 'Download',
            icon: const Icon(Icons.download_outlined),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Download — coming soon')),
              );
            },
          ),
        ],
      ),
      body: const Center(
        child: EmptyState(
          icon: Icons.construction,
          title: 'Schematic viewer coming soon',
          message: 'Web MVP is shipping first. Mobile PDF viewer will use pdfx.',
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Container(
          height: 56,
          decoration: const BoxDecoration(
            color: Colors.black,
            border: Border(
              top: BorderSide(color: PanelOsColors.borderDark),
            ),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 16),
          alignment: Alignment.centerLeft,
          child: Text(
            'Panel ${widget.panelId}  ·  Sheet ${_activeSheet + 1}',
            style: const TextStyle(color: Colors.white70, fontSize: 12),
          ),
        ),
      ),
    );
  }
}
