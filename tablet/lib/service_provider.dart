import 'package:flutter/widgets.dart';

import 'data/local/database.dart';
import 'data/repository.dart';
import 'services/sync_service.dart';

/// InheritedWidget that provides the three core services to the widget tree.
/// Access via `ServiceProvider.of(context)`.
class ServiceProvider extends InheritedWidget {
  const ServiceProvider({
    super.key,
    required this.database,
    required this.repository,
    required this.syncService,
    required super.child,
  });

  final AppDatabase database;
  final DowntimeRepository repository;
  final SyncService syncService;

  static ServiceProvider of(BuildContext context) {
    final provider =
        context.dependOnInheritedWidgetOfExactType<ServiceProvider>();
    if (provider == null) {
      throw FlutterError('ServiceProvider not found in widget tree.');
    }
    return provider;
  }

  @override
  bool updateShouldNotify(ServiceProvider oldWidget) =>
      database != oldWidget.database ||
      repository != oldWidget.repository ||
      syncService != oldWidget.syncService;
}
