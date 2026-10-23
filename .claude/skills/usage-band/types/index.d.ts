export type Limit = { kind: string; percentUsed: number; resetsAt?: string }
export type Context = { tokens?: number; window: number; percent?: number }
export type Meters = { context: Context; rateLimits: Limit[]; today?: number }

declare module 'claude-code' {
  interface PluginState {
    'usage-band': { meters: Meters | null }
  }
}
