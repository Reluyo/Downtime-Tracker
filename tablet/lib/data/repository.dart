import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../config/supabase.dart';
import 'local/database.dart';

/// Central data access for the tablet. Reads/writes the local drift database
/// (offline-first) and talks to Supabase for reference data + pushing closed
/// downtime events.
///
/// Lifecycle of an event (one at a time, per the PoC flow):
///   start  -> a local row is created (synced = false, ended_at = null)
///   resolve-> ended_at + reason/note set; duration computed server-side
///   discard-> the local row is deleted (nothing was ever pushed)
class DowntimeRepository {
  DowntimeRepository(this.db);

  final AppDatabase db;
  static const _uuid = Uuid();

  // ---------------------------------------------------------------------------
  // Line selection
  // ---------------------------------------------------------------------------

  /// Fetches all lines from Supabase (for the line picker).
  Future<List<Map<String, dynamic>>> fetchAllLines() async {
    return await supabase
        .from('lines')
        .select('id, name, short_name')
        .order('name');
  }

  /// Persists the operator's line selection locally.
  Future<void> selectLine({
    required String lineId,
    required String lineName,
    required String shortName,
  }) async {
    await db.transaction(() async {
      await db.delete(db.selectedLine).go();
      await db.into(db.selectedLine).insert(SelectedLineCompanion.insert(
            lineId: lineId,
            lineName: lineName,
            shortName: shortName,
          ));
    });
  }

  /// Returns the currently selected line, or null if none chosen yet.
  Future<SelectedLineData?> getSelectedLine() {
    return db.select(db.selectedLine).getSingleOrNull();
  }

  /// Clears cached reference data so a fresh sync can repopulate it.
  Future<void> clearCachedReferenceData() async {
    await db.transaction(() async {
      await db.delete(db.cachedEquipment).go();
      await db.delete(db.cachedReasons).go();
      await db.delete(db.cachedConfig).go();
    });
  }

  // ---------------------------------------------------------------------------
  // Reference data (equipment / reasons / config for a specific line)
  // ---------------------------------------------------------------------------

  /// Pulls the selected line's configuration from Supabase into the local
  /// cache so the operator UI works offline afterwards. Requires connectivity.
  ///
  /// [lineId] — the Supabase line UUID to sync for.
  Future<void> syncReferenceData(String lineId) async {
    final equipment = await supabase
        .from('equipment')
        .select('id, line_id, name, display_order, is_active')
        .eq('line_id', lineId);

    final equipmentIds = equipment.map((e) => e['id'] as String).toList();

    // Fix #18: filter reasons server-side by equipment IDs.
    final reasons = equipmentIds.isEmpty
        ? <Map<String, dynamic>>[]
        : await supabase
            .from('downtime_reasons')
            .select(
                'id, equipment_id, label, requires_note, display_order, is_active')
            .inFilter('equipment_id', equipmentIds);

    final config = await supabase
        .from('app_config')
        .select('line_id, alert_threshold_minutes, alert_repeat_minutes')
        .eq('line_id', lineId)
        .maybeSingle();

    await db.transaction(() async {
      await db.delete(db.cachedEquipment).go();
      await db.delete(db.cachedReasons).go();
      await db.delete(db.cachedConfig).go();

      for (final e in equipment) {
        await db.into(db.cachedEquipment).insert(CachedEquipmentCompanion.insert(
              id: e['id'] as String,
              lineId: e['line_id'] as String,
              name: e['name'] as String,
              displayOrder: Value(e['display_order'] as int? ?? 0),
              isActive: Value(e['is_active'] as bool? ?? true),
            ));
      }

      for (final r in reasons) {
        await db.into(db.cachedReasons).insert(CachedReasonsCompanion.insert(
              id: r['id'] as String,
              equipmentId: r['equipment_id'] as String,
              label: r['label'] as String,
              requiresNote: Value(r['requires_note'] as bool? ?? false),
              displayOrder: Value(r['display_order'] as int? ?? 0),
              isActive: Value(r['is_active'] as bool? ?? true),
            ));
      }

      await db.into(db.cachedConfig).insert(CachedConfigCompanion.insert(
            lineId: lineId,
            alertThresholdMinutes:
                Value(config?['alert_threshold_minutes'] as int? ?? 60),
            alertRepeatMinutes:
                Value(config?['alert_repeat_minutes'] as int? ?? 15),
          ));
    });
  }

