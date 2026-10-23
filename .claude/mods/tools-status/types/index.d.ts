export type FamilyStatus = {
  family: string
  status: 'done' | 'in progress' | 'broken' | 'not started'
  planned: number
  plannedDone: number
  registered: number
  readmes: number
  failing: string[]
}

declare module 'claude-code' {
  interface PluginState {
    'tools-status': { families: FamilyStatus[] }
  }
}
