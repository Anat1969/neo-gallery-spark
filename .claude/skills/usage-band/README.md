# usage-band

Cosmetic mod for Claude Code. Shows the usage meters (5-hour limit, weekly limit, context window) in a fixed dim row above the prompt, so they are always visible. Figures come unchanged from the engine (`$.session.usage()` and the `session.measure` event, the same numbers the status line reads); only placement and display change.

## Install

Loads by itself in any Claude Code session opened on this repository (project `.claude/skills/usage-band`). Anywhere else:

```
/plugin install usage-band --marketplace anat1969/neo-gallery-spark
```

In the desktop app: + next to the prompt box, Plugins, Add marketplace `anat1969/neo-gallery-spark`, then Add plugin.
