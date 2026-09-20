import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDownToLine, ArrowLeft, ArrowUpRight, AudioLines, BookOpen, Cat, Check, ChevronRight, Cloud, CloudRain, Expand, Eye, Flower2, LampDesk, Maximize2, Minus, Moon, Move, Pause, Plus, RotateCcw, Rotate3D, Snowflake, Sparkles, WandSparkles, Music2, Sun, Volume2, VolumeX, X } from 'lucide-react'
import { createScene } from './scene'
import type { SceneAPI, Settings, View, Weather } from './scene'
import { RoomSound, ambientDescription } from './sound'
import type { CatState } from './cat'
import type { WandSpell } from './wandMagic'
import { SEASONS, environmentState, formatHour, weatherForSeason } from './environment'
import type { Season } from './environment'
import { COPY, rememberLang } from './i18n'
import type { Lang } from './i18n'

/* The four camera stops, in dock and number-key order. Only their labels are
   translated, so the id list can live outside the component. */
const VIEW_IDS: View[] = ['overview', 'desk', 'window', 'qin']

function ArchMark() { return <svg width="31" height="35" viewBox="0 0 31 35" fill="none" aria-hidden="true"><path d="M3 31V15a12.5 12.5 0 0 1 25 0v16M1 32h29M15.5 3v25M4 16h23M7 26l8.5 3 8.5-3M7 26v-5l8.5 3 8.5-3v5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg> }
export default function App({ initialLang = 'zh' }: { initialLang?: Lang }) {
  const host = useRef<HTMLDivElement>(null), api = useRef<SceneAPI | null>(null), sound = useRef<RoomSound | null>(null), dialog = useRef<HTMLDialogElement>(null), feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [settings, setSettings] = useState<Settings>(() => ({ season: 'summer', weather: 'sun', hour: 17, lamp: false, magic: true, rotating: false, reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches }))
  const [wandSpell, setWandSpell] = useState<WandSpell | null>(null)
  const [catState, setCatState] = useState<CatState>('sleeping')
  const catStateRef = useRef<CatState>('sleeping')
  const initial = useRef(settings)
  const [lang, setLang] = useState<Lang>(initialLang)
  const copy = COPY[lang]
  /* The scene is built once and handed a callback: reading the copy through a
     ref keeps the callback's identity stable, so switching language mid-visit
     re-labels the chrome without tearing down and rebuilding the room. */
  const copyRef = useRef(copy); copyRef.current = copy
  /* Everything below is derived from `copy`, so a language switch is just a
     re-render: no scene rebuild, no settings reset. */
  const weatherOptions = [{ id: 'sun' as const, Icon: Sun }, { id: 'cloud' as const, Icon: Cloud }, { id: 'rain' as const, Icon: CloudRain }, { id: 'snow' as const, Icon: Snowflake }]
  const views: { id: View; text: string; Icon: typeof Eye }[] = [{ id: 'overview', text: copy.dock.overview, Icon: Maximize2 }, { id: 'desk', text: copy.dock.desk, Icon: BookOpen }, { id: 'window', text: copy.dock.window, Icon: Eye }, { id: 'qin', text: copy.dock.qin, Icon: Music2 }]
  const pages = copy.pages
  const [ready, setReady] = useState(false), [error, setError] = useState(''), [view, setView] = useState<View>('overview'), [muted, setMuted] = useState(true), [immersed, setImmersed] = useState(false), [modal, setModal] = useState<'reference' | 'book' | null>(null), [page, setPage] = useState(0), [toast, setToast] = useState(''), [saved, setSaved] = useState(false)
  const feedback = useCallback((message: string) => { setToast(message); if (feedbackTimer.current) clearTimeout(feedbackTimer.current); feedbackTimer.current = setTimeout(() => setToast(''), 3600) }, [])
  const action = useCallback((which: string) => {
    const words = copyRef.current
    if (which.startsWith('cat:')) {
      const next = which.slice(4) as CatState
      if (catStateRef.current === 'sleeping' && next === 'sitting') feedback(words.cat.wokeNote)
      catStateRef.current = next; setCatState(next)
    }
    if (which === 'lamp') setSettings(s => ({ ...s, lamp: !s.lamp }))
    if (which === 'book') setModal('book')
    if (which === 'wand:rest') { setWandSpell(null); feedback(words.wand.restNote) }
    else if (which.startsWith('wand:')) { const spell = which.slice(5) as WandSpell; setWandSpell(spell); setSettings(s => ({ ...s, magic: true })); feedback(words.wand.castNote(words.wand.spells[spell])) }
    if (which === 'qin') { void sound.current?.playQin().catch(() => feedback(words.notes.qinFailed)); feedback(words.notes.qin) }
    if (which === 'meow') void sound.current?.playMeow().catch(() => feedback(words.notes.meowFailed))
    if (which === 'magic-book' || which === 'magic-orb') feedback(words.notes.touch)
    if (which === 'context-lost') setError(words.errorLost)
  }, [feedback])
  useEffect(() => {
    if (!host.current) return
    const words = copyRef.current
    try { api.current = createScene(host.current, initial.current, action, () => setReady(true)); sound.current = new RoomSound() }
    catch (e) { console.error('Room initialization failed', e); queueMicrotask(() => setError(words.errorWebgl)) }
    return () => { api.current?.dispose(); sound.current?.dispose(); if (feedbackTimer.current) clearTimeout(feedbackTimer.current) }
  }, [action])
  useEffect(() => { api.current?.update(settings); sound.current?.update(settings.weather, settings.hour, settings.season) }, [settings])
  useEffect(() => { if (modal) dialog.current?.showModal(); else dialog.current?.close() }, [modal])
  /* Language: the document, the scene's accessible name and the saved choice
     all follow the switch; the toast is dropped since it was written in the
     language the visitor just left. */
  useEffect(() => {
    document.documentElement.lang = copy.htmlLang
    document.title = copy.title
    rememberLang(lang)
    host.current?.querySelector('canvas')?.setAttribute('aria-label', copy.canvasAria)
  }, [lang, ready, copy])
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => setSettings(s => ({ ...s, reduced: media.matches, rotating: media.matches ? false : s.rotating }))
    media.addEventListener('change', change); return () => media.removeEventListener('change', change)
  }, [])
  const selectView = useCallback((next: View) => { setView(next); setSettings(s => ({ ...s, rotating: false })); api.current?.view(next) }, [])
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement || e.repeat || e.metaKey || e.ctrlKey || e.altKey || dialog.current?.open) return
      if (e.key === 'Escape') setImmersed(false)
      if (e.key.toLowerCase() === 'r') selectView('overview')
      if (e.key.toLowerCase() === 'l') setSettings(s => ({ ...s, lamp: !s.lamp }))
      if (e.key === '+' || e.key === '=') api.current?.zoom(1)
      if (e.key === '-') api.current?.zoom(-1)
      if (e.key.toLowerCase() === 'm') setSettings(s => ({ ...s, magic: !s.magic }))
      if (e.key.toLowerCase() === 'q') api.current?.pluck()
      if (e.key.toLowerCase() === 'w') api.current?.toggleWand()
      if (e.key.toLowerCase() === 'c') api.current?.toggleCat()
      if (['1', '2', '3', '4'].includes(e.key)) selectView(VIEW_IDS[Number(e.key) - 1])
    }
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key)
  }, [selectView])
  const switchLang = () => { setToast(''); setLang(current => (current === 'zh' ? 'en' : 'zh')) }
  const chooseWeather = (weather: Weather) => { if (weather === 'snow' && settings.season !== 'winter') return; setSettings(s => ({ ...s, weather })); feedback(copy.weather[weather].note) }
  const toggleSound = async () => { try { await sound.current?.toggle(muted, settings.weather, settings.hour, settings.season); setMuted(!muted); if (muted) feedback(copy.sound.onNote) } catch { feedback(copy.sound.failed) } }
  const environment = environmentState(settings.hour, settings.season, settings.weather)
  const timeName = environment.night > .7 ? copy.light.timeNames.night : settings.hour < environment.sunrise + 2 ? copy.light.timeNames.morning : settings.hour >= environment.sunset - 1.5 ? copy.light.timeNames.dusk : copy.light.timeNames.day
  const chooseSeason = (season: Season) => { setSettings(s => ({ ...s, season, weather: weatherForSeason(s.weather, season) })); feedback(copy.seasons[season].note) }
  return <main className={`atelier ${immersed ? 'is-immersed' : ''}`} data-night={environment.night > .55} data-weather={settings.weather} data-view={view} data-season={settings.season} data-wand-spell={wandSpell ?? 'rest'} data-cat-state={catState} data-lang={lang}>
    <div className="atelier-grain" aria-hidden="true"/>
    <header className="atelier-header chrome">
      <a className="atelier-brand" href="#top" aria-label={copy.brand.home}><ArchMark/><span>{copy.brand.name}<small>{copy.brand.sub}</small></span></a>
      <div className="atelier-header-right"><button className="text-button lang-toggle" onClick={switchLang} title={copy.langTitle} aria-label={copy.langTitle}>{copy.langLabel}</button><button className="text-button" onClick={() => setModal('reference')}>{copy.reference} <ArrowUpRight size={14}/></button><button className="icon-button" aria-label={copy.save.title} title={copy.save.title} disabled={!ready} onClick={() => { api.current?.screenshot(`${copy.fileStem}-${settings.season}-${settings.weather}-${settings.hour}${copy.fileHour}`); setSaved(true); feedback(copy.save.done); window.setTimeout(() => setSaved(false), 2400) }}>{saved ? <Check size={18}/> : <ArrowDownToLine size={18}/>}</button></div>
    </header>
    <section className="atelier-intro chrome" aria-label={copy.intro.aria}><div className="eyebrow"><span/> {copy.intro.eyebrow}</div><h1>{copy.intro.titleTop}<br/>{copy.intro.titleBottom}{copy.intro.titleLast && <><br/>{copy.intro.titleLast}</>}<span>{copy.intro.stop}</span></h1><p>{copy.intro.lead}</p><div className="intro-rule"/><span className="intro-caption">{copy.intro.captionLeft} <i>·</i> {copy.intro.captionRight}</span></section>
    <div ref={host} className="atelier-viewport" aria-busy={!ready}/>
    {!ready && !error && <div className="atelier-loading"><ArchMark/><span>{copy.loading}</span><i/></div>}
    {error && <div className="atelier-error" role="alert"><p>{error}</p><button onClick={() => location.reload()}>{copy.reopen}</button></div>}
    <aside className="atmosphere-panel chrome" aria-label={copy.panel.aria}>
      <div className="panel-heading"><div><span className="eyebrow">{copy.panel.eyebrow}</span><h2>{copy.panel.heading}</h2></div><Flower2 size={23} strokeWidth={1}/></div>
      <div className="panel-section-label">{copy.weather.heading}<span>WEATHER</span></div>
      <div className="weather-options" role="group" aria-label={copy.weather.aria}>{weatherOptions.map(({ id, Icon }) => <button key={id} aria-pressed={settings.weather === id} disabled={id === 'snow' && settings.season !== 'winter'} title={id === 'snow' && settings.season !== 'winter' ? copy.weather.snowWarm : copy.weather[id].title} onClick={() => chooseWeather(id)}><Icon size={22} strokeWidth={1.35}/><span>{copy.weather[id].title}</span>{id === 'snow' && settings.season !== 'winter' ? <small aria-hidden="true">{copy.weather.snowOnly}</small> : <i/>}</button>)}</div>
      <div className="season-section">
        <div className="panel-section-label">{copy.seasons.heading}<span>SEASONS</span></div>
        <div className="season-options" role="group" aria-label={copy.seasons.aria}>{(Object.keys(SEASONS) as Season[]).map(season => <button key={season} data-season={season} aria-pressed={settings.season === season} onClick={() => chooseSeason(season)}><i/>{copy.seasons[season].label}</button>)}</div>
      </div>
      <div className="panel-line"/>
      <div className="panel-section-label time-label">{copy.light.heading}<span>{timeName} <b>{formatHour(settings.hour)}</b></span></div>
      <div className="time-range"><Sun size={15} strokeWidth={1.3}/><input aria-label={copy.light.rangeAria} type="range" min="6" max="22" step="0.25" value={settings.hour} style={{ '--range-progress': `${(settings.hour - 6) / 16 * 100}%` } as React.CSSProperties} onChange={e => setSettings(s => ({ ...s, hour: Number(e.target.value) }))}/><Moon size={14} strokeWidth={1.3}/></div>
      <div className="time-presets">{[{ hour: environment.sunrise + 1, text: copy.light.presets.morning }, { hour: 12, text: copy.light.presets.noon }, { hour: environment.sunset, text: copy.light.presets.sunset }, { hour: 22, text: copy.light.presets.night }].map(t => <button key={t.hour} aria-pressed={settings.hour === t.hour} onClick={() => setSettings(s => ({ ...s, hour: t.hour }))}>{t.text}</button>)}</div>
      <div className="sunset-note"><span>{copy.light.sunrise} {formatHour(environment.sunrise)}</span><button onClick={() => setSettings(s => ({ ...s, hour: environment.sunset }))}>{copy.light.sunset} {formatHour(environment.sunset)} · {copy.light.sunsetNote}</button></div>
      <div className="panel-line lower-line"/>
      <button className="lamp-toggle" aria-pressed={settings.lamp} onClick={() => { setSettings(s => ({ ...s, lamp: !s.lamp })); feedback(settings.lamp ? copy.panel.lampOff : copy.panel.lampOn) }}><LampDesk size={18} strokeWidth={1.4}/><span>{copy.panel.lamp}</span><i className="toggle-track"><b/></i></button>
      <div className="magic-controls"><button className="lamp-toggle" aria-pressed={settings.magic} title={copy.panel.magicTitle} onClick={() => setSettings(s => ({ ...s, magic: !s.magic }))}><Sparkles size={17} strokeWidth={1.4}/><span>{copy.panel.magic}</span><i className="toggle-track"><b/></i></button><button className="pluck-button" title={copy.panel.pluckTitle} onClick={() => api.current?.pluck()}><Music2 size={14}/>{copy.panel.pluck}</button></div>
      <button className="wand-control" aria-label={wandSpell ? copy.wand.rest : copy.wand.cast} aria-pressed={!!wandSpell} title={copy.wand.title} onClick={() => api.current?.toggleWand()}><WandSparkles size={16}/><span>{wandSpell ? copy.wand.rest : copy.wand.cast}</span><small>{wandSpell ? copy.wand.spells[wandSpell] : copy.wand.random}</small></button>
      <p className="panel-footnote"><span/> {copy.panel.footnote}</p>
    </aside>
    <div className="scene-note chrome"><span className="scene-note-number">01 — 04</span><p>{copy.sceneNote}</p><span className="scene-note-line"/></div>
    <button className="cat-companion chrome" aria-label={catState === 'sleeping' ? copy.cat.wake : copy.cat.rest} title={copy.cat.title} onClick={() => api.current?.toggleCat()}><Cat size={19} strokeWidth={1.4}/><span>{catState === 'sleeping' ? copy.cat.napping : catState === 'walking' ? copy.cat.walking : copy.cat.watching}<small>{catState === 'sleeping' ? copy.cat.nappingNote : copy.cat.awakeNote}</small></span></button>
    <div className="scene-tools"><button className="icon-button" onClick={() => api.current?.zoom(1)} title={copy.tools.zoomInTitle} aria-label={copy.tools.zoomIn}><Plus size={18}/></button><button className="icon-button" onClick={() => api.current?.zoom(-1)} title={copy.tools.zoomOutTitle} aria-label={copy.tools.zoomOut}><Minus size={18}/></button><span/><button className="icon-button" onClick={() => selectView('overview')} title={copy.tools.resetTitle} aria-label={copy.tools.reset}><RotateCcw size={16}/></button></div>
    <div className={`atelier-toast ${toast ? 'visible' : ''}`} role="status"><Flower2 size={15}/>{toast}</div>
    <footer className="atelier-footer">
      <div className="ambient-control chrome"><button className={`sound-button ${!muted ? 'playing' : ''}`} onClick={() => void toggleSound()} aria-label={muted ? copy.sound.onAria : copy.sound.offAria} aria-pressed={!muted}>{muted ? <VolumeX size={18} strokeWidth={1.4}/> : <Volume2 size={18} strokeWidth={1.4}/>}</button><div><span>{muted ? copy.sound.quiet : ambientDescription(settings.weather, settings.hour, settings.season, lang)}</span><small>{muted ? copy.sound.quietNote : <><AudioLines size={12}/> {copy.sound.listening}</>}</small></div></div>
      <nav className="view-dock chrome" aria-label={copy.dock.aria}>{views.map(({ id, text, Icon }) => <button key={id} aria-pressed={view === id} onClick={() => selectView(id)}><Icon size={15} strokeWidth={1.5}/><span>{text}</span></button>)}<span className="dock-divider"/><button className="orbit-button" title={copy.dock.orbit} aria-label={copy.dock.orbit} aria-pressed={settings.rotating} disabled={settings.reduced} onClick={() => setSettings(s => ({ ...s, rotating: !s.rotating }))}>{settings.rotating ? <Pause size={15}/> : <Rotate3D size={17} strokeWidth={1.5}/>}</button></nav>
      <button className="immerse-button" onClick={() => setImmersed(!immersed)} aria-pressed={immersed}>{immersed ? <ArrowLeft size={15}/> : <Expand size={15}/>}<span>{immersed ? copy.immerse.exit : copy.immerse.enter}</span></button>
    </footer>
    <div className="interaction-hint chrome"><Move size={12}/><span>{copy.hints.rotate}</span><i>·</i><span>{copy.hints.zoom}</span><i>·</i><span>{copy.hints.pan}</span><i>·</i><span>{copy.hints.wand}</span></div>
    <dialog ref={dialog} className={`atelier-dialog ${modal === 'book' ? 'book-dialog' : ''}`} onCancel={() => setModal(null)} onClose={() => setModal(null)} onClick={e => { if (e.target === dialog.current) setModal(null) }} aria-label={modal === 'reference' ? copy.dialog.referenceAria : copy.dialog.bookAria}>
      <button className="dialog-close icon-button" aria-label={copy.dialog.close} onClick={() => setModal(null)}><X size={20}/></button>
      {modal === 'reference' ? <><img src="assets/rooms/daxia.jpg" alt={copy.dialog.referenceAlt}/><div className="reference-caption"><span>{copy.dialog.referenceCaption}</span><p>{copy.dialog.referenceNote}</p></div></> : <div className="reading-page"><BookOpen size={28} strokeWidth={1}/><span className="eyebrow">{copy.dialog.eyebrow}</span><h2>{pages[page][0]}</h2><p>{pages[page][1]}</p><button onClick={() => setPage(p => (p + 1) % pages.length)}>{copy.dialog.readMore} <ChevronRight size={14}/></button><span className="page-number">— {String(page + 1).padStart(2, '0')} —</span></div>}
    </dialog>
  </main>
}
