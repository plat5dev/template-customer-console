// System, light, or dark. index.html applies the stored choice before first paint.
export type Theme = "system" | "light" | "dark"

const KEY = "theme"

export function loadTheme(): Theme {
  try {
    const t = localStorage.getItem(KEY)
    return t === "light" || t === "dark" ? t : "system"
  } catch {
    return "system"
  }
}

export function applyTheme(theme: Theme) {
  if (theme === "system") document.documentElement.removeAttribute("data-theme")
  else document.documentElement.dataset.theme = theme
  try {
    if (theme === "system") localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, theme)
  } catch {
    // Storage blocked: the choice lasts for this page.
  }
}
