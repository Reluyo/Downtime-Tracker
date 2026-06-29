import 'package:flutter/material.dart';

import '../config/env.dart';
import '../data/local/database.dart';
import '../main.dart';
import '../services/sync_service.dart';
import 'confirmation_screen.dart';
import 'theme.dart';
import 'widgets/astemo_logo.dart';

/// Step 1 — Home. Shows the line name, a sync-status indicator, and a grid of
/// large buttons (one per active equipment).
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late Future<List<CachedEquipmentData>> _equipmentFuture;
  Set<String> _activeDownIds = {};

  @override
  void initState() {
    super.initState();
    _load();
    syncService.addListener(_onSyncChanged);
  }

  void _onSyncChanged() {
    if (mounted) setState(_load);
  }

  @override
  void dispose() {
    syncService.removeListener(_onSyncChanged);
    super.dispose();
  }

  void _load() {
    _equipmentFuture = repo.activeEquipment();
    repo.activeDowntimeEquipmentIds().then((ids) {
      if (mounted) setState(() => _activeDownIds = ids);
    });
  }

  Future<void> _refresh() async {
    await syncService.syncNow();
    setState(_load);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(Env.lineShortName),
        actions: [
          AnimatedBuilder(
            animation: syncService,
            builder: (_, __) => Padding(
              padding: const EdgeInsets.only(right: 16),
              child: Center(child: _SyncIndicator(status: syncService.status)),
            ),
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
                final isDown = _activeDownIds.contains(e.id);
                return ElevatedButton(
                  style: isDown
                      ? ElevatedButton.styleFrom(
                          backgroundColor: AstemoColors.error.withValues(alpha: 0.2),
                          side: const BorderSide(color: AstemoColors.error, width: 2),
                        )
                      : null,
                  onPressed: isDown ? null : () => _onEquipmentTap(e),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(e.name, textAlign: TextAlign.center),
                      if (isDown)
                        const Padding(
                          padding: EdgeInsets.only(top: 4),
                          child: Text('DOWN', style: TextStyle(color: AstemoColors.error, fontSize: 12, fontWeight: FontWeight.bold)),
                        ),
                    ],
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }

  Future<void> _onEquipmentTap(CachedEquipmentData equipment) async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ConfirmationScreen(equipment: equipment),
      ),
    );
    // Returning here means the flow finished (saved) or was cancelled.
    if (mounted) setState(_load);
  }
}

/// Home-screen sync indicator: green (all synced), amber (pending), red (error).
class _SyncIndicator extends StatelessWidget {
  const _SyncIndicator({required this.status});

  final SyncStatus status;

  String _lastSyncLabel() {
    final t = syncService.lastSyncAt;
    if (t == null) return '';
    final diff = DateTime.now().difference(t);
    if (diff.inSeconds < 60) return 'just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    return '${diff.inHours}h ago';
  }

  @override
  Widget build(BuildContext context) {
    final (color, label) = switch (status) {
      SyncStatus.synced => (AstemoColors.ok, 'Synced'),
      SyncStatus.pending => (AstemoColors.warn, 'Pending'),
      SyncStatus.error => (AstemoColors.error, 'Sync error'),
    };
    final lastSync = _lastSyncLabel();
    return Row(
      children: [
        Icon(Icons.circle, color: color, size: 14),
        const SizedBox(width: 6),
        Text(label),
        if (lastSync.isNotEmpty) ...[
          const SizedBox(width: 6),
          Text('· $lastSync', style: TextStyle(fontSize: 12, color: Colors.white54)),
        ],
      ],
    );
  }
}
