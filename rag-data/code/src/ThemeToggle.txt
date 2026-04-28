import { useTheme } from './useTheme'
 
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
 
  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-300"
      style={{
        border: theme === 'purple'
          ? '1px solid hsl(157 87% 51% / 0.4)'
          : '1px solid hsl(271 100% 64% / 0.4)',
        background: theme === 'purple'
          ? 'hsl(157 87% 51% / 0.08)'
          : 'hsl(271 100% 64% / 0.08)',
        color: theme === 'purple'
          ? 'hsl(157 87% 51%)'
          : 'hsl(271 100% 64%)',
      }}
      title="Toggle theme"
    >
      {theme === 'purple' ? '🟢 Green Mode' : '🟣 Purple Mode'}
    </button>
  )
}