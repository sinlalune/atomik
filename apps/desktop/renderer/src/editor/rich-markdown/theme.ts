import type { RichTheme } from './contracts'

/**
 * Which app themes are dark.
 *
 * The truth lives in `styles.css`, where every `[data-theme]` block declares
 * its own `color-scheme`. This set is the JavaScript mirror of that, needed
 * only where the engine cannot be asked — chiefly the tests, which run on
 * linkedom and have no `getComputedStyle` at all.
 *
 * It exists as ONE constant because it previously existed as several. Owner
 * bench, 2026-08-17: `hydration.ts` listed three dark themes, `EditorPane`
 * counted only `dark`, and the stylesheet declared five. Code in `ember` and
 * `hearth` rendered dark-on-dark because two of those three answers were
 * wrong. `dark-themes-match-stylesheet` pins this set against the stylesheet
 * so a new theme cannot reintroduce the drift.
 */
export const DARK_THEME_NAMES: ReadonlySet<string> = new Set([
  'dark',
  'moss',
  'biolum',
  'ember',
  'hearth'
])

export function isDarkThemeName(name: string): boolean {
  return DARK_THEME_NAMES.has(name)
}

/**
 * The rich renderers' view of the current theme.
 *
 * Prefers the engine's computed `color-scheme` — the stylesheet is the source
 * of truth, so a theme added there needs no change here — and falls back to
 * the mirrored set when no engine is available.
 */
export function richThemeFor(doc: Document): RichTheme {
  const name = doc.documentElement.dataset['theme'] ?? 'system'
  const view = doc.defaultView
  const declared = view
    ?.getComputedStyle?.(doc.documentElement)
    .colorScheme?.trim()
    .toLowerCase()
  const systemDark =
    view?.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false

  // A theme that forces its scheme answers on its own. `light dark` means it
  // forced nothing, so the named theme — then the OS — decides.
  const scheme: RichTheme['scheme'] =
    declared === 'dark'
      ? 'dark'
      : declared === 'light'
        ? 'light'
        : isDarkThemeName(name)
          ? 'dark'
          : systemDark
            ? 'dark'
            : 'light'

  return { name, scheme }
}
