import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';

import '../data/repository.dart';

enum SyncStatus { synced, pending, error }

/// Drives offline sync. Listens for connectivity changes and, when online,
/// refreshes reference data and pushes any closed-but-unsynced events to
/// Supabase. Exposes a [status] for the home-screen indicator.
class SyncService extends ChangeNotifier {
  SyncService(this._repo);

  final DowntimeRepository _repo;
  final Connectivity _connectivity = Connectivity();
  StreamSubscription<List<ConnectivityResult>>? _sub;
  Timer? _periodicTimer;

  SyncStatus _status = SyncStatus.pending;
  SyncStatus get status => _status;

  DateTime? _lastSyncAt;
  DateTime? get lastSyncAt => _lastSyncAt;

  bool _syncing = false;

  /// Begin watching connectivity and do an initial sync.
  Future<void> start() async {
    _sub = _connectivity.onConnectivityChanged.listen((results) {
      if (_isOnline(results)) {
        syncNow();
      }
    });
    _periodicTimer = Timer.periodic(const Duration(minutes: 5), (_) => syncNow());
    await syncNow();
  }

  bool _isOnline(List<ConnectivityResult> results) =>
      results.any((r) => r != ConnectivityResult.none);

  /// Refresh reference data + push unsynced events. Safe to call repeatedly.
  Future<void> syncNow() async {
    if (_syncing) return;
    _syncing = true;
    try {
      final online = _isOnline(await _connectivity.checkConnectivity());
      if (!online) {
        await _updateStatusFromPending();
        return;
      }

      await _repo.syncReferenceData();

      final unsynced = await _repo.unsyncedEvents();
      for (final e in unsynced) {
        await _repo.pushEvent(e);
      }

      _lastSyncAt = DateTime.now();
      await _updateStatusFromPending();
    } catch (_) {
      _set(SyncStatus.error);
    } finally {
      _syncing = false;
    }
  }

  /// synced when nothing is queued, otherwise pending.
  Future<void> _updateStatusFromPending() async {
    final remaining = await _repo.unsyncedEvents();
    _set(remaining.isEmpty ? SyncStatus.synced : SyncStatus.pending);
  }

  void _set(SyncStatus s) {
    if (_status != s) {
      _status = s;
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _periodicTimer?.cancel();
    _sub?.cancel();
    super.dispose();
  }
}
