import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

import 'config/supabase.dart';
import 'data/local/database.dart';
import 'data/repository.dart';
import 'service_provider.dart';
import 'services/sync_service.dart';
import 'ui/home_screen.dart';
import 'ui/line_selection_screen.dart';
import 'ui/theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Load bundled environment + open the local SQLite database, then connect
  // Supabase. The app is usable offline; Supabase is best-effort.
  await dotenv.load(fileName: '.env');
  final database = AppDatabase();
  final repository = DowntimeRepository(database);
  await initSupabase();

  final sync = SyncService(repository);
  unawaited(sync.start());

  runApp(PrsaTabletApp(
    database: database,
    repository: repository,
    syncService: sync,
  ));
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
