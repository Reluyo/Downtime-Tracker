import 'dart:async';

import 'package:flutter/material.dart';

import '../data/local/database.dart';
import '../service_provider.dart';
import 'other_note_screen.dart';
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
          actions: const [AstemoAppBarLogo()],
        ),
        body: FutureBuilder<List<CachedReason>>(
          future: _reasonsFuture,
          builder: (context, snapshot) {
            if (!snapshot.hasData) {
              return const Center(child: CircularProgressIndicator());
            }
            final reasons = snapshot.data!;
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
