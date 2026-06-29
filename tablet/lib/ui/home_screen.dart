import 'package:flutter/material.dart';

import '../data/local/database.dart';
import '../service_provider.dart';
import '../services/sync_service.dart';
import 'active_downtime_screen.dart';
import 'edit_event_screen.dart';
import 'past_event_screen.dart';
import 'theme.dart';
import 'widgets/astemo_logo.dart';

/// Step 1 — Home. Shows the line name, a sync-status indicator, and a grid of
/// large buttons (one per active equipment).
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, required this.onChangeLine});

  /// Called when the operator taps "Change Line" to return to the picker.
  final VoidCallback onChangeLine;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  Future<List<CachedEquipmentData>>? _equipmentFuture;
  String _lineName = '';
  SyncService? _boundSyncService;
  Map<String, dynamic>? _lastEvent;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final sync = ServiceProvider.of(context).syncService;
    if (_boundSyncService != sync) {
      _boundSyncService?.removeListener(_onSyncChanged);
      _boundSyncService = sync;
      sync.addListener(_onSyncChanged);
    }
    _equipmentFuture ??= ServiceProvider.of(context).repository.activeEquipment();
    if (_lineName.isEmpty) _loadLineName();
  }

  void _onSyncChanged() {
    if (mounted) setState(_load);
  }

  @override
  void dispose() {
    _boundSyncService?.removeListener(_onSyncChanged);
    super.dispose();
  }

  void _load() {
    _equipmentFuture = ServiceProvider.of(context).repository.activeEquipment();
    _loadLastEvent();
  }

  Future<void> _loadLastEvent() async {
    final event = await ServiceProvider.of(context).repository.lastResolvedEvent();
    if (mounted) setState(() => _lastEvent = event);
  }

  Future<void> _loadLineName() async {
    final selected =
        await ServiceProvider.of(context).repository.getSelectedLine();
    if (mounted && selected != null) {
      setState(() => _lineName = selected.lineName);
    }
  }

  Future<void> _refresh() async {
    await ServiceProvider.of(context).syncService.syncNow();
    setState(_load);
  }

  Future<void> _onChangeLine() async {
    final sp = ServiceProvider.of(context);
    await sp.repository.clearCachedReferenceData();
    widget.onChangeLine();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_lineName),
        leading: IconButton(
          icon: const Icon(Icons.swap_horiz),
          tooltip: 'Change Line',
          onPressed: _onChangeLine,
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.post_add),
            tooltip: 'Log Past Event',
            onPressed: () async {
              await Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const PastEventScreen()),
              );
              if (mounted) setState(_load);
            },
          ),
          AnimatedBuilder(
            animation: ServiceProvider.of(context).syncService,
            builder: (_, __) {
              final sync = ServiceProvider.of(context).syncService;
              return Padding(
                padding: const EdgeInsets.only(right: 16),
                child: Center(
                  child: _SyncIndicator(
                    status: sync.status,
                    lastSyncedAt: sync.lastSyncedAt,
                  ),
                ),
              );
            },
          ),
          const AstemoAppBarLogo(),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: FutureBuilder<List<CachedEquipmentData>>(
          future: _equipmentFuture,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            final equipment = snapshot.data ?? const [];
            if (equipment.isEmpty) {
              return ListView(
                children: const [
                  SizedBox(height: 120),
                  Center(
                    child: Padding(
                      padding: EdgeInsets.all(24),
                      child: Text(
                        'No equipment yet.\nConnect to the internet and pull down '
                        'to sync configuration.',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 18),
                      ),
                    ),
                  ),
                ],
              );
            }
            return CustomScrollView(
              slivers: [
                if (_lastEvent != null) SliverToBoxAdapter(child: _LastEventCard(
                  event: _lastEvent!,
                  onEdited: () { if (mounted) setState(_load); },
                )),
                SliverPadding(
                  padding: const EdgeInsets.all(16),
                  sliver: SliverGrid(
                    gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                      maxCrossAxisExtent: 280,
                      childAspectRatio: 1.6,
                      crossAxisSpacing: 16,
                      mainAxisSpacing: 16,
                    ),
                    delegate: SliverChildBuilderDelegate(
                      (context, i) {
                        final e = equipment[i];
                        return ElevatedButton(
                          onPressed: () => _onEquipmentTap(e),
                          child: Text(e.name, textAlign: TextAlign.center),
                        );
                      },
                      childCount: equipment.length,
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Future<void> _onEquipmentTap(CachedEquipmentData equipment) async {
    final event = await ServiceProvider.of(context).repository.startEvent(equipment.id);
    if (!mounted) return;
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ActiveDowntimeScreen(event: event, equipment: equipment),
      ),
    );
    if (mounted) setState(_load);
  }
}

/// Home-screen sync indicator: green (all synced), amber (pending), red (error).
class _SyncIndicator extends StatelessWidget {
  const _SyncIndicator({required this.status, this.lastSyncedAt});

  final SyncStatus status;
  final DateTime? lastSyncedAt;

  @override
  Widget build(BuildContext context) {
    final (color, label) = switch (status) {
      SyncStatus.synced => (AstemoColors.ok, 'Synced'),
      SyncStatus.pending => (AstemoColors.warn, 'Pending'),
      SyncStatus.error => (AstemoColors.error, 'Sync error'),
    };
    String? timeLabel;
    if (lastSyncedAt != null) {
      final local = lastSyncedAt!.toLocal();
      final h = local.hour;
      final m = local.minute.toString().padLeft(2, '0');
      final ampm = h >= 12 ? 'PM' : 'AM';
      final h12 = h == 0 ? 12 : (h > 12 ? h - 12 : h);
      timeLabel = '$h12:$m $ampm';
    }
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.circle, color: color, size: 14),
            const SizedBox(width: 6),
            Text(label),
          ],
        ),
        if (timeLabel != null)
          Text(timeLabel, style: const TextStyle(fontSize: 11, color: AstemoColors.textMuted)),
      ],
    );
  }
}

/// Shows the most recent resolved event with an Edit button.
class _LastEventCard extends StatelessWidget {
  const _LastEventCard({required this.event, required this.onEdited});

  final Map<String, dynamic> event;
  final VoidCallback onEdited;

  @override
  Widget build(BuildContext context) {
    final equipName = event['equipment_name'] as String? ?? '—';
    final reasonLabel = event['reason_label'] as String? ?? '—';
    final startedAt = event['started_at'] as DateTime;
    final endedAt = event['ended_at'] as DateTime;
    final duration = endedAt.difference(startedAt);
    final eventId = event['id'] as String;
    final equipmentId = event['equipment_id'] as String;

    final h = duration.inHours.toString().padLeft(2, '0');
    final m = (duration.inMinutes % 60).toString().padLeft(2, '0');
    final s = (duration.inSeconds % 60).toString().padLeft(2, '0');

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: Container(
        decoration: BoxDecoration(
          color: AstemoColors.surfaceElevated,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AstemoColors.border),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        child: Row(
          children: [
            const Icon(Icons.history, size: 20, color: AstemoColors.textMuted),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                '$equipName · $h:$m:$s · $reasonLabel',
                style: const TextStyle(fontSize: 14, color: AstemoColors.textMuted),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            TextButton(
              onPressed: () async {
                await Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => EditEventScreen(
                      eventId: eventId,
                      equipmentId: equipmentId,
                    ),
                  ),
                );
                onEdited();
              },
              child: const Text('Edit', style: TextStyle(fontSize: 14)),
            ),
          ],
        ),
      ),
    );
  }
}
