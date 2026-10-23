import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Limit, Meters } from '../types'

const meters = atom({ plugin: 'usage-band', key: 'meters' } as const, null)

const LABELS: Record<string, string> = {
  five_hour: 'שעתי (5 ש׳)',
  seven_day: 'שבועי',
  spend_limit: 'תקציב',
}

const WARN_AT = 80

const tokens = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}K` : `${n}`)

const resetTime = (iso?: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return ` עד ${hh}:${mm}`
}

const limitText = (l: Limit) =>
  `${LABELS[l.kind] ?? l.kind} ${l.percentUsed}%${resetTime(l.resetsAt)}`

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    const { context, rateLimits } = await $.session.usage()
    const m: Meters = { context: { tokens: context.tokens, window: context.window, percent: context.percent }, rateLimits }
    await update($, meters, () => m)
    return result
  })

  on('session.measure', async ($, e, next) => {
    const { tokens, window, percent } = e.context
    const m: Meters = { context: { tokens, window, percent }, rateLimits: e.rateLimits }
    await update($, meters, () => m)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const m = await read($, meters)
    if (e.props.hasSurvey || m === null) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const { context } = m
    const contextText =
      context.percent === undefined
        ? `הקשר –/${tokens(context.window)}`
        : `הקשר ${context.percent}% (${tokens(context.tokens ?? 0)}/${tokens(context.window)})`
    const parts = [
      ...m.rateLimits.map(l => ({ text: limitText(l), percent: l.percentUsed })),
      { text: contextText, percent: context.percent ?? 0 },
    ]

    return (
      <Box>
        {parts.flatMap((p, i) => [
          ...(i > 0 ? [<Text key={`sep${i}`} dimColor>{'  |  '}</Text>] : []),
          p.percent >= WARN_AT ? (
            <Text key={`m${i}`} color="warning" bold>
              {p.text}
            </Text>
          ) : (
            <Text key={`m${i}`} dimColor>
              {p.text}
            </Text>
          ),
        ])}
      </Box>
    )
  })
}
