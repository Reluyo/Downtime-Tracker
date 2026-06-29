import 'dart:async';

import 'package:flutter/material.dart';

import '../data/local/database.dart';
import '../service_provider.dart';
import 'other_note_screen.dart';
import 'widgets/astemo_logo.dart';

/// Lets the operator change the reason code (and note) on a recent event.
class EditEventScreen extends StatefulWidget {
  const EditEventScreen({
    super.key,
    required this.eventId,
    required this.equipmentId,
  });

  final String eventId;
  final String equipmentId;

  @override
  State<EditEventScreen> createState() => _EditEventScreenState();
}

class _EditEventScreenState extends State<EditEventScreen> {
  Future<List<CachedReason>>? _reasonsFuture;
  bool _saving = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _reasonsFuture ??= ServiceProvider.of(context)
        .repository
        .reasonsForEquipment(widget.equipmentId);
  }

  Future<void> _onReasonTap(CachedReason reason) async {
    if (_saving) return;
    String? note;
    if (reason.requiresNote) {
      note = await Navigator.of(context).push<String>(
        MaterialPageRoute(builder: (_) => const OtherNoteScreen()),
      );
      if (note == null) return;
    }
    setState(() => _saving = true);
    try {
      final sp = ServiceProvider.of(context);
      await sp.repository.updateEventReason(
        eventId: widget.eventId,
        reasonId: reason.id,
        note: note,
      );
      unawaited(sp.syncService.syncNow());
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
        setState(() => _saving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Change Reason'),
        actions: const [AstemoAppBarLogo()],
      ),
      body: _saving
          ? const Center(child: CircularProgressIndicator())
          : FutureBuilder<List<CachedReason>>(
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
    );
  }
}
