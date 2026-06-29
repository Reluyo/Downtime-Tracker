import 'package:flutter/material.dart';

import '../theme.dart';

/// Astemo corporate wordmark for the dark theme: white "Astemo", an Astemo Red
/// rule, and the "Mobility Beyond" tagline. Shown top-right on every screen.
class AstemoLogo extends StatelessWidget {
  const AstemoLogo({super.key, this.compact = false});

  /// Smaller variant sized to sit inside an [AppBar].
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Text(
          'Astemo',
          style: TextStyle(
            color: AstemoColors.white,
            fontWeight: FontWeight.w700,
            fontSize: compact ? 18 : 22,
            letterSpacing: 0.5,
            height: 1,
          ),
        ),
        Container(
          height: 2,
          width: compact ? 56 : 70,
          margin: const EdgeInsets.symmetric(vertical: 3),
          decoration: BoxDecoration(
            color: AstemoColors.red,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        Text(
          'MOBILITY BEYOND',
          style: TextStyle(
            color: AstemoColors.textMuted,
            fontWeight: FontWeight.w600,
            fontSize: compact ? 7 : 8.5,
            letterSpacing: 2,
            height: 1,
          ),
        ),
      ],
    );
  }
}

/// The logo wrapped for use in an [AppBar]'s `actions` (top-right corner).
class AstemoAppBarLogo extends StatelessWidget {
  const AstemoAppBarLogo({super.key});

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.only(left: 8, right: 16),
      child: Center(child: AstemoLogo(compact: true)),
    );
  }
}
