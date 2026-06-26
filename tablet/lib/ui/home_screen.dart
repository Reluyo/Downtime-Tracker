import 'package:flutter/material.dart';

import '../config/env.dart';

/// Home screen — Step 1 of the operator flow.
///
/// SCAFFOLD: shows the line name and a sync-status placeholder. The equipment
/// button grid and the confirmation / active-downtime / reason screens are
/// built in the next pass.
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(Env.lineShortName),
        actions: const [
          Padding(
            padding: EdgeInsets.only(right: 16),
            child: _SyncIndicator(status: SyncStatus.synced),
          ),
        ],
      ),
      body: const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text(
            'Equipment grid coming soon.\nBackend, drift database, and Supabase '
            'connection are wired up.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 18),
          ),
        ),
      ),
    );
  }
}

enum SyncStatus { synced, pending, error }

/// Home-screen sync indicator: green (all synced), yellow (pending), red (error).
class _SyncIndicator extends StatelessWidget {
  const _SyncIndicator({required this.status});

  final SyncStatus status;

  @override
  Widget build(BuildContext context) {
    final (color, label) = switch (status) {
      SyncStatus.synced => (Colors.green, 'Synced'),
      SyncStatus.pending => (Colors.amber, 'Pending'),
      SyncStatus.error => (Colors.red, 'Error'),
    };
    return Row(
      children: [
        Icon(Icons.circle, color: color, size: 14),
        const SizedBox(width: 6),
        Text(label),
      ],
    );
  }
}
