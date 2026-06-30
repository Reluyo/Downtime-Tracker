import 'dart:async';

import 'package:flutter/material.dart';

import '../data/local/database.dart';
import '../service_provider.dart';
import 'other_note_screen.dart';
import 'theme.dart';
import 'widgets/astemo_logo.dart';

/// Log a downtime event that already happened (retroactive entry).
/// Steps: pick equipment → pick times → pick reason → (optional note) → save.
class PastEventScreen extends StatefulWidget {
  const PastEventScreen({super.key});

  @override
  State<PastEventScreen> createState() => _PastEventScreenState();
}

class _PastEventScreenState extends State<PastEventScreen> {
  int _step = 0; // 0=equipment, 1=times, 2=reason
  CachedEquipmentData? _equipment;
  late DateTime _startedAt;
  late DateTime _endedAt;
  Future<List<CachedEquipmentData>>? _equipmentFuture;
  Future<List<CachedReason>>? _reasonsFuture;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _endedAt = now;
    _startedAt = now.subtract(const Duration(hours: 1));
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _equipmentFuture ??= ServiceProvider.of(context).repository.activeEquipment();
  }

  void _pickEquipment(CachedEquipmentData equip) {
    setState(() {
      _equipment = equip;
      _step = 1;
    });
  }

  Future<void> _pickStartTime() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _startedAt,
      firstDate: DateTime.now().subtract(const Duration(days: 7)),
      lastDate: DateTime.now(),
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_startedAt),
    );
    if (time == null || !mounted) return;
    setState(() {
      _startedAt = DateTime(date.year, date.month, date.day, time.hour, time.minute);
    });
  }

  Future<void> _pickEndTime() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _endedAt,
      firstDate: _startedAt,
      lastDate: DateTime.now(),
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_endedAt),
    );
    if (time == null || !mounted) return;
    setState(() {
      _endedAt = DateTime(date.year, date.month, date.day, time.hour, time.minute);
    });
  }

  void _confirmTimes() {
    if (_startedAt.isAfter(_endedAt)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Start time must be before end time')),
      );
      return;
    }
    setState(() {
      _reasonsFuture = ServiceProvider.of(context)
          .repository
          .reasonsForEquipment(_equipment!.id);
      _step = 2;
    });
  }

  Future<void> _onReasonTap(CachedReason reason) async {
    String? note;
    if (reason.requiresNote) {
      note = await Navigator.of(context).push<String>(
        MaterialPageRoute(builder: (_) => const OtherNoteScreen()),
      );
      if (note == null) return;
    }
    await _save(reason.id, note);
  }

  Future<void> _save(String reasonId, String? note) async {
    if (_saving) return;
    setState(() => _saving = true);
    try {
      final sp = ServiceProvider.of(context);
      await sp.repository.createPastEvent(
        equipmentId: _equipment!.id,
        reasonId: reasonId,
        startedAt: _startedAt.toUtc(),
        endedAt: _endedAt.toUtc(),
        note: note,
      );
      unawaited(sp.syncService.syncNow());
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  String _formatTime(DateTime dt) {
    final h = dt.hour;
    final m = dt.minute.toString().padLeft(2, '0');
    final ampm = h >= 12 ? 'PM' : 'AM';
    final h12 = h == 0 ? 12 : (h > 12 ? h - 12 : h);
    final month = dt.month;
    final day = dt.day;
    return '$month/$day $h12:$m $ampm';
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: _step == 0,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        setState(() => _step -= 1);
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(_step == 0
              ? 'Log Past Event'
              : _step == 1
                  ? 'Set Times'
                  : 'Select Reason'),
          leading: _step > 0
              ? IconButton(
                  icon: const Icon(Icons.arrow_back),
                  tooltip: 'Back',
                  onPressed: () => setState(() => _step -= 1),
                )
              : null,
          actions: const [AstemoAppBarLogo()],
        ),
        body: switch (_step) {
          0 => _buildEquipmentStep(),
          1 => _buildTimesStep(),
          2 => _buildReasonStep(),
          _ => const SizedBox.shrink(),
        },
      ),
    );
  }

  Widget _buildEquipmentStep() {
    return FutureBuilder<List<CachedEquipmentData>>(
      future: _equipmentFuture,
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }
        final equipment = snapshot.data!;
        return GridView.builder(
          padding: const EdgeInsets.all(16),
          gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
            maxCrossAxisExtent: 280,
            childAspectRatio: 1.6,
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
          ),
          itemCount: equipment.length,
          itemBuilder: (context, i) {
            final e = equipment[i];
            return ElevatedButton(
              onPressed: () => _pickEquipment(e),
              child: Text(e.name, textAlign: TextAlign.center),
            );
          },
        );
      },
    );
  }

  Widget _buildTimesStep() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              _equipment!.name,
              style: Theme.of(context)
                  .textTheme
                  .headlineSmall
                  ?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 32),
            OutlinedButton.icon(
              icon: const Icon(Icons.schedule),
              label: Text('Start: ${_formatTime(_startedAt)}',
                  style: const TextStyle(fontSize: 18)),
              onPressed: _pickStartTime,
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(300, 64),
              ),
            ),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              icon: const Icon(Icons.schedule),
              label: Text('End: ${_formatTime(_endedAt)}',
                  style: const TextStyle(fontSize: 18)),
              onPressed: _pickEndTime,
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(300, 64),
              ),
            ),
            const SizedBox(height: 32),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AstemoColors.ok,
                foregroundColor: AstemoColors.black,
                minimumSize: const Size(280, 80),
              ),
              onPressed: _confirmTimes,
              child: const Text('NEXT'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildReasonStep() {
    if (_saving) {
      return const Center(child: CircularProgressIndicator());
    }
    return FutureBuilder<List<CachedReason>>(
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
    );
  }
}
