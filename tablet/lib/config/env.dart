import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Typed access to the values loaded from the bundled `.env` asset.
class Env {
  static String get supabaseUrl => _require('SUPABASE_URL');
  static String get supabaseAnonKey => _require('SUPABASE_ANON_KEY');
  /// Optional default line short name. When set, the line picker can
  /// pre-select this line, but the operator can still change lines.
  static String? get lineShortName => dotenv.env['LINE_SHORT_NAME'];

  static String _require(String key) {
    final value = dotenv.env[key];
    if (value == null || value.isEmpty) {
      throw StateError(
        'Missing "$key". Copy tablet/.env.example to tablet/.env and fill it in.',
      );
    }
    return value;
  }
}
