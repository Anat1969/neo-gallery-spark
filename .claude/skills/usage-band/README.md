# usage-band

Cosmetic mod for Claude Code. Shows the usage meters (5-hour limit, weekly limit, context window) in a fixed dim row above the prompt, so they are always visible. A meter at 80% or more turns to the warning color, in bold; at 95% or more it turns red. Figures come unchanged from the engine (`$.session.usage()` and the `session.measure` event, the same numbers the status line reads); only placement and display change.

Pacing: "today" is today's share of the weekly limit against a balanced day (100/7 = 14.3%); the week and the 5-hour window each show "time X%", the share of the window already elapsed. Spending at or under the time share is on pace. Today's baseline is the last weekly reading before today, kept in `$.store`.

## Install

Loads by itself in any Claude Code session opened on this repository (project `.claude/skills/usage-band`). Anywhere else:

```
/plugin install usage-band --marketplace anat1969/neo-gallery-spark
```

In the desktop app: + next to the prompt box, Plugins, Add marketplace `anat1969/neo-gallery-spark`, then Add plugin.
