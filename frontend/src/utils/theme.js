const apply = m => { const dark = m === 'dark' || (m === 'system' && matchMedia('(prefers-color-scheme: dark)').matches); document.documentElement.dataset.theme = dark ? 'dark' : 'light' }
export const getTheme = () => localStorage.getItem('theme') || 'system'
export const setTheme = m => { localStorage.setItem('theme', m); apply(m) }
export const initTheme = () => apply(getTheme())
export const toggleTheme = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark')
