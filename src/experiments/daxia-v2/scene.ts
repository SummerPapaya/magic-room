import * as T from 'three'
import { createRoomOrbit } from './roomCamera'
import { buildRoom } from './model'
import { createMagic } from './magic'
import { createLightMotes } from './lightMotes'
import { createWandMagic } from './wandMagic'
import { createCat } from './cat'
import { STUDY_SHIFT_Z, QIN_POSITION } from './layout'
import { environmentState, weatherForSeason } from './environment'
import type { Season, Weather } from './environment'
import { createExterior, createWindowWeather } from './exterior'
export type { Weather } from './environment'

export type View = 'overview' | 'desk' | 'window' | 'qin'
export type Settings = { season: Season; weather: Weather; hour: number; lamp: boolean; magic: boolean; rotating: boolean; reduced: boolean }
export type SceneAPI = { toggleCat: () => void; toggleWand: () => void; pluck: () => void; update: (settings: Settings) => void; view: (view: View) => void; zoom: (direction: number) => void; screenshot: (name: string) => void; dispose: () => void }
export function createScene(host: HTMLElement, initial: Settings, onAction: (action: string) => void, onReady: () => void): SceneAPI {
  let settings = { ...initial, weather: weatherForSeason(initial.weather, initial.season) }, alive = true, frame = 0, elapsed = 0
  const scene = new T.Scene(), camera = new T.PerspectiveCamera(35, 1, .1, 80)
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFShadowMap
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25; renderer.setClearColor('#edece5', 0)
  // No aria-label here: the label is user-facing copy, so App sets it from the
  // active language (and re-sets it when the visitor switches).
  renderer.domElement.tabIndex = 0; host.appendChild(renderer.domElement)
  const orbit = createRoomOrbit(camera, renderer.domElement), { controls } = orbit
  controls.enableDamping = !settings.reduced
  const room = buildRoom(); scene.add(room.group)
  const blockers = [room.desk, room.chair, room.qin.table, room.qin.bench, room.sidecase, room.frontFlowers, ...room.architecture.map(b => b.group)].map(object => { const b = new T.Box3().setFromObject(object); return new T.Box2(new T.Vector2(b.min.x, b.min.z), new T.Vector2(b.max.x, b.max.z)) })
  for (const [x, z, r] of [[2.4, 2.12, .51], [-2.4, .27, .4], [-3.35, .19, .3], [1.45, 2.46, .3]]) blockers.push(new T.Box2(new T.Vector2(x - r, z - r), new T.Vector2(x + r, z + r)))
  const cat = createCat(blockers, state => onAction(`cat:${state}`)); scene.add(cat.group)
  const toggleCat = () => { if (cat.state === 'sleeping') { cat.wake(); onAction('meow') } else cat.sleep() }
  const magic = createMagic(); scene.add(magic.group)
  const wandMagic = createWandMagic(room.wand); scene.add(wandMagic.group)
  const toggleWand = () => {
    const spell = wandMagic.toggle()
    if (spell) { settings = { ...settings, magic: true }; magic.group.visible = true }
    onAction(`wand:${spell ?? 'rest'}`)
  }
  const pluck = () => { magic.pulse(room.qin.instrument.getWorldPosition(new T.Vector3())); onAction('qin') }
  // Broad window-side sky light plus a small indoor reflection term.
  const hemi = new T.HemisphereLight('#eee7cd', '#858b89', 1.8); hemi.position.set(0, 2.5, -4); scene.add(hemi)
  const ambient = new T.AmbientLight('#e4e4dc', .35); scene.add(ambient)
  const sun = new T.DirectionalLight('#ffdda2', 0); sun.position.set(0, 8, -8); sun.target.position.set(0, 1.4, 0); scene.add(sun, sun.target)
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -7; sun.shadow.camera.right = 7; sun.shadow.camera.top = 7; sun.shadow.camera.bottom = -7; sun.shadow.camera.near = .1; sun.shadow.camera.far = 32; sun.shadow.normalBias = .018; sun.shadow.bias = -.00025; sun.shadow.radius = 3
  const windowFill = room.windows.map(bay => {
    const light = new T.DirectionalLight('#d8e1df', .2)
    light.position.set(bay.group.position.x, 2.9, bay.group.position.z)
    light.target.position.set(0, 1.1, .5); scene.add(light, light.target)
    return light
  })
  // The absent roof is a viewing cutaway, not an additional skylight. A shadow-only
  // ceiling stops high sunlight reaching furniture by bypassing the real windows.
  const roofShadow = new T.Mesh(new T.CircleGeometry(4.15, 96), new T.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: T.DoubleSide }))
  roofShadow.rotation.x = -Math.PI / 2; roofShadow.position.y = 5.23; roofShadow.castShadow = true; scene.add(roofShadow)
  // Close the presentation cutaway for shadow rays too, while leaving it invisible
  // to the viewing camera. Otherwise grazing rays bypass the side-window edges.
  const lightBlockerMaterial = roofShadow.material
  const edgeAngle = 2 * Math.PI / 5.8
  const edgeX = Math.sin(edgeAngle) * 3.49 + Math.cos(edgeAngle) * .9825
  const edgeZ = -Math.cos(edgeAngle) * 3.49 + Math.sin(edgeAngle) * .9825
  const start = Math.acos(-edgeZ / 4.06)
  const cutaway: T.Vector2[] = [new T.Vector2(edgeX, edgeZ)]
  for (let i = 0; i <= 32; i++) {
    const a = start + (2 * Math.PI - start * 2) * i / 32
    cutaway.push(new T.Vector2(Math.sin(a) * 4.06, -Math.cos(a) * 4.06))
  }
  cutaway.push(new T.Vector2(-edgeX, edgeZ))
  for (let i = 0; i < cutaway.length - 1; i++) {
    const a = cutaway[i], b = cutaway[i + 1], length = a.distanceTo(b)
    const blocker = new T.Mesh(new T.BoxGeometry(length + .02, 5.23, .035), lightBlockerMaterial)
    blocker.position.set((a.x + b.x) / 2, 5.23 / 2, (a.y + b.y) / 2)
    blocker.rotation.y = -Math.atan2(b.y - a.y, b.x - a.x); blocker.castShadow = true; scene.add(blocker)
  }
  room.architecture.forEach(bay => {
    const bottom = bay.wallHeight - .1, height = 5.24 - bottom
    const blocker = new T.Mesh(new T.BoxGeometry(2.0, height, .22), lightBlockerMaterial)
    blocker.position.set(bay.group.position.x, bottom + height / 2, bay.group.position.z)
    blocker.rotation.y = -bay.phi; blocker.castShadow = true; scene.add(blocker)
  })
  const lampBounce = new T.PointLight('#ffd5a1', 0, 4, 2); lampBounce.position.set(0, 1.7, -.15 + STUDY_SHIFT_Z); scene.add(lampBounce)
  const shadow = new T.Mesh(new T.PlaneGeometry(11.5, 11.5), new T.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: {}, vertexShader: 'varying vec2 p; void main(){p=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: 'varying vec2 p; void main(){float a=(1.-smoothstep(.24,.5,length(p-.5)))*.17;gl_FragColor=vec4(.27,.32,.25,a);}' })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = -.435; scene.add(shadow)
  const exterior = createExterior(room.windows, settings), precipitation = room.windows.map(createWindowWeather)
  const facingWindows = room.windows.map(() => true)
  const shell = host.closest<HTMLElement>('.atelier')
  let displayedHour = initial.hour
  const lightMotes = createLightMotes(room.windows, room.lamp.getWorldPosition(new T.Vector3())); scene.add(lightMotes.points)
  const steamArray = new Float32Array(12 * 3), steamGeometry = new T.BufferGeometry(); steamGeometry.setAttribute('position', new T.BufferAttribute(steamArray, 3)); const steam = new T.Points(steamGeometry, new T.PointsMaterial({ color: '#f2ead8', size: .042, transparent: true, opacity: .23, depthWrite: false })); scene.add(steam)
  let width = 0, height = 0
  const mobile = () => width < 760
  const poses = () => ({ overview: { position: new T.Vector3(5.5, 9.5, 15.5).multiplyScalar(mobile() ? 1.34 : 1), target: new T.Vector3(0, 2.0, 0) }, desk: { position: new T.Vector3(2.6, 4.3, 6.2 + STUDY_SHIFT_Z), target: new T.Vector3(0, 1.45, -.32 + STUDY_SHIFT_Z) }, window: { position: new T.Vector3(.12, 3.3, 4.6), target: new T.Vector3(0, 2.65, -2.8) }, qin: { position: new T.Vector3(.7, 4.6, 7.8), target: new T.Vector3(QIN_POSITION[0] + .3, 1.0, QIN_POSITION[2] - .25) } })
  let transition: { from: T.Vector3; to: T.Vector3; frameFrom: T.Vector2; frameTo: T.Vector2; t: number } | null = null
  const view = (which: View) => {
    const p = poses()[which]
    // Flush remaining drag momentum before starting a preset transition.
    controls.autoRotate = false; controls.enableDamping = false; controls.update(); controls.enableDamping = !settings.reduced
    const frameTo = orbit.offsetFor(p.position, p.target)
    if (settings.reduced) { camera.position.copy(p.position); orbit.framing.copy(frameTo); controls.update(); orbit.apply(width, height); return }
    transition = { from: camera.position.clone(), to: p.position, frameFrom: orbit.framing.clone(), frameTo, t: 0 }
  }
  const resize = () => {
    const r = host.getBoundingClientRect(); width = r.width; height = r.height
    renderer.setSize(width, height); lightMotes.resize(height * renderer.getPixelRatio()); wandMagic.resize(height * renderer.getPixelRatio()); camera.aspect = width / height; orbit.apply(width, height)
  }
  resize(); camera.position.copy(poses().overview.position); controls.update()
  const observer = new ResizeObserver(resize); observer.observe(host)
  const raycaster = new T.Raycaster(), pointer = new T.Vector2(), down = new T.Vector2()
  const floorPlane = new T.Plane(new T.Vector3(0, 1, 0), -.045), floorPoint = new T.Vector3()
  const roomTargets = [...room.targets, ...cat.targets]
  let dragging = false, panning = false, multiTouch = false
  const panLast = new T.Vector2(), touches = new Map<number, T.Vector2>()
  const touchCenter = () => { const center = new T.Vector2(); touches.forEach(p => center.add(p)); return center.divideScalar(touches.size) }
  const hit = (e: PointerEvent) => {
    const r = renderer.domElement.getBoundingClientRect(); pointer.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); raycaster.setFromCamera(pointer, camera); return raycaster.intersectObjects(settings.magic ? [...roomTargets, ...magic.targets] : roomTargets, true)[0]?.object.userData.action as string | undefined
  }
  const pointerDown = (e: PointerEvent) => {
    down.set(e.clientX, e.clientY); panLast.copy(down); dragging = true; transition = null; panning = e.button === 2
    if (e.pointerType === 'touch') { touches.set(e.pointerId, down.clone()); if (touches.size > 1) { multiTouch = true; panLast.copy(touchCenter()) } }
    renderer.domElement.style.cursor = 'grabbing'
  }
  const pointerUp = (e: PointerEvent) => {
    if (!multiTouch && down.distanceTo(new T.Vector2(e.clientX, e.clientY)) < 5 && e.button === 0) {
      const action = hit(e)
      if (action === 'cat') { onAction('meow'); if (cat.state === 'sleeping') cat.wake(); else if (raycaster.ray.intersectPlane(floorPlane, floorPoint)) cat.moveTo(floorPoint) }
      else if (action === 'qin') pluck()
      else if (action === 'wand') toggleWand()
      else if (action) { if (action.startsWith('magic-')) magic.pulse(new T.Vector3(-1.18, 3.4, -2.35)); onAction(action) }
      else if (raycaster.ray.intersectPlane(floorPlane, floorPoint)) cat.moveTo(floorPoint)
    }
    touches.delete(e.pointerId); dragging = touches.size > 0; panning = false; if (!dragging) multiTouch = false
    renderer.domElement.style.cursor = 'grab'
  }
  const pointerMove = (e: PointerEvent) => {
    if (dragging) {
      if (touches.has(e.pointerId)) touches.get(e.pointerId)!.set(e.clientX, e.clientY)
      if (panning || touches.size > 1) {
        const next = touches.size > 1 ? touchCenter() : new T.Vector2(e.clientX, e.clientY)
        orbit.pan(next.x - panLast.x, next.y - panLast.y, width, height); panLast.copy(next); orbit.apply(width, height)
      }
      return
    }
    renderer.domElement.style.cursor = hit(e) ? 'pointer' : 'grab'
    if (raycaster.ray.intersectPlane(floorPlane, floorPoint)) cat.lookAt(floorPoint)
  }
  const cancel = () => { dragging = panning = multiTouch = false; touches.clear(); renderer.domElement.style.cursor = 'grab' }
  renderer.domElement.addEventListener('pointerdown', pointerDown); renderer.domElement.addEventListener('pointerup', pointerUp); renderer.domElement.addEventListener('pointermove', pointerMove); renderer.domElement.addEventListener('pointercancel', cancel)
  const stopTransition = () => { transition = null }
  renderer.domElement.addEventListener('wheel', stopTransition, { passive: true })
  let previousTime = performance.now()
  const lampMaterial = room.lamp.material as T.MeshToonMaterial
  const loop = () => {
    if (!alive) return
    frame = requestAnimationFrame(loop)
    const now = performance.now(), delta = Math.min((now - previousTime) / 1000, .05); previousTime = now
    if (document.hidden) return
     elapsed += delta
    const factor = settings.reduced ? 1 : 1 - Math.exp(-delta * 4)
    displayedHour = T.MathUtils.lerp(displayedHour, settings.hour, factor)
    const env = environmentState(displayedHour, settings.season, settings.weather)
    const colors = exterior.update(env, settings.season, settings.reduced ? 0 : elapsed, factor)
    // Exactly the same world direction drives the visible solar disc and shadows.
    // No independent trajectory, night-time sun or front-facing fake bounce light.
    sun.position.copy(sun.target.position).addScaledVector(new T.Vector3(...env.direction), 14)
    sun.color.copy(colors.light); sun.intensity = env.direct
    sun.shadow.radius = settings.weather === 'cloud' ? 4.5 : 2.4
    hemi.color.copy(colors.ambient); hemi.groundColor.set(settings.season === 'winter' ? '#c5cee5' : '#bebad4'); hemi.intensity = env.diffuse
    ambient.color.copy(colors.ambient); ambient.intensity = .025 + env.diffuse * .23
    windowFill.forEach(light => { light.color.copy(colors.ambient); light.intensity = (.025 + env.diffuse * .48) / 3 })
    room.lampLight.intensity = T.MathUtils.lerp(room.lampLight.intensity, settings.lamp ? env.lampIntensity : 0, factor)
    lampBounce.intensity = T.MathUtils.lerp(lampBounce.intensity, settings.lamp ? .55 : 0, factor)
    lampMaterial.emissive.set('#d7bb70'); lampMaterial.emissiveIntensity = T.MathUtils.lerp(lampMaterial.emissiveIntensity, settings.lamp ? .14 : 0, factor)
    precipitation.forEach((p, i) => p.update(elapsed, settings.weather, settings.season, settings.reduced, env.daylight, facingWindows[i]))
    lightMotes.update(elapsed, env, settings.reduced, settings.magic, settings.lamp)
    if (shell) {
      shell.style.setProperty('--scene-center', `#${colors.center.getHexString()}`)
      shell.style.setProperty('--scene-edge', `#${colors.edge.getHexString()}`)
      const ink = new T.Color('#e3e3f6').lerp(new T.Color('#4d5175'), env.daylight)
      const muted = new T.Color('#b0b4d0').lerp(new T.Color('#898dab'), env.daylight)
      const panel = new T.Color('#3d415f').lerp(new T.Color('#f1effa'), env.daylight)
      shell.style.setProperty('--ink', `#${ink.getHexString()}`); shell.style.setProperty('--muted', `#${muted.getHexString()}`)
      shell.style.setProperty('--panel', `#${panel.getHexString()}de`)
    }
    for (let i = 0; i < 12; i++) { const phase = ((settings.reduced ? 0 : elapsed * .23) + i / 12) % 1; steamArray.set([room.tea.x + Math.sin(phase * 8 + elapsed * .4) * .035, 1.76 + phase * .36, room.tea.z + Math.cos(phase * 7) * .025], i * 3) }
    steamGeometry.attributes.position.needsUpdate = true
    magic.update(elapsed, delta, settings.magic, settings.reduced)
    wandMagic.update(delta, elapsed, settings.reduced)
    cat.update(delta, elapsed, settings.reduced)
    if (transition) { transition.t = Math.min(1, transition.t + delta / 1.15); const t = transition.t * transition.t * (3 - 2 * transition.t); camera.position.lerpVectors(transition.from, transition.to, t); orbit.framing.lerpVectors(transition.frameFrom, transition.frameTo, t); orbit.apply(width, height); if (transition.t >= 1) transition = null }
    controls.autoRotate = settings.rotating && !settings.reduced && !transition; controls.update(delta)
    // The wall nearest the viewer dissolves when orbiting behind it; furnishings
    // remain inspectable from every azimuth instead of trapping the camera.
    room.architecture.forEach(bay => {
      const inward = new T.Vector3(-Math.sin(bay.phi), 0, Math.cos(bay.phi)), direction = camera.position.clone().sub(bay.group.position).normalize(), facing = inward.dot(direction), opacity = facing < -.07 ? .12 : 1
      bay.materials.forEach(m => { m.opacity = T.MathUtils.lerp(m.opacity, opacity, factor); const transparent = m.opacity < .99; if (m.transparent !== transparent) { m.transparent = transparent; m.needsUpdate = true } m.depthWrite = !transparent })
      const i = room.windows.findIndex(w => w.group === bay.group)
      if (i >= 0) { exterior.meshes[i].visible = facing > -.07; facingWindows[i] = facing > -.07 }
    })
    renderer.render(scene, camera)
  }
  loop(); requestAnimationFrame(onReady)
  const contextLost = (e: Event) => { e.preventDefault(); onAction('context-lost') }
  renderer.domElement.addEventListener('webglcontextlost', contextLost)
  return {
    pluck, toggleWand, toggleCat,
    update(next) { settings = { ...next, weather: weatherForSeason(next.weather, next.season) }; controls.enableDamping = !settings.reduced; if (!settings.magic && wandMagic.active) { wandMagic.land(); onAction('wand:rest') } }, view,
    zoom(direction) { transition = null; const offset = camera.position.clone().sub(controls.target), distance = T.MathUtils.clamp(offset.length() * (direction > 0 ? .82 : 1.22), controls.minDistance, controls.maxDistance); camera.position.copy(controls.target).add(offset.setLength(distance)); controls.update() },
    screenshot(name) { renderer.render(scene, camera); const output = document.createElement('canvas'); output.width = renderer.domElement.width; output.height = renderer.domElement.height; const context = output.getContext('2d')!; context.fillStyle = shell?.style.getPropertyValue('--scene-center') || '#edece5'; context.fillRect(0, 0, output.width, output.height); context.drawImage(renderer.domElement, 0, 0); const link = document.createElement('a'); link.download = `${name}.png`; link.href = output.toDataURL('image/png'); link.click() },
    dispose() { alive = false; cancelAnimationFrame(frame); observer.disconnect(); controls.dispose(); renderer.domElement.removeEventListener('pointerdown', pointerDown); renderer.domElement.removeEventListener('pointerup', pointerUp); renderer.domElement.removeEventListener('pointermove', pointerMove); renderer.domElement.removeEventListener('pointercancel', cancel); renderer.domElement.removeEventListener('wheel', stopTransition); renderer.domElement.removeEventListener('webglcontextlost', contextLost); precipitation.forEach(p => p.dispose()); exterior.dispose(); magic.dispose(); lightMotes.dispose(); wandMagic.dispose(); cat.dispose(); scene.traverse(obj => { if (obj instanceof T.Mesh || obj instanceof T.Points) { obj.geometry.dispose(); if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose()); else obj.material.dispose() } }); room.dispose(); renderer.dispose(); renderer.domElement.remove() },
  }
}
