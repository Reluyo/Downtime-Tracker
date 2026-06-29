import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';

import '../data/repository.dart';

enum SyncStatus { synced, pending, error }

/// Drives offline sync. Listens for connectivity changes and, when online,
/// refreshes reference data and pushes any closed-but-unsynced events to
/// Supabase. Exposes a [status] and [lastError] for the home-screen indicator.
class SyncService extends ChangeNotifier {
  SyncService(this._repo);

  final DowntimeRepository _repo;
  final Connectivity _connectivity = Connectivity();
  StreamSubscription<List<ConnectivityResult>>? _sub;
  Timer? _periodicTimer;

  SyncStatus _status = SyncStatus.pending;
  SyncStatus get status => _status;

  /// Human-readable description of the most recent sync error, or null.
  String? _lastError;
  String? get lastError => _lastError;

  bool _syncing = false;

  /// Max retry attempts per event push.
  static const _maxRetries = 3;

  /// Begin watching connectivity, start periodic timer, and do an initial sync.
  Future<void> start() async {
    _sub = _connectivity.onConnectivityChanged.listen((results) {
      if (_isOnline(results)) {
        syncNow();
      }
    });

    // Periodic sync every 60 seconds to catch anything missed.
    _periodicTimer = Timer.periodic(
      const Duration(seconds: 60),
      (_) => syncNow(),
    );

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

      // Sync reference data for the selected line, if one is selected.
      final selectedLine = await _repo.getSelectedLine();
      if (selectedLine != null) {
        await _repo.syncReferenceData(selectedLine.lineId);
      }

      // Push unsynced events with per-event retry + exponential backoff.
      final unsynced = await _repo.unsyncedEvents();
      for (final e in unsynced) {
        await _pushWithRetry(e);
      }

      _lastError = null;
      await _updateStatusFromPending();
    } catch (err) {
      _lastError = err.toString();
      _set(SyncStatus.error);
    } finally {
      _syncing = false;
    }
  }

  /// Attempts to push a single event up to [_maxRetries] times with
  /// exponential backoff (1s, 2s, 4s). If all retries fail, the event is
  /// skipped and the error is logged so the next sync cycle can retry.
  Future<void> _pushWithRetry(dynamic event) async {
    for (var attempt = 0; attempt < _maxRetries; attempt++) {
      try {
        await _repo.pushEvent(event);
        return; // success
      } catch (err) {
        if (attempt == _maxRetries - 1) {
          // All retries exhausted for this event — log and skip.
          _lastError = 'Failed to push event ${event.id}: $err';
          debugPrint(_lastError);
        } else {
          // Exponential backoff: 1s, 2s, 4s.
          await Future.delayed(Duration(seconds: 1 << attempt));
        }
      }
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
    _sub?.cancel();
    _periodicTimer?.cancel();
    super.dispose();
  }
}
