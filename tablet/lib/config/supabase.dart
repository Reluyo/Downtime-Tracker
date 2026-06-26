import 'package:supabase_flutter/supabase_flutter.dart';
import 'env.dart';

/// Initializes the Supabase client. The tablet uses the publishable (anon)
/// key and has no user login — Row Level Security allows anonymous reads of
/// config tables and inserts/updates of downtime events.
Future<void> initSupabase() async {
  await Supabase.initialize(
    url: Env.supabaseUrl,
    anonKey: Env.supabaseAnonKey,
  );
}

/// Shorthand for the global Supabase client.
SupabaseClient get supabase => Supabase.instance.client;
