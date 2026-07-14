/**
 * turndown-plugin-gfm ships no types (CP-MVP-006 S05). The plugin is a
 * turndown `use()` value — a Plugin, i.e. a function taking the service.
 * Only the members we call are declared.
 */
declare module 'turndown-plugin-gfm' {
  import type TurndownService from 'turndown'
  export const gfm: TurndownService.Plugin
  export const tables: TurndownService.Plugin
  export const strikethrough: TurndownService.Plugin
  export const taskListItems: TurndownService.Plugin
}
