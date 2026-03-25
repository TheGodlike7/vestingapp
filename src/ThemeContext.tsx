import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
 
type Theme = 'purple' | 'green'
 
const ThemeContext = createContext<{
  theme: Theme
  toggleTheme: () => void
}>({ theme: 'purple', toggleTheme: () => {} })
 
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('va-theme') as Theme) || 'purple'
  })
 
  useEffect(() => {
    localStorage.setItem('va-theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])
 
  const toggleTheme = () => setTheme(t => t === 'purple' ? 'green' : 'purple')
 
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
 
export const useTheme = () => useContext(ThemeContext)