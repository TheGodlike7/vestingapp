import { THEME_DETAILS } from './themeModes'
import { useTheme } from './useTheme'

export function ThemeToggle() {
  const { nextTheme, toggleTheme } = useTheme()
  const nextThemeDetails = THEME_DETAILS[nextTheme]
  const themeColor = `hsl(${nextThemeDetails.hsl})`

  return (
    <button
      onClick={toggleTheme}
      className="flex min-h-10 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-300"
      style={{
        borderColor: `hsl(${nextThemeDetails.hsl} / 0.42)`,
        background: `hsl(${nextThemeDetails.hsl} / 0.09)`,
        color: themeColor,
        boxShadow: `0 0 22px hsl(${nextThemeDetails.hsl} / 0.16)`,
      }}
      title={`Switch to ${nextThemeDetails.label}`}
      aria-label={`Switch to ${nextThemeDetails.label}`}
      type="button"
    >
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{
          background: themeColor,
          boxShadow: `0 0 10px hsl(${nextThemeDetails.hsl} / 0.8)`,
        }}
      />
      <span className="whitespace-nowrap">{nextThemeDetails.label}</span>
    </button>
  )
}
