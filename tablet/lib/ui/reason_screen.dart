import 'dart:async';

import 'package:flutter/material.dart';

import '../data/local/database.dart';
import '../service_provider.dart';
import 'other_note_screen.dart';
import 'theme.dart';
import 'widgets/astemo_logo.dart';

/// Step 4 — Reason. Grid of reason codes for the equipment. Tapping a reason
/// closes the event. "Other" (requires_note) opens a note screen first.
class ReasonScreen extends StatefulWidget {
  const ReasonScreen({super.key, required this.event, required this.equipment});

  final LocalEvent event;
  final CachedEquipmentData equipment;

  @override
  State<ReasonScreen> createState() => _ReasonScreenState();
}

class _ReasonScreenState extends State<ReasonScreen> {
  Future<List<CachedReason>>? _reasonsFuture;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _reasonsFuture ??= ServiceProvider.of(context)
        .repository
        .reasonsForEquipment(widget.equipment.id);
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('What was the reason?'),
          automaticallyImplyLeading: false,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            tooltip: 'Back',
            onPressed: _confirmBack,
          ),
          actions: const [AstemoAppBarLogo()],
        ),
        body: FutureBuilder<List<CachedReason>>(
          future: _reasonsFuture,
          builder: (context, snapshot) {
            if (!snapshot.hasData) {
              return const Center(child: CircularProgressIndicator());
            }
            final reasons = snapshot.data!;
            if (reasons.isEmpty) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text(
                        'No reason codes are configured for this equipment.\n'
                        'Add some in the Control Center, or go back.',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 18),
                      ),
                      const SizedBox(height: 24),
                      ElevatedButton(
                        onPressed: _confirmBack,
                        child: const Text('Back'),
                      ),
                    ],
                  ),
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
              itemCount: reasons.length,
              itemBuilder: (context, i) {
                final r = reasons[i];
                return ElevatedButton(
                  onPressed: () => _onReasonTap(r),
                  child: Text(r.label, textAlign: TextAlign.center),
                );
              },
            );
          },
        ),
      ),
    );
  }

  /// The event is already open (started) at this stage; going back discards
  /// it rather than leaving an orphaned open event with no way to resolve it.
  Future<void> _confirmBack() async {
    final discard = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Are you sure?'),
        content: const Text('This will discard the event.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Stay', style: TextStyle(fontSize: 18)),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AstemoColors.error),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Discard', style: TextStyle(fontSize: 18)),
          ),
        ],
      ),
    );
    if (discard != true) return;
    final sp = ServiceProvider.of(context);
    await sp.repository.discardEvent(widget.event.id);
    if (mounted) Navigator.of(context).popUntil((route) => route.isFirst);
  }

  Future<void> _onReasonTap(CachedReason reason) async {
    if (reason.requiresNote) {
      final note = await Navigator.of(context).push<String>(
        MaterialPageRoute(builder: (_) => const OtherNoteScreen()),
      );
      if (note == null) return; // operator backed out; stay on reason screen
      await _close(reason.id, note);
    } else {
      await _close(reason.id, null);
    }
  }

  Future<void> _close(String reasonId, String? note) async {
    final sp = ServiceProvider.of(context);
    await sp.repository.resolveEvent(
      eventId: widget.event.id,
      reasonId: reasonId,
      note: note,
    );
    // Best-effort immediate sync; the event is already saved locally.
    unawaited(sp.syncService.syncNow());
    if (mounted) {
      Navigator.of(context).popUntil((route) => route.isFirst);
    }
  }
}
