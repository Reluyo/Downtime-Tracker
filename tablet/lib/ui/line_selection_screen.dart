import 'package:flutter/material.dart';

import '../service_provider.dart';
import 'theme.dart';
import 'widgets/astemo_logo.dart';

/// Displays all available production lines as large buttons. The operator taps
/// one to select it; the selection is persisted locally and reference data is
/// synced for that line.
///
/// [onLineSelected] is called after the line is saved and reference data synced
/// so the caller can navigate to the HomeScreen.
class LineSelectionScreen extends StatefulWidget {
  const LineSelectionScreen({super.key, required this.onLineSelected});

  final VoidCallback onLineSelected;

  @override
  State<LineSelectionScreen> createState() => _LineSelectionScreenState();
}

class _LineSelectionScreenState extends State<LineSelectionScreen> {
  Future<List<Map<String, dynamic>>>? _linesFuture;
  bool _selecting = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _linesFuture ??= ServiceProvider.of(context).repository.fetchAllLines();
  }

  Future<void> _onLineTap(Map<String, dynamic> line) async {
    if (_selecting) return;
    setState(() => _selecting = true);

    final sp = ServiceProvider.of(context);
    final lineId = line['id'] as String;
    final lineName = line['name'] as String;
    final shortName = line['short_name'] as String;

    try {
      await sp.repository.selectLine(
        lineId: lineId,
        lineName: lineName,
        shortName: shortName,
      );
      // Clear old cache and sync for the new line.
      await sp.repository.clearCachedReferenceData();
      await sp.repository.syncReferenceData(lineId);

      if (mounted) widget.onLineSelected();
    } catch (err) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to select line: $err')),
        );
        setState(() => _selecting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Select Line'),
        actions: const [AstemoAppBarLogo()],
      ),
      body: FutureBuilder<List<Map<String, dynamic>>>(
        future: _linesFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting || _selecting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Could not load lines.\nCheck your internet connection.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 18,
                        color: AstemoColors.textMuted,
                      ),
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: () => setState(() {
                        _linesFuture = ServiceProvider.of(context)
                            .repository
                            .fetchAllLines();
                      }),
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            );
          }
          final lines = snapshot.data ?? const [];
          if (lines.isEmpty) {
            return const Center(
              child: Text(
                'No lines configured.\nAsk an administrator to add lines.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 18),
              ),
            );
          }
          return GridView.builder(
            padding: const EdgeInsets.all(16),
            gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
              maxCrossAxisExtent: 280,
              childAspectRatio: 1.6,
              crossAxisSpacing: 16,
              mainAxisSpacing: 16,
            ),
            itemCount: lines.length,
            itemBuilder: (context, i) {
              final line = lines[i];
              return ElevatedButton(
                onPressed: () => _onLineTap(line),
                child: Text(
                  line['name'] as String,
                  textAlign: TextAlign.center,
                ),
              );
            },
          );
        },
      ),
    );
  }
}
