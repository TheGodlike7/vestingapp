export type Theme = 'purple' | 'green' | 'crimson' | 'solar' | 'prism'

export const THEME_SEQUENCE: Theme[] = ['purple', 'green', 'crimson', 'solar', 'prism']

export const THEME_DETAILS: Record<Theme, { label: string; hsl: string }> = {
  purple: { label: 'Purple Mode', hsl: '271 100% 64%' },
  green: { label: 'Green Mode', hsl: '157 87% 51%' },
  crimson: { label: 'Crimson Mode', hsl: '339 100% 50%' },
  solar: { label: 'Solar Mode', hsl: '56 100% 50%' },
  prism: { label: 'Prism Mode', hsl: '291 100% 64%' },
}

export function isTheme(value: string | null): value is Theme {
  return THEME_SEQUENCE.includes(value as Theme)
}

export function getNextTheme(theme: Theme) {
  const currentIndex = THEME_SEQUENCE.indexOf(theme)
  return THEME_SEQUENCE[(currentIndex + 1) % THEME_SEQUENCE.length]
}
