/** Bilingual copy for the room, plus the rule that decides which one to open in.
 *
 * Every user-facing string lives here. The zh object is the source of truth for
 * the shape (en is typed as `typeof zh`, so a missing translation is a build
 * error rather than an English visitor seeing Chinese mid-sentence).
 *
 * Language is resolved in the same order the main SummerTown site uses:
 *   ?lang=  →  a previous choice  →  the visitor's country  →  Chinese.
 * The country comes from Cloudflare's edge (`/cdn-cgi/trace`, read by an inline
 * script in index.html) so mainland visitors open in Chinese and everyone else
 * in English without a flash of the wrong language.
 */
export type Lang = 'zh' | 'en'

const STORAGE_KEY = 'magic-room-lang'
const CHINESE_COUNTRIES = ['CN']

const zh = {
  htmlLang: 'zh-CN',
  title: 'Summer\'s Magic Room · 大夏的魔法书屋',
  canvasAria: '三维花园书房：拖动旋转，滚轮缩放，右键拖动平移。点击魔杖可随机施法，再次点击使其归位；点击小黑猫唤醒，移动鼠标让它追视，再点击地面让它走过去。',
  loading: '让光，慢慢进来',
  errorWebgl: '这间书房需要 WebGL 支持，请使用开启硬件加速的浏览器。',
  errorLost: '画面暂时失去了连接，请重新打开这间书房。',
  reopen: '重新打开',
  langLabel: 'EN',
  langTitle: 'Switch to English',
  fileStem: '花与书之间',
  fileHour: '时',
  // The brand mark is deliberately bilingual in both languages: the Chinese
  // name with its English line under it, exactly as the sign by the door.
  brand: { home: '回到小屋顶部', name: '魔法书屋', sub: 'SUMMER\'S MAGIC ROOM' },
  reference: '灵感原图',
  save: { title: '保存场景图片', done: '这一刻的光，已经为你保存。' },
  intro: {
    aria: '房间介绍', eyebrow: 'A ROOM OF ONE’S OWN',
    titleTop: '花与书', titleBottom: '之间', titleLast: '', stop: '。',
    lead: '在窗边，安放一小片自己。',
    captionLeft: '大夏的书房', captionRight: '花园阁楼',
  },
  weather: {
    aria: '窗外天气', heading: '选一种天气',
    sun: { title: '晴日', note: '阳光落在桌上，也落在每一页里。' },
    cloud: { title: '薄云', note: '云慢慢经过，房间的光也柔软下来。' },
    rain: { title: '听雨', note: '雨落窗外，书页留在温暖里。' },
    snow: { title: '初雪', note: '窗外开始下雪，给自己留一盏暖灯。' },
    snowWarm: '初雪仅在冬雪季节可选', snowOnly: '仅冬季',
  },
  seasons: {
    aria: '窗外季节', heading: '窗外四时',
    spring: { label: '春樱', note: '樱花绽开，新叶与花瓣一起迎风。' },
    summer: { label: '夏荫', note: '绿荫繁盛，漫长的白昼慢慢落幕。' },
    autumn: { label: '秋枫', note: '树梢染上金橙，落叶轻轻经过窗前。' },
    winter: { label: '冬雪', note: '远山覆雪，疏枝等着下一次春天。' },
  },
  light: {
    heading: '留一束光', rangeAria: '光照时刻',
    timeNames: { night: '静夜', morning: '晨光', dusk: '日暮', day: '白昼' },
    presets: { morning: '清晨', noon: '正午', sunset: '日落', night: '深夜' },
    sunrise: '日出', sunset: '日落', sunsetNote: '正对中窗',
  },
  panel: {
    aria: '天气和光线设置', heading: '窗外，恰好', eyebrow: 'MAKE YOUR MOMENT',
    footnote: '天气在变，安静一直在。',
    lamp: '点一盏暖灯',
    lampOn: '为自己，点亮一盏小小的灯。',
    lampOff: '把这一刻，交还给窗外的光。',
    magic: '一点魔法', magicTitle: '魔法开关 (M)',
    pluck: '拨一根弦', pluckTitle: '拨弦 (Q)',
  },
  wand: {
    cast: '唤醒魔杖', rest: '魔杖归位', random: '随机一场小魔法',
    title: '点击桌上魔杖也可施法 (W)',
    restNote: '魔杖轻轻落回桌面。',
    castNote: (spell: string) => `${spell}，再点魔杖便可收起。`,
    spells: { glitter: '流金亮片', petals: '粉色花雨', snow: '轻盈飞雪', fireworks: '星空烟花', maple: '枫叶轻舞' },
  },
  sceneNote: '一卷书 · 一张琴 · 一室微光',
  cat: {
    wake: '唤醒小猫', rest: '让小猫休息',
    title: '点击小猫唤醒，移动鼠标让它追视，再点击地面让它走过去 (C)',
    napping: '小猫在打盹', walking: '小猫散步中', watching: '小猫看向你',
    nappingNote: '轻轻唤醒它', awakeNote: '点击地面，陪它走走',
    wokeNote: '小猫醒啦。移动鼠标让它追视，点击地面让它走过去。',
  },
  tools: {
    zoomIn: '放大场景', zoomOut: '缩小场景', reset: '重置视角',
    zoomInTitle: '放大 (+)', zoomOutTitle: '缩小 (-)', resetTitle: '重置视角 (R)',
  },
  sound: {
    quiet: '让世界轻一点', quietNote: '开启自然环境音', listening: '正在聆听',
    onAria: '开启环境音', offAria: '关闭环境音',
    onNote: '打开声音，听听窗外的世界。', failed: '声音未能开启，请再试一次。',
    ambience: { rain: '窗外轻雨', snow: '静雪微声', cicadasBirds: '轻柔鸟鸣 · 夏日蝉声', cicadas: '远处的夏蝉', birds: '疏疏鸟鸣', plain: '安静白噪音' },
  },
  dock: { aria: '场景视角', orbit: '自动环游', overview: '房间全景', desk: '坐近书桌', window: '望向窗外', qin: '抚琴一隅' },
  immerse: { enter: '纯净观看', exit: '返回书房' },
  hints: { rotate: '拖动旋转', zoom: '滚轮缩放', pan: '右键平移', wand: '点击魔杖，收获一场惊喜' },
  dialog: {
    referenceAria: '场景灵感原图', bookAria: '书页中的片刻', close: '关闭弹窗',
    referenceAlt: '参考场景：拱形窗户、围绕房间的书柜、繁花与中央书桌',
    referenceCaption: '灵感的起点', referenceNote: '保留拱窗与繁花，让复古木桌椅面向窗外。',
    readMore: '再读一页', eyebrow: 'A LITTLE TIME FOR YOURSELF',
  },
  pages: [
    ['把日子，过成一间书房。', '窗外的云有它的去处，\n此刻的你，只需在这里。'],
    ['慢一点，也没有关系。', '花在自己的季节里开放，\n书在你翻开时，才开始旅行。'],
    ['给自己一小片安静。', '一盏灯，一杯茶，一本未读完的书。\n这便是今天，最好的片刻。'],
  ] as [string, string][],
  notes: { qin: '一弦清音，慢慢散去。', qinFailed: '琴音暂未开启，可以再拨一次弦。', meowFailed: '小猫的声音暂未开启，可以再轻点一下。', touch: '轻轻一碰，星光便有了回音。' },
}

