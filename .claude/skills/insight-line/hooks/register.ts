import type { Register } from 'claude-code'

const INSIGHT = `# Insight line

End every substantive reply to the person with a closing line under the heading "תובנה": one sentence in Hebrew that distills the whole conversation so far into its central insight.

- The sentence states what was learned or decided, not what was asked. Not "שאלת איך..." but the insight itself.
- Short (up to about 20 words), plain, and understandable to someone who did not see the conversation.
- It covers the conversation as a whole, so it may change from one reply to the next as the picture sharpens.
- Format it as a bold heading line "**תובנה**" followed by the sentence on the next line, as the very last thing in the reply.

Leave it out when:
- the conversation is a single short question with a short direct answer;
- the reply is a brief acknowledgment, a status note, a clarifying question, or a reply to an automated notification;
- you are working as a subagent or writing for a tool, a file, a commit or a PR rather than replying to the person.`

export const register: Register = on => {
  on('prompt.compose', async ($, e, next) => {
    const { sections } = await next(e)
    if (e.traits.includes('teammate') || e.traits.includes('bare')) return { sections }

    return { sections: [...sections, { id: 'insight-line:rule', text: INSIGHT, scope: 'session' as const }] }
  })
}
