import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

import 'config/supabase.dart';
import 'data/local/database.dart';
import 'ui/home_screen.dart';

late final AppDatabase db;

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Load bundled environment + open the local SQLite database, then connect
  // Supabase. The app is usable offline; Supabase is best-effort.
  await dotenv.load(fileName: '.env');
  db = AppDatabase();
  await initSupabase();

  runApp(const PrsaTabletApp());
}

class PrsaTabletApp extends StatelessWidget {
  const PrsaTabletApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'PRSA Downtime',
      theme: ThemeData(
        colorSchemeSeed: Colors.blue,
        useMaterial3: true,
        // Large, high-contrast touch targets for the production floor.
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            minimumSize: const Size(160, 96),
            textStyle: const TextStyle(fontSize: 22, fontWeight: FontWeight.w600),
          ),
        ),
      ),
      home: const HomeScreen(),
    );
  }
}
