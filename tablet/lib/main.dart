import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

import 'config/supabase.dart';
import 'data/local/database.dart';
import 'data/repository.dart';
import 'services/sync_service.dart';
import 'ui/home_screen.dart';
import 'ui/theme.dart';

/// App-wide singletons. Kept simple (no DI framework) for an app this size.
late final AppDatabase db;
late final DowntimeRepository repo;
late final SyncService syncService;

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Load bundled environment + open the local SQLite database, then connect
  // Supabase. The app is usable offline; Supabase is best-effort.
  await dotenv.load(fileName: '.env');
  db = AppDatabase();
  repo = DowntimeRepository(db);
  await initSupabase();

  // Sync runs in the background; the UI does not block on it.
  syncService = SyncService(repo);
  unawaited(syncService.start());

  runApp(const PrsaTabletApp());
}

class PrsaTabletApp extends StatelessWidget {
  const PrsaTabletApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'PRSA Downtime',
      debugShowCheckedModeBanner: false,
      theme: astemoDarkTheme(),
      home: const HomeScreen(),
    );
  }
}
