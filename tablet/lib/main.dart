import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:path_provider/path_provider.dart';

import 'config/supabase.dart';
import 'data/local/database.dart';
import 'data/repository.dart';
import 'service_provider.dart';
import 'services/sync_service.dart';
import 'ui/home_screen.dart';
import 'ui/line_selection_screen.dart';
import 'ui/theme.dart';

Future<void> main() async {
  runZonedGuarded(_runApp, _logUncaughtError);
}

Future<void> _runApp() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Catch framework-level errors (e.g. build/layout exceptions) that would
  // otherwise only print to the console and be invisible in the field.
  FlutterError.onError = (details) {
    _logUncaughtError(details.exception, details.stack ?? StackTrace.empty);
    FlutterError.presentError(details);
  };

  // Load bundled environment + open the local SQLite database, then connect
  // Supabase. The app is usable offline; Supabase is best-effort.
  await dotenv.load(fileName: '.env');
  final database = AppDatabase();
  final repository = DowntimeRepository(database);
  try {
    await initSupabase();
  } catch (e, st) {
    // Supabase is best-effort — the app must still run offline if init fails
    // (e.g. bad URL/key, no network at first launch).
    _logUncaughtError(e, st);
  }

  final sync = SyncService(repository);
  unawaited(sync.start());

  runApp(PrsaTabletApp(
    database: database,
    repository: repository,
    syncService: sync,
  ));
}

/// Last-resort error logger. Persisted to a local file so a crash can be
/// inspected after the fact even without a remote crash-reporting service.
void _logUncaughtError(Object error, StackTrace stack) {
  debugPrint('UNCAUGHT ERROR: $error\n$stack');
  unawaited(_appendCrashLog('$error\n$stack'));
}

Future<void> _appendCrashLog(String entry) async {
  try {
    final dir = await getApplicationDocumentsDirectory();
    final file = File('${dir.path}/crash_log.txt');
    await file.writeAsString(
      '${DateTime.now().toIso8601String()} $entry\n\n',
      mode: FileMode.append,
      flush: true,
    );
  } catch (_) {
    // Logging must never throw — if the filesystem write fails there's
    // nothing further we can do here.
  }
}

class PrsaTabletApp extends StatelessWidget {
  const PrsaTabletApp({
    super.key,
    required this.database,
    required this.repository,
    required this.syncService,
  });

  final AppDatabase database;
  final DowntimeRepository repository;
  final SyncService syncService;

  @override
  Widget build(BuildContext context) {
    return ServiceProvider(
      database: database,
      repository: repository,
      syncService: syncService,
      child: MaterialApp(
        title: 'Astemo Downtime',
        debugShowCheckedModeBanner: false,
        theme: astemoDarkTheme(),
        home: const _AppShell(),
      ),
    );
  }
}

/// Decides whether to show the line picker or the home screen based on
/// whether a line has been selected.
class _AppShell extends StatefulWidget {
  const _AppShell();

  @override
  State<_AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<_AppShell> {
  bool _hasLine = false;
  bool _loading = true;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_loading) _checkLine();
  }

  Future<void> _checkLine() async {
    final sp = ServiceProvider.of(context);
    final selected = await sp.repository.getSelectedLine();
    if (mounted) {
      setState(() {
        _hasLine = selected != null;
        _loading = false;
      });
    }
  }

  void _onLineSelected() {
    setState(() {
      _hasLine = true;
    });
  }

  void _onChangeLine() {
    setState(() {
      _hasLine = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (!_hasLine) {
      return LineSelectionScreen(onLineSelected: _onLineSelected);
    }
    return HomeScreen(onChangeLine: _onChangeLine);
  }
}
