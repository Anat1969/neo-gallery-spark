import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, RenderSurface } from 'claude-code'

import type { Context, Limit, Meters } from '../types'

const meters = atom({ plugin: 'usage-band', key: 'meters' } as const, null)

const PANE = 'usage-band'

// The band above the prompt is drawn by the terminal; every other surface
// (the app, the browser) draws a pane, which it places above the prompt.
const isRemote = (s: RenderSurface) => s !== 'terminal'

const WARN_AT = 80
const DANGER_AT = 95

const HOUR = 3600 * 1000
const WINDOW_MS: Record<string, number> = { five_hour: 5 * HOUR, seven_day: 7 * 24 * HOUR }

// A balanced week spends a seventh of the weekly limit per day.
const DAILY_SHARE = 100 / 7

const LABELS: Record<string, string> = {
  five_hour: '5 שעות',
  seven_day: 'שבוע',
  spend_limit: 'תקציב',
}

const DAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']

const round1 = (n: number) => Math.round(n * 10) / 10

const dateKey = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

const resetText = (l: Limit) => {
  if (!l.resetsAt) return ''
  const d = new Date(l.resetsAt)
  if (Number.isNaN(d.getTime())) return ''
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return l.kind === 'seven_day' ? `, מתאפס ביום ${DAYS[d.getDay()]} ${time}` : `, מתאפס ב-${time}`
}

// How much of the window's time has passed, so used% can be read against it.
const elapsed = (l: Limit, now: number) => {
  const length = WINDOW_MS[l.kind]
  const resetsAt = l.resetsAt ? Date.parse(l.resetsAt) : NaN
  if (!length || Number.isNaN(resetsAt)) return undefined
  return Math.min(100, Math.max(0, Math.round((1 - (resetsAt - now) / length) * 100)))
}

type DayBase = { date: string; base: number }

// Today's share of the weekly limit: the weekly reading now, less the last
// reading before today (kept in $.store, so it holds across sessions).
const todayUsed = async ($: EngineInterface, rateLimits: Limit[]) => {
  const week = rateLimits.find(l => l.kind === 'seven_day')
  if (!week) return undefined

  const date = dateKey(await $.clock.now())
  const last = (await $.store.get('last')) as number | undefined
  let day = (await $.store.get('dayBase')) as DayBase | undefined

  if (day?.date !== date || week.percentUsed < day.base) {
    const base = typeof last === 'number' && last <= week.percentUsed && day?.date !== date ? last : week.percentUsed
    day = { date, base }
    await $.store.set('dayBase', day)
  }
  await $.store.set('last', week.percentUsed)

  return round1(week.percentUsed - day.base)
}

const measure = async ($: EngineInterface, context: Context, rateLimits: Limit[]) => {
  const { tokens, window, percent } = context
  const m: Meters = { context: { tokens, window, percent }, rateLimits, today: await todayUsed($, rateLimits) }
  await update($, meters, () => m)
}

type Part = { text: string; level: number }

const partsOf = (m: Meters, now: number): Part[] => {
  const order = (l: Limit) => (l.kind === 'seven_day' ? 0 : l.kind === 'five_hour' ? 1 : 2)
  const limits = [...m.rateLimits].sort((a, b) => order(a) - order(b))
  const parts: Part[] = []

  if (m.today !== undefined) {
    parts.push({ text: `יום: ${m.today}% מתוך ${round1(DAILY_SHARE)}% מותרים`, level: (m.today / DAILY_SHARE) * 100 })
  }

  for (const l of limits) {
    const time = elapsed(l, now)
    parts.push({
      text: `${LABELS[l.kind] ?? l.kind}: ${l.percentUsed}%${time === undefined ? '' : ` (עבר ${time}% מהזמן)`}${resetText(l)}`,
      level: l.percentUsed,
    })
  }

  const { context } = m
  parts.push({
    text:
      context.percent === undefined
        ? `זיכרון השיחה: –`
        : `זיכרון השיחה: ${context.percent}%`,
    level: context.percent ?? 0,
  })

  return parts
}

function openPane($: EngineInterface) {
  void $.ui.open({ id: PANE, title: 'מדדי שימוש' })
}

async function draw($: EngineInterface, e: Parameters<EngineInterface['ui']['resolve']>[0]) {
  const { Box, Text } = $.ui.resolve(e)
  const m = await read($, meters)
  if (m === null) return <Text dimColor>ממתין לקריאה הראשונה של המדדים</Text>

  const parts = partsOf(m, await $.clock.now())
  return (
    <Box>
      {parts.flatMap((p, i) => [
        ...(i > 0 ? [<Text key={`sep${i}`} dimColor>{'  |  '}</Text>] : []),
        p.level >= WARN_AT ? (
          <Text key={`m${i}`} color={p.level >= DANGER_AT ? 'error' : 'warning'} bold>
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
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await $.command.register({ name: 'meters', description: 'הצגת מדדי השימוש בחלונית' })
    if ((await $.session.surfaces()).some(isRemote)) openPane($)
    const { context, rateLimits } = await $.session.usage()
    await measure($, context, rateLimits)
    return result
  })

  on('session.attach', async ($, e, next) => {
    if (isRemote(e.surface)) openPane($)
    return next(e)
  })

  on('command.run', { command: 'meters' }, async $ => {
    openPane($)
    return { text: 'מדדי השימוש נפתחו בחלונית.' }
  })

  on('session.measure', async ($, e, next) => {
    await measure($, e.context, e.rateLimits)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || isRemote(e.surface) || (await read($, meters)) === null) return next(e)
    return draw($, e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => draw($, e))
}
