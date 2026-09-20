import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDownToLine, ArrowLeft, ArrowUpRight, AudioLines, BookOpen, Cat, Check, ChevronRight, Cloud, CloudRain, Expand, Eye, Flower2, LampDesk, Maximize2, Minus, Moon, Move, Pause, Plus, RotateCcw, Rotate3D, Snowflake, Sparkles, WandSparkles, Music2, Sun, Volume2, VolumeX, X } from 'lucide-react'
import { createScene } from './scene'
import type { SceneAPI, Settings, View, Weather } from './scene'
import { RoomSound, ambientDescription } from './sound'
import type { CatState } from './cat'
import { SPELL_LABELS } from './wandMagic'
import type { WandSpell } from './wandMagic'
import { SEASONS, environmentState, formatHour, weatherForSeason } from './environment'
import type { Season } from './environment'

const weatherOptions = [ { id: 'sun', title: '晴日', Icon: Sun, note: '阳光落在桌上，也落在每一页里。' }, { id: 'cloud', title: '薄云', Icon: Cloud, note: '云慢慢经过，房间的光也柔软下来。' }, { id: 'rain', title: '听雨', Icon: CloudRain, note: '雨落窗外，书页留在温暖里。' }, { id: 'snow', title: '初雪', Icon: Snowflake, note: '窗外开始下雪，给自己留一盏暖灯。' } ] as const
const views: { id: View; text: string; Icon: typeof Eye }[] = [{ id: 'overview', text: '房间全景', Icon: Maximize2 }, { id: 'desk', text: '坐近书桌', Icon: BookOpen }, { id: 'window', text: '望向窗外', Icon: Eye }, { id: 'qin', text: '抚琴一隅', Icon: Music2 }]
const pages = [ ['把日子，过成一间书房。', '窗外的云有它的去处，\n此刻的你，只需在这里。'], ['慢一点，也没有关系。', '花在自己的季节里开放，\n书在你翻开时，才开始旅行。'], ['给自己一小片安静。', '一盏灯，一杯茶，一本未读完的书。\n这便是今天，最好的片刻。'] ]
function ArchMark() { return <svg width="31" height="35" viewBox="0 0 31 35" fill="none" aria-hidden="true"><path d="M3 31V15a12.5 12.5 0 0 1 25 0v16M1 32h29M15.5 3v25M4 16h23M7 26l8.5 3 8.5-3M7 26v-5l8.5 3 8.5-3v5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg> }
export default function App() {
  const host = useRef<HTMLDivElement>(null), api = useRef<SceneAPI | null>(null), sound = useRef<RoomSound | null>(null), dialog = useRef<HTMLDialogElement>(null), feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [settings, setSettings] = useState<Settings>(() => ({ season: 'summer', weather: 'sun', hour: 17, lamp: false, magic: true, rotating: false, reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches }))
  const [wandSpell, setWandSpell] = useState<WandSpell | null>(null)
  const [catState, setCatState] = useState<CatState>('sleeping')
  const catStateRef = useRef<CatState>('sleeping')
  const initial = useRef(settings)
  const [ready, setReady] = useState(false), [error, setError] = useState(''), [view, setView] = useState<View>('overview'), [muted, setMuted] = useState(true), [immersed, setImmersed] = useState(false), [modal, setModal] = useState<'reference' | 'book' | null>(null), [page, setPage] = useState(0), [toast, setToast] = useState(''), [saved, setSaved] = useState(false)
  const feedback = useCallback((message: string) => { setToast(message); if (feedbackTimer.current) clearTimeout(feedbackTimer.current); feedbackTimer.current = setTimeout(() => setToast(''), 3600) }, [])
  const action = useCallback((which: string) => {
    if (which.startsWith('cat:')) {
      const next = which.slice(4) as CatState
      if (catStateRef.current === 'sleeping' && next === 'sitting') feedback('小猫醒啦。移动鼠标让它追视，点击地面让它走过去。')
      catStateRef.current = next; setCatState(next)
    }
    if (which === 'lamp') setSettings(s => ({ ...s, lamp: !s.lamp }))
    if (which === 'book') setModal('book')
    if (which === 'wand:rest') { setWandSpell(null); feedback('魔杖轻轻落回桌面。') }
    else if (which.startsWith('wand:')) { const spell = which.slice(5) as WandSpell; setWandSpell(spell); setSettings(s => ({ ...s, magic: true })); feedback(`${SPELL_LABELS[spell]}，再点魔杖便可收起。`) }
    if (which === 'qin') { void sound.current?.playQin().catch(() => feedback('琴音暂未开启，可以再拨一次弦。')); feedback('一弦清音，慢慢散去。') }
    if (which === 'meow') void sound.current?.playMeow().catch(() => feedback('小猫的声音暂未开启，可以再轻点一下。'))
    if (which === 'magic-book' || which === 'magic-orb') feedback('轻轻一碰，星光便有了回音。')
    if (which === 'context-lost') setError('画面暂时失去了连接，请重新打开这间书房。')
  }, [feedback])
  useEffect(() => {
    if (!host.current) return
    try { api.current = createScene(host.current, initial.current, action, () => setReady(true)); sound.current = new RoomSound() }
    catch (e) { console.error('Room initialization failed', e); queueMicrotask(() => setError('这间书房需要 WebGL 支持，请使用开启硬件加速的浏览器。')) }
    return () => { api.current?.dispose(); sound.current?.dispose(); if (feedbackTimer.current) clearTimeout(feedbackTimer.current) }
  }, [action])
  useEffect(() => { api.current?.update(settings); sound.current?.update(settings.weather, settings.hour, settings.season) }, [settings])
  useEffect(() => { if (modal) dialog.current?.showModal(); else dialog.current?.close() }, [modal])
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
      if (['1', '2', '3', '4'].includes(e.key)) selectView(views[Number(e.key) - 1].id)
    }
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key)
  }, [selectView])
  const chooseWeather = (weather: Weather) => { if (weather === 'snow' && settings.season !== 'winter') return; setSettings(s => ({ ...s, weather })); feedback(weatherOptions.find(w => w.id === weather)!.note) }
  const toggleSound = async () => { try { await sound.current?.toggle(muted, settings.weather, settings.hour, settings.season); setMuted(!muted); if (muted) feedback('打开声音，听听窗外的世界。') } catch { feedback('声音未能开启，请再试一次。') } }
  const environment = environmentState(settings.hour, settings.season, settings.weather)
  const timeName = environment.night > .7 ? '静夜' : settings.hour < environment.sunrise + 2 ? '晨光' : settings.hour >= environment.sunset - 1.5 ? '日暮' : '白昼'
  const chooseSeason = (season: Season) => { setSettings(s => ({ ...s, season, weather: weatherForSeason(s.weather, season) })); feedback(SEASONS[season].description) }
  return <main className={`atelier ${immersed ? 'is-immersed' : ''}`} data-night={environment.night > .55} data-weather={settings.weather} data-view={view} data-season={settings.season} data-wand-spell={wandSpell ?? 'rest'} data-cat-state={catState}>
    <div className="atelier-grain" aria-hidden="true"/>
    <header className="atelier-header chrome">
      <a className="atelier-brand" href="#top" aria-label="回到小屋顶部"><ArchMark/><span>魔法书屋<small>SUMMER'S MAGIC ROOM</small></span></a>
      <div className="atelier-header-right"><span className="edition"><span/> 空间实验 <b>02</b></span><span className="header-divider"/><button className="text-button" onClick={() => setModal('reference')}>灵感原图 <ArrowUpRight size={14}/></button><button className="icon-button" aria-label="保存场景图片" title="保存场景图片" disabled={!ready} onClick={() => { api.current?.screenshot(); setSaved(true); feedback('这一刻的光，已经为你保存。'); window.setTimeout(() => setSaved(false), 2400) }}>{saved ? <Check size={18}/> : <ArrowDownToLine size={18}/>}</button></div>
    </header>
    <section className="atelier-intro chrome" aria-label="房间介绍"><div className="eyebrow"><span/> DAXIA’S ATELIER</div><h1>花与书<br/>之间<span>。</span></h1><p>在窗边，安放一小片自己。</p><div className="intro-rule"/><span className="intro-caption">大夏的书房 <i>·</i> 花园阁楼</span></section>
    <div ref={host} className="atelier-viewport" aria-busy={!ready}/>
    {!ready && !error && <div className="atelier-loading"><ArchMark/><span>让光，慢慢进来</span><i/></div>}
    {error && <div className="atelier-error" role="alert"><p>{error}</p><button onClick={() => location.reload()}>重新打开</button></div>}
    <aside className="atmosphere-panel chrome" aria-label="天气和光线设置">
      <div className="panel-heading"><div><span className="eyebrow">MAKE YOUR MOMENT</span><h2>窗外，恰好</h2></div><Flower2 size={23} strokeWidth={1}/></div>
      <div className="panel-section-label">选一种天气<span>WEATHER</span></div>
      <div className="weather-options" role="group" aria-label="窗外天气">{weatherOptions.map(({ id, title, Icon }) => <button key={id} aria-pressed={settings.weather === id} disabled={id === 'snow' && settings.season !== 'winter'} title={id === 'snow' && settings.season !== 'winter' ? '初雪仅在冬雪季节可选' : title} onClick={() => chooseWeather(id)}><Icon size={22} strokeWidth={1.35}/><span>{title}</span>{id === 'snow' && settings.season !== 'winter' ? <small aria-hidden="true">仅冬季</small> : <i/>}</button>)}</div>
      <div className="season-section">
        <div className="panel-section-label">窗外四时<span>SEASONS</span></div>
        <div className="season-options" role="group" aria-label="窗外季节">{(Object.keys(SEASONS) as Season[]).map(season => <button key={season} data-season={season} aria-pressed={settings.season === season} onClick={() => chooseSeason(season)}><i/>{SEASONS[season].label}</button>)}</div>
      </div>
      <div className="panel-line"/>
      <div className="panel-section-label time-label">留一束光<span>{timeName} <b>{formatHour(settings.hour)}</b></span></div>
      <div className="time-range"><Sun size={15} strokeWidth={1.3}/><input aria-label="光照时刻" type="range" min="6" max="22" step="0.25" value={settings.hour} style={{ '--range-progress': `${(settings.hour - 6) / 16 * 100}%` } as React.CSSProperties} onChange={e => setSettings(s => ({ ...s, hour: Number(e.target.value) }))}/><Moon size={14} strokeWidth={1.3}/></div>
      <div className="time-presets">{[{ hour: environment.sunrise + 1, text: '清晨' }, { hour: 12, text: '正午' }, { hour: environment.sunset, text: '日落' }, { hour: 22, text: '深夜' }].map(t => <button key={t.hour} aria-pressed={settings.hour === t.hour} onClick={() => setSettings(s => ({ ...s, hour: t.hour }))}>{t.text}</button>)}</div>
      <div className="sunset-note"><span>日出 {formatHour(environment.sunrise)}</span><button onClick={() => setSettings(s => ({ ...s, hour: environment.sunset }))}>日落 {formatHour(environment.sunset)} · 正对中窗</button></div>
      <div className="panel-line lower-line"/>
      <button className="lamp-toggle" aria-pressed={settings.lamp} onClick={() => { setSettings(s => ({ ...s, lamp: !s.lamp })); feedback(settings.lamp ? '把这一刻，交还给窗外的光。' : '为自己，点亮一盏小小的灯。') }}><LampDesk size={18} strokeWidth={1.4}/><span>点一盏暖灯</span><i className="toggle-track"><b/></i></button>
      <div className="magic-controls"><button className="lamp-toggle" aria-pressed={settings.magic} title="魔法开关 (M)" onClick={() => setSettings(s => ({ ...s, magic: !s.magic }))}><Sparkles size={17} strokeWidth={1.4}/><span>一点魔法</span><i className="toggle-track"><b/></i></button><button className="pluck-button" title="拨弦 (Q)" onClick={() => api.current?.pluck()}><Music2 size={14}/>拨一根弦</button></div>
      <button className="wand-control" aria-label={wandSpell ? '魔杖归位' : '唤醒魔杖'} aria-pressed={!!wandSpell} title="点击桌上魔杖也可施法 (W)" onClick={() => api.current?.toggleWand()}><WandSparkles size={16}/><span>{wandSpell ? '魔杖归位' : '唤醒魔杖'}</span><small>{wandSpell ? SPELL_LABELS[wandSpell] : '随机一场小魔法'}</small></button>
      <p className="panel-footnote"><span/> 天气在变，安静一直在。</p>
    </aside>
    <div className="scene-note chrome"><span className="scene-note-number">01 — 04</span><p>一卷书 · 一张琴 · 一室微光</p><span className="scene-note-line"/></div>
    <button className="cat-companion chrome" aria-label={catState === 'sleeping' ? '唤醒小猫' : '让小猫休息'} title="点击小猫唤醒，移动鼠标让它追视，再点击地面让它走过去 (C)" onClick={() => api.current?.toggleCat()}><Cat size={19} strokeWidth={1.4}/><span>{catState === 'sleeping' ? '小猫在打盹' : catState === 'walking' ? '小猫散步中' : '小猫看向你'}<small>{catState === 'sleeping' ? '轻轻唤醒它' : '点击地面，陪它走走'}</small></span></button>
    <div className="scene-tools"><button className="icon-button" onClick={() => api.current?.zoom(1)} title="放大 (+)" aria-label="放大场景"><Plus size={18}/></button><button className="icon-button" onClick={() => api.current?.zoom(-1)} title="缩小 (-)" aria-label="缩小场景"><Minus size={18}/></button><span/><button className="icon-button" onClick={() => selectView('overview')} title="重置视角 (R)" aria-label="重置视角"><RotateCcw size={16}/></button></div>
    <div className={`atelier-toast ${toast ? 'visible' : ''}`} role="status"><Flower2 size={15}/>{toast}</div>
    <footer className="atelier-footer">
      <div className="ambient-control chrome"><button className={`sound-button ${!muted ? 'playing' : ''}`} onClick={() => void toggleSound()} aria-label={muted ? '开启环境音' : '关闭环境音'} aria-pressed={!muted}>{muted ? <VolumeX size={18} strokeWidth={1.4}/> : <Volume2 size={18} strokeWidth={1.4}/>}</button><div><span>{muted ? '让世界轻一点' : ambientDescription(settings.weather, settings.hour, settings.season)}</span><small>{muted ? '开启自然环境音' : <><AudioLines size={12}/> 正在聆听</>}</small></div></div>
      <nav className="view-dock chrome" aria-label="场景视角">{views.map(({ id, text, Icon }) => <button key={id} aria-pressed={view === id} onClick={() => selectView(id)}><Icon size={15} strokeWidth={1.5}/><span>{text}</span></button>)}<span className="dock-divider"/><button className="orbit-button" title="自动环游" aria-label="自动环游" aria-pressed={settings.rotating} disabled={settings.reduced} onClick={() => setSettings(s => ({ ...s, rotating: !s.rotating }))}>{settings.rotating ? <Pause size={15}/> : <Rotate3D size={17} strokeWidth={1.5}/>}</button></nav>
      <button className="immerse-button" onClick={() => setImmersed(!immersed)} aria-pressed={immersed}>{immersed ? <ArrowLeft size={15}/> : <Expand size={15}/>}<span>{immersed ? '返回书房' : '纯净观看'}</span></button>
    </footer>
    <div className="interaction-hint chrome"><Move size={12}/><span>拖动旋转</span><i>·</i><span>滚轮缩放</span><i>·</i><span>右键平移</span><i>·</i><span>点击魔杖，收获一场惊喜</span></div>
    <dialog ref={dialog} className={`atelier-dialog ${modal === 'book' ? 'book-dialog' : ''}`} onCancel={() => setModal(null)} onClose={() => setModal(null)} onClick={e => { if (e.target === dialog.current) setModal(null) }} aria-label={modal === 'reference' ? '场景灵感原图' : '书页中的片刻'}>
      <button className="dialog-close icon-button" aria-label="关闭弹窗" onClick={() => setModal(null)}><X size={20}/></button>
      {modal === 'reference' ? <><img src="/assets/rooms/daxia.jpg" alt="参考场景：拱形窗户、围绕房间的书柜、繁花与中央书桌"/><div className="reference-caption"><span>灵感的起点</span><p>保留拱窗与繁花，让复古木桌椅面向窗外。</p></div></> : <div className="reading-page"><BookOpen size={28} strokeWidth={1}/><span className="eyebrow">A LITTLE TIME FOR YOURSELF</span><h2>{pages[page][0]}</h2><p>{pages[page][1]}</p><button onClick={() => setPage(p => (p + 1) % pages.length)}>再读一页 <ChevronRight size={14}/></button><span className="page-number">— {String(page + 1).padStart(2, '0')} —</span></div>}
    </dialog>
  </main>
}
