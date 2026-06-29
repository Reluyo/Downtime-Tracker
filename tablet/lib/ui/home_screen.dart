import 'package:flutter/material.dart';

import '../data/local/database.dart';
import '../service_provider.dart';
import '../services/sync_service.dart';
import 'confirmation_screen.dart';
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
          AnimatedBuilder(
            animation: ServiceProvider.of(context).syncService,
            builder: (_, __) => Padding(
              padding: const EdgeInsets.only(right: 16),
              child: Center(
                child: _SyncIndicator(
                  status: ServiceProvider.of(context).syncService.status,
                ),
              ),
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
                return ElevatedButton(
                  onPressed: () => _onEquipmentTap(e),
                  child: Text(e.name, textAlign: TextAlign.center),
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

  @override
  Widget build(BuildContext context) {
    final (color, label) = switch (status) {
      SyncStatus.synced => (AstemoColors.ok, 'Synced'),
      SyncStatus.pending => (AstemoColors.warn, 'Pending'),
      SyncStatus.error => (AstemoColors.error, 'Sync error'),
    };
    return Row(
      children: [
        Icon(Icons.circle, color: color, size: 14),
        const SizedBox(width: 6),
        Text(label),
      ],
    );
  }
}
