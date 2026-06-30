import 'dart:async';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

import '../data/local/database.dart';
import '../service_provider.dart';
import 'reason_screen.dart';
import 'theme.dart';
import 'widgets/astemo_logo.dart';

/// Step 3 — Active Downtime. Stopwatch counting up, RESOLVED + Cancel.
///
/// Alert logic: after `alert_threshold_minutes`, play a sound + show an alert.
/// "Still Down" resets the timer for the next repeat; "Resolved" goes to the
/// reason screen. The alert repeats every `alert_repeat_minutes`.
class ActiveDowntimeScreen extends StatefulWidget {
  const ActiveDowntimeScreen({
    super.key,
    required this.event,
    required this.equipment,
  });

  final LocalEvent event;
  final CachedEquipmentData equipment;

  @override
  State<ActiveDowntimeScreen> createState() => _ActiveDowntimeScreenState();
}

class _ActiveDowntimeScreenState extends State<ActiveDowntimeScreen> {
  final AudioPlayer _player = AudioPlayer();
  Timer? _ticker;
  Duration _elapsed = Duration.zero;

  // Alert scheduling, in seconds of elapsed time.
  int _thresholdSeconds = 60 * 60;
  int _repeatSeconds = 15 * 60;
  late int _nextAlertAtSeconds;
  bool _alerting = false;
  bool _muted = false;
  bool _configLoaded = false;
  bool _configLoadStarted = false;

  @override
  void initState() {
    super.initState();
    WakelockPlus.enable();
    _nextAlertAtSeconds = _thresholdSeconds;
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_configLoadStarted) {
      _configLoadStarted = true;
      _loadConfig();
    }
  }

  Future<void> _loadConfig() async {
    final cfg = await ServiceProvider.of(context).repository.config();
    if (!mounted) return;
    setState(() {
      if (cfg != null) {
        _thresholdSeconds = cfg.alertThresholdMinutes * 60;
        _repeatSeconds = cfg.alertRepeatMinutes * 60;
        _nextAlertAtSeconds = _thresholdSeconds;
      }
      _configLoaded = true;
    });
  }

  void _tick() {
    if (!mounted) return;
    setState(() {
      _elapsed = DateTime.now().toUtc().difference(widget.event.startedAt);
    });
    if (_configLoaded && !_alerting && _elapsed.inSeconds >= _nextAlertAtSeconds) {
      _triggerAlert();
    }
  }

  Future<void> _triggerAlert() async {
    _alerting = true;
    _nextAlertAtSeconds = _elapsed.inSeconds + _repeatSeconds;

    if (!_muted) {
      unawaited(_startAlertSound());
      HapticFeedback.heavyImpact();
    }

    // null = Still Down, true = Resolved, false = Mute
    final result = await showDialog<bool?>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: Text('${widget.equipment.name} still down?'),
        content: Text(
          'This event has been open for ${_formatHms(_elapsed)}.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(null),
            child: const Text('Still Down', style: TextStyle(fontSize: 18)),
          ),
          if (!_muted)
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: const Text('Mute', style: TextStyle(fontSize: 18)),
            ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AstemoColors.ok,
              foregroundColor: AstemoColors.black,
            ),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Resolved', style: TextStyle(fontSize: 18)),
          ),
        ],
      ),
    );

    await _stopAlertSound();
    _alerting = false;

    if (result == true) {
      _goToReason();
    } else if (result == false) {
      _muted = true;
      _nextAlertAtSeconds = _elapsed.inSeconds + _repeatSeconds;
    } else {
      _nextAlertAtSeconds = _elapsed.inSeconds + _repeatSeconds;
    }
  }

  Future<void> _startAlertSound() async {
    try {
      await _player.setReleaseMode(ReleaseMode.loop);
      await _player.play(AssetSource('sounds/alert.wav'));
    } catch (_) {
      // Audio is best-effort; the visual alert is the source of truth.
    }
  }

  Future<void> _stopAlertSound() async {
    try {
      await _player.stop();
    } catch (_) {}
  }

  void _goToReason() {
    // Use push (not pushReplacement): replacing this route completes the
    // caller's awaited push() immediately, before the event is resolved,
    // causing the home screen to refresh its "last entry" card too early.
    // Keeping this route on the stack lets ReasonScreen's popUntil(isFirst)
    // complete that await only after resolveEvent() has actually run.
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ReasonScreen(event: widget.event, equipment: widget.equipment),
      ),
    );
  }

  Future<void> _confirmCancel() async {
    final discard = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Are you sure?'),
        content: const Text('This will discard the event.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Back', style: TextStyle(fontSize: 18)),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AstemoColors.error),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Discard', style: TextStyle(fontSize: 18)),
          ),
        ],
      ),
    );
    if (discard == true) {
      await ServiceProvider.of(context).repository.discardEvent(widget.event.id);
      if (mounted) Navigator.of(context).pop();
    }
  }

  String _formatHms(Duration d) {
    final h = d.inHours.toString().padLeft(2, '0');
    final m = (d.inMinutes % 60).toString().padLeft(2, '0');
    final s = (d.inSeconds % 60).toString().padLeft(2, '0');
    return '$h:$m:$s';
  }

  @override
  void dispose() {
    _ticker?.cancel();
    _player.dispose();
    WakelockPlus.disable();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false, // Force use of RESOLVED / Cancel, not the system back.
      child: Scaffold(
        appBar: AppBar(
          title: Text(widget.equipment.name),
          automaticallyImplyLeading: false,
          actions: const [AstemoAppBarLogo()],
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('DOWN', style: TextStyle(fontSize: 20, color: AstemoColors.red, letterSpacing: 4, fontWeight: FontWeight.w700)),
              const SizedBox(height: 16),
              Text(
                _formatHms(_elapsed),
                style: const TextStyle(
                  fontSize: 72,
                  fontWeight: FontWeight.bold,
                  fontFeatures: [FontFeature.tabularFigures()],
                ),
              ),
              const SizedBox(height: 56),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AstemoColors.ok,
                  foregroundColor: AstemoColors.black,
                  minimumSize: const Size(280, 96),
                ),
                onPressed: _goToReason,
                child: const Text('RESOLVED'),
              ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: _confirmCancel,
                child: const Text('Cancel', style: TextStyle(fontSize: 18)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
