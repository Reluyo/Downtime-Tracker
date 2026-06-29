import 'package:flutter/material.dart';

import '../data/local/database.dart';
import '../main.dart';
import 'active_downtime_screen.dart';

/// Step 2 — Confirmation. "Start downtime for [Equipment]?" with START and
/// Cancel. Cancel returns to Home immediately.
class ConfirmationScreen extends StatelessWidget {
  const ConfirmationScreen({super.key, required this.equipment});

  final CachedEquipmentData equipment;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Confirm')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                'Start downtime for',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 8),
              Text(
                equipment.name,
                textAlign: TextAlign.center,
                style: Theme.of(context)
                    .textTheme
                    .displaySmall
                    ?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 48),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.red.shade600,
                  foregroundColor: Colors.white,
                  minimumSize: const Size(280, 96),
                ),
                onPressed: () => _start(context),
                child: const Text('START'),
              ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Cancel', style: TextStyle(fontSize: 18)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _start(BuildContext context) async {
    final event = await repo.startEvent(equipment.id);
    if (!context.mounted) return;
    // Replace so Back from the active screen doesn't return here.
    await Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => ActiveDowntimeScreen(event: event, equipment: equipment),
      ),
    );
  }
}
