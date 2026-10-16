"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useLanguage } from "@/contexts/LanguageContext"

export function ThemeToggle() {
  const [mounted, setMounted] = React.useState(false)
  const { resolvedTheme, setTheme } = useTheme()
  const { t } = useLanguage()

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button className="btn btn-glass" style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', width: '40px', height: '40px' }}>
        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }}></div>
      </button>
    )
  }

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="btn btn-glass"
      style={{
        padding: '0.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        width: '40px',
        height: '40px',
        color: 'var(--text-primary)'
      }}
      title={t('nav.toggleTheme')}
    >
      {resolvedTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  )
}
