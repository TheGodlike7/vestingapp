import { createContext, useState, useEffect, type ReactNode } from 'react'
import { getNextTheme, isTheme, type Theme } from './themeModes'

const ThemeContext = createContext<{
  theme: Theme
  nextTheme: Theme
  toggleTheme: () => void
}>({ theme: 'purple', nextTheme: 'green', toggleTheme: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const storedTheme = localStorage.getItem('va-theme')
    return isTheme(storedTheme) ? storedTheme : 'purple'
  })

  useEffect(() => {
    localStorage.setItem('va-theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const nextTheme = getNextTheme(theme)
  const toggleTheme = () => setTheme((currentTheme) => getNextTheme(currentTheme))

  return (
    <ThemeContext.Provider value={{ theme, nextTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export { ThemeContext }
