# insight-line

Mod for Claude Code. Adds one section to the system prompt so that every substantive reply ends with a line headed "תובנה": one Hebrew sentence that distills the conversation into its central insight, not the wording of the question. Short and clear without context. Left out for a single short question and answer, brief acknowledgments, notification replies and subagent work.

## Install

Loads by itself in any Claude Code session opened on this repository (project `.claude/skills/insight-line`). Anywhere else:

```
/plugin install insight-line --marketplace anat1969/neo-gallery-spark
```
