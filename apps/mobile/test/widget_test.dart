import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:panelos_mobile/theme/theme.dart';

void main() {
  testWidgets('light theme builds and renders a basic scaffold',
      (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: buildLightTheme(),
        home: const Scaffold(
          body: Center(child: Text('PanelOS')),
        ),
      ),
    );

    expect(find.text('PanelOS'), findsOneWidget);
  });
}