  /// The cached line id, or null if reference data has never been synced.
  Future<String?> cachedLineId() async {
    final row = await db.select(db.cachedConfig).getSingleOrNull();
    return row?.lineId;
  }

  /// Active equipment for the line, in display order.
  Future<List<CachedEquipmentData>> activeEquipment() {
    return (db.select(db.cachedEquipment)
          ..where((t) => t.isActive.equals(true))
          ..orderBy([(t) => OrderingTerm(expression: t.displayOrder)]))
        .get();
  }

  /// Active reason codes for a piece of equipment, in display order.
  Future<List<CachedReason>> reasonsForEquipment(String equipmentId) {
    return (db.select(db.cachedReasons)
          ..where((t) => t.equipmentId.equals(equipmentId) & t.isActive.equals(true))
          ..orderBy([(t) => OrderingTerm(expression: t.displayOrder)]))
        .get();
  }

  Future<CachedConfigData?> config() {
    return db.select(db.cachedConfig).getSingleOrNull();
  }

  // ---------------------------------------------------------------------------
  // Event lifecycle
  // ---------------------------------------------------------------------------

  /// Creates a local downtime event and returns it.
  Future<LocalEvent> startEvent(String equipmentId) async {
    final lineId = await cachedLineId();
    if (lineId == null) {
      throw StateError('No cached line. Connect to sync configuration first.');
    }
    final id = _uuid.v4();
    final companion = LocalEventsCompanion.insert(
      id: id,
      lineId: lineId,
      equipmentId: equipmentId,
      startedAt: DateTime.now().toUtc(),
    );
    await db.into(db.localEvents).insert(companion);
    return (db.select(db.localEvents)..where((t) => t.id.equals(id))).getSingle();
  }

  /// Closes an event with a reason (+ optional note). Duration is computed
  /// server-side by a trigger (migration 003), so we only store ended_at.
  Future<void> resolveEvent({
    required String eventId,
    required String reasonId,
    String? note,
  }) async {
    final endedAt = DateTime.now().toUtc();

    await (db.update(db.localEvents)..where((t) => t.id.equals(eventId))).write(
      LocalEventsCompanion(
        reasonId: Value(reasonId),
        note: Value(note),
        endedAt: Value(endedAt),
      ),
    );
  }

  /// Discards an in-progress event (never pushed to Supabase).
  Future<void> discardEvent(String eventId) async {
    await (db.delete(db.localEvents)..where((t) => t.id.equals(eventId))).go();
  }

  /// Resolved-but-not-yet-synced events.
  Future<List<LocalEvent>> unsyncedEvents() {
    return (db.select(db.localEvents)
          ..where((t) => t.synced.equals(false) & t.endedAt.isNotNull()))
        .get();
  }

  Future<void> markSynced(String eventId) async {
    await (db.update(db.localEvents)..where((t) => t.id.equals(eventId)))
        .write(const LocalEventsCompanion(synced: Value(true)));
  }

  /// Pushes a single closed event to Supabase. Throws on failure.
  /// Note: duration_seconds is NOT sent — the server computes it from
  /// started_at and ended_at via a trigger (migration 003).
  Future<void> pushEvent(LocalEvent e) async {
    await supabase.from('downtime_events').upsert({
      'id': e.id,
      'line_id': e.lineId,
      'equipment_id': e.equipmentId,
      'reason_id': e.reasonId,
      'note': e.note,
      'started_at': e.startedAt.toIso8601String(),
      'ended_at': e.endedAt?.toIso8601String(),
      'synced': true,
    });
    await markSynced(e.id);
  }
}
