import 'package:drift/drift.dart';
import 'package:drift_flutter/drift_flutter.dart';

part 'database.g.dart';

// ===========================================================================
// Local SQLite schema (drift)
// ===========================================================================
// The tablet is offline-first. It keeps a local cache of the line's
// configuration (so the operator UI works without connectivity) and a local
// queue of downtime events that sync up to Supabase when online.
//
// Run code generation after editing this file:
//   dart run build_runner build --delete-conflicting-outputs
// ===========================================================================

/// Cached equipment for the assigned line (mirrors Supabase `equipment`).
class CachedEquipment extends Table {
  TextColumn get id => text()();
  TextColumn get lineId => text()();
  TextColumn get name => text()();
  IntColumn get displayOrder => integer().withDefault(const Constant(0))();
  BoolColumn get isActive => boolean().withDefault(const Constant(true))();

  @override
  Set<Column> get primaryKey => {id};
}

/// Cached reason codes per equipment (mirrors Supabase `downtime_reasons`).
class CachedReasons extends Table {
  TextColumn get id => text()();
  TextColumn get equipmentId => text()();
  TextColumn get label => text()();
  BoolColumn get requiresNote => boolean().withDefault(const Constant(false))();
  IntColumn get displayOrder => integer().withDefault(const Constant(0))();
  BoolColumn get isActive => boolean().withDefault(const Constant(true))();

  @override
  Set<Column> get primaryKey => {id};
}

/// Cached per-line alert configuration (mirrors Supabase `app_config`).
class CachedConfig extends Table {
  TextColumn get lineId => text()();
  IntColumn get alertThresholdMinutes =>
      integer().withDefault(const Constant(60))();
  IntColumn get alertRepeatMinutes =>
      integer().withDefault(const Constant(15))();

  @override
  Set<Column> get primaryKey => {lineId};
}

/// Local downtime events. Created when the operator starts an event, updated
/// when resolved, and pushed to Supabase by the sync service.
class LocalEvents extends Table {
  /// Locally-generated UUID; also used as the Supabase row id on sync.
  TextColumn get id => text()();
  TextColumn get lineId => text()();
  TextColumn get equipmentId => text()();
  TextColumn get reasonId => text().nullable()();
  TextColumn get note => text().nullable()();
  DateTimeColumn get startedAt => dateTime()();
  DateTimeColumn get endedAt => dateTime().nullable()();
  IntColumn get durationSeconds => integer().nullable()();

  /// False until successfully written to Supabase.
  BoolColumn get synced => boolean().withDefault(const Constant(false))();

  @override
  Set<Column> get primaryKey => {id};
}

@DriftDatabase(tables: [CachedEquipment, CachedReasons, CachedConfig, LocalEvents])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_open());

  @override
  int get schemaVersion => 1;

  static QueryExecutor _open() {
    // drift_flutter picks an appropriate platform location for the db file.
    return driftDatabase(name: 'prsa_downtime');
  }
}