const en: typeof zh = {
  htmlLang: 'en',
  title: 'Summer\'s Magic Room',
  canvasAria: 'A three-dimensional garden study: drag to rotate, scroll to zoom, right-drag to pan. Click the wand to cast a random spell and click it again to let it rest. Click the black cat to wake it, move the mouse to be followed, then click the floor to send it walking.',
  loading: 'Let the light come in slowly',
  errorWebgl: 'This study needs WebGL — please use a browser with hardware acceleration enabled.',
  errorLost: 'The view lost its connection; please open the study again.',
  reopen: 'Reopen',
  langLabel: '中文',
  langTitle: '切换到中文',
  fileStem: 'between-flowers-and-books',
  fileHour: 'h',
  brand: { home: 'Back to the top', name: '魔法书屋', sub: 'SUMMER\'S MAGIC ROOM' },
  reference: 'Reference',
  save: { title: 'Save a picture of the room', done: 'The light of this moment has been saved for you.' },
  intro: {
    aria: 'Room introduction', eyebrow: 'A ROOM OF ONE’S OWN',
    // Three short lines: English runs far wider than the Chinese it replaces,
    // and the heading column is narrow enough that two long lines cross the room.
    titleTop: 'Between', titleBottom: 'flowers', titleLast: '& books', stop: '.',
    lead: 'Somewhere quiet, by the window.',
    captionLeft: 'Summer’s study', captionRight: 'a garden loft',
  },
  weather: {
    aria: 'Weather outside', heading: 'Pick a weather',
    sun: { title: 'Clear', note: 'Sunlight falls on the desk, and on every page.' },
    cloud: { title: 'Soft cloud', note: 'The clouds drift over; the light softens with them.' },
    rain: { title: 'Rain', note: 'Rain falls outside; the pages stay warm.' },
    snow: { title: 'Snow', note: 'Snow begins outside — keep a warm lamp for yourself.' },
    snowWarm: 'Snow is only available in winter', snowOnly: 'Winter',
  },
  seasons: {
    aria: 'Season outside', heading: 'Four seasons',
    spring: { label: 'Spring', note: 'Blossom opens; new leaves and petals ride the same breeze.' },
    summer: { label: 'Summer', note: 'Deep green; the long day settles slowly.' },
    autumn: { label: 'Autumn', note: 'The treetops turn gold; leaves drift past the window.' },
    winter: { label: 'Winter', note: 'Snow on the far hills; bare branches wait for spring.' },
  },
  light: {
    heading: 'One beam of light', rangeAria: 'Hour of the day',
    timeNames: { night: 'Still night', morning: 'Morning', dusk: 'Dusk', day: 'Daylight' },
    presets: { morning: 'Dawn', noon: 'Noon', sunset: 'Sunset', night: 'Night' },
    sunrise: 'Sunrise', sunset: 'Sunset', sunsetNote: 'mid-window',
  },
  panel: {
    aria: 'Weather and light settings', heading: 'Just outside', eyebrow: 'MAKE YOUR MOMENT',
    footnote: 'The weather changes; the quiet stays.',
    lamp: 'Light a lamp',
    lampOn: 'Light a small lamp for yourself.',
    lampOff: 'Give this moment back to the light outside.',
    magic: 'Magic', magicTitle: 'Magic (M)',
    pluck: 'Pluck', pluckTitle: 'Pluck a string (Q)',
  },
  wand: {
    cast: 'Wake the wand', rest: 'Rest the wand', random: 'a random spell',
    title: 'Click the wand on the desk to cast (W)',
    restNote: 'The wand settles back on the desk.',
    castNote: (spell: string) => `${spell} — click the wand again to let it rest.`,
    spells: { glitter: 'Molten gold', petals: 'Petal rain', snow: 'Light snow', fireworks: 'Star fireworks', maple: 'Dancing maple' },
  },
  sceneNote: 'A book · a guqin · a room of soft light',
  cat: {
    wake: 'Wake the cat', rest: 'Let the cat rest',
    title: 'Click the cat to wake it, move the mouse to be followed, then click the floor to send it walking (C)',
    napping: 'The cat is napping', walking: 'The cat is walking', watching: 'The cat is watching you',
    nappingNote: 'Gently wake it', awakeNote: 'Click the floor to walk with it',
    wokeNote: 'The cat is awake. Move the mouse and it will follow; click the floor to send it walking.',
  },
  tools: {
    zoomIn: 'Zoom in', zoomOut: 'Zoom out', reset: 'Reset the view',
    zoomInTitle: 'Zoom in (+)', zoomOutTitle: 'Zoom out (-)', resetTitle: 'Reset view (R)',
  },
  sound: {
    quiet: 'Let the world go quiet', quietNote: 'Turn on the ambience', listening: 'Listening',
    onAria: 'Turn on ambience', offAria: 'Turn off ambience',
    onNote: 'Sound on — listen to the world outside.', failed: 'The sound would not start; please try again.',
    ambience: { rain: 'Light rain outside', snow: 'Quiet snow', cicadasBirds: 'Soft birdsong · summer cicadas', cicadas: 'Distant cicadas', birds: 'Sparse birdsong', plain: 'Quiet ambience' },
  },
  dock: { aria: 'Scene views', orbit: 'Auto-orbit', overview: 'Overview', desk: 'At the desk', window: 'Out the window', qin: 'By the guqin' },
  immerse: { enter: 'Clean view', exit: 'Back to the study' },
  hints: { rotate: 'Drag to rotate', zoom: 'Scroll to zoom', pan: 'Right-drag to pan', wand: 'Click the wand for a surprise' },
  dialog: {
    referenceAria: 'Reference image', bookAria: 'A moment on the page', close: 'Close',
    referenceAlt: 'Reference scene: arched windows, bookcases around the room, flowers and a central desk',
    referenceCaption: 'Where it began', referenceNote: 'Keep the arched windows and the flowers; let the old wooden desk face the window.',
    readMore: 'One more page', eyebrow: 'A LITTLE TIME FOR YOURSELF',
  },
  pages: [
    ['Live your days as you would a study.', 'The clouds outside have somewhere to be;\nright now, you only need to be here.'],
    ['It is all right to go slower.', 'Flowers open in their own season;\na book only begins to travel when you open it.'],
    ['Keep a little quiet for yourself.', 'A lamp, a cup of tea, a book half-read.\nThat is the best moment of today.'],
  ],
  notes: { qin: 'One clear note, fading slowly.', qinFailed: 'The strings are not ready yet; pluck once more.', meowFailed: 'The cat’s voice is not ready; tap once more.', touch: 'A light touch, and the starlight answers.' },
}

export const COPY: Record<Lang, typeof zh> = { zh, en }
export type Copy = typeof zh

export function resolveLang(search: string, stored: string | null, country: string): Lang {
  const asked = new URLSearchParams(search).get('lang')
  if (asked === 'zh' || asked === 'en') return asked
  if (stored === 'zh' || stored === 'en') return stored
  if (country) return CHINESE_COUNTRIES.includes(country.toUpperCase()) ? 'zh' : 'en'
  return 'zh'
}

/** Reads the edge-located country that index.html stashed on `window`. */
export async function initialLang(): Promise<Lang> {
  let country = ''
  try { country = (await (window as unknown as { __stGeo?: Promise<string> }).__stGeo) ?? '' } catch { country = '' }
  return resolveLang(location.search, localStorage.getItem(STORAGE_KEY), country)
}

export function rememberLang(lang: Lang) {
  try { localStorage.setItem(STORAGE_KEY, lang) } catch { /* private mode: the URL still works */ }
}
