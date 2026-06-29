import 'package:flutter/material.dart';

import 'theme.dart';
import 'widgets/astemo_logo.dart';

/// Step 5 — "Other" note. Free-text up to 240 chars with a live counter.
/// Pops with the trimmed note string on SUBMIT, or null on Back.
class OtherNoteScreen extends StatefulWidget {
  const OtherNoteScreen({super.key});

  static const int maxChars = 240;

  @override
  State<OtherNoteScreen> createState() => _OtherNoteScreenState();
}

class _OtherNoteScreenState extends State<OtherNoteScreen> {
  final TextEditingController _controller = TextEditingController();

  @override
  void initState() {
    super.initState();
    _controller.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  bool get _canSubmit => _controller.text.trim().isNotEmpty;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Describe the reason'),
        actions: const [AstemoAppBarLogo()],
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(
              controller: _controller,
              autofocus: true,
              maxLength: OtherNoteScreen.maxChars,
              maxLines: 4,
              textCapitalization: TextCapitalization.sentences,
              style: const TextStyle(fontSize: 20),
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                hintText: 'What happened?',
                // The default counter shows e.g. "23/240".
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AstemoColors.ok,
                foregroundColor: AstemoColors.black,
                minimumSize: const Size.fromHeight(80),
              ),
              onPressed: _canSubmit
                  ? () => Navigator.of(context).pop(_controller.text.trim())
                  : null,
              child: const Text('SUBMIT'),
            ),
            const SizedBox(height: 12),
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Back', style: TextStyle(fontSize: 18)),
            ),
          ],
        ),
      ),
    );
  }
}
