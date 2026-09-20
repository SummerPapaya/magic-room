import { createRoot } from 'react-dom/client'
import App from './App'
import { initialLang } from './i18n'
import './style.css'

/* Resolved before the first render so the room never paints Chinese chrome for
   an English visitor (and vice versa). index.html starts the country lookup
   while this bundle is still downloading, so the wait is almost always zero. */
initialLang().then(lang => createRoot(document.getElementById('root')!).render(<App initialLang={lang} />))
