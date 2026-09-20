import * as T from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { STUDY_SHIFT_Z, QIN_POSITION, QIN_ROTATION, QIN_TABLE, QIN_BENCH, SIDECASE_POSITION, SIDECASE_ROTATION } from './layout'

type V = [number, number, number]
// Cream walnut with a five-percent warm tint shared by every wooden furnishing.
const C = { wood: '#b69d82', edge: '#907964', honey: '#d6c2a5', cream: '#e5dfef', wall: '#aab3db', blue: '#818fc0', brass: '#bcab7d', green: '#607458' }
const bookColors = ['#7c8fba', '#9981af', '#b8aacb', '#657b9c', '#c5b5a9', '#8d78ab', '#a597bf', '#596a93']
let seed = 27
function rand() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
const materials = new Map<string, T.MeshToonMaterial>()
const ramp = new T.DataTexture(new Uint8Array([143, 143, 143, 255, 193, 193, 193, 255, 231, 231, 231, 255, 255, 255, 255, 255]), 4, 1, T.RGBAFormat)
ramp.minFilter = ramp.magFilter = T.NearestFilter; ramp.needsUpdate = true
function mat(c: string) {
  if (!materials.has(c)) materials.set(c, new T.MeshToonMaterial({ color: c, gradientMap: ramp }))
  return materials.get(c)!
}
function mesh(g: T.BufferGeometry, color: string, p: V, s: V = [1, 1, 1], r: V = [0, 0, 0]) {
  const m = new T.Mesh(g, mat(color)); m.position.set(...p); m.scale.set(...s); m.rotation.set(...r); m.castShadow = m.receiveShadow = true; return m
}
function box(to: T.Group, p: V, s: V, c = C.wood, radius = .025, r: V = [0, 0, 0]) {
  const m = mesh(radius ? new RoundedBoxGeometry(...s, 1, Math.min(radius, Math.min(...s) * .24)) : new T.BoxGeometry(...s), c, p, [1, 1, 1], r); to.add(m); return m
}
function ball(to: T.Group, p: V, s: V, c: string, r: V = [0, 0, 0]) { const m = mesh(new T.SphereGeometry(1, 8, 6), c, p, s, r); to.add(m); return m }
function cylinder(to: T.Group, p: V, rt: number, rb: number, h: number, c: string, segments = 16) { const m = mesh(new T.CylinderGeometry(rt, rb, h, segments), c, p); to.add(m); return m }
function rod(to: T.Group, from: V, end: V, radius: number, c: string) {
  const a = new T.Vector3(...from), b = new T.Vector3(...end), d = b.clone().sub(a)
  const m = mesh(new T.CylinderGeometry(radius, radius, d.length(), 6), c, a.clone().add(b).multiplyScalar(.5).toArray() as V)
  m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()); to.add(m); return m
}
function torus(to: T.Group, p: V, radius: number, tube: number, c: string, r: V = [0, 0, 0], arc = Math.PI * 2) {
  const m = mesh(new T.TorusGeometry(radius, tube, 6, 48, arc), c, p, [1, 1, 1], r); to.add(m); return m
}
function at(parent: T.Group, p: V, angle = 0, scale = 1) { const g = new T.Group(); g.position.set(...p); g.rotation.y = angle; g.scale.setScalar(scale); parent.add(g); return g }

// Static detail is batched by material: hundreds of books, petals and leaves,
// without hundreds of draw calls. Architectural bays remain independently fadeable.
function batch(root: T.Group) {
  root.updateMatrixWorld(true)
  const groups = new Map<T.Material, T.BufferGeometry[]>()
  const inverse = root.matrixWorld.clone().invert()
  const originals: T.Mesh[] = []
  root.traverse(obj => {
    if (!(obj instanceof T.Mesh) || Array.isArray(obj.material)) return
    const transformed = obj.geometry.clone().applyMatrix4(inverse.clone().multiply(obj.matrixWorld))
    const g = transformed.index ? transformed.toNonIndexed() : transformed
    if (g !== transformed) transformed.dispose()
    g.deleteAttribute('uv'); const list = groups.get(obj.material) ?? []; list.push(g); groups.set(obj.material, list); originals.push(obj)
  })
  originals.forEach(m => { m.removeFromParent(); m.geometry.dispose() })
  for (const [material, geometries] of groups) {
    const geometry = mergeGeometries(geometries, false)
    if (geometry) { const m = new T.Mesh(geometry, material); m.castShadow = m.receiveShadow = true; root.add(m) }
    geometries.forEach(g => g.dispose())
  }
}
function flower(to: T.Group, p: V, size: number, color: string) {
  for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; ball(to, [p[0] + Math.cos(a) * size * .6, p[1] + Math.sin(a) * size * .45, p[2]], [size * .65, size * .58, size * .4], color, [0, 0, a]) }
  ball(to, [p[0], p[1], p[2] + size * .3], [size * .23, size * .23, size * .23], '#dfbd6f')
}
function flowers(parent: T.Group, p: V, scale = 1, color = '#deb2ac', count = 26) {
  const g = at(parent, p, 0, scale)
  cylinder(g, [0, .23, 0], .3, .22, .46, '#a6aaa0'); cylinder(g, [0, .445, 0], .32, .32, .07, '#c7c8b8'); cylinder(g, [0, .47, 0], .273, .273, .02, '#51493b')
  torus(g, [0, .12, 0], .244, .011, '#8e968b', [Math.PI / 2, 0, 0])
  for (let i = 0; i < count; i++) {
    const a = i * 2.399, radius = .12 + rand() * .4, x = Math.cos(a) * radius, z = Math.sin(a) * radius
    const y = .7 + rand() * .38 - radius * .26
    rod(g, [x * .18, .45, z * .18], [x, y, z], .01, '#748166')
    ball(g, [x * .8, y * .73, z * .85], [.13, .029, .058], i % 2 ? '#8d9a73' : '#677c60', [0, a, .4])
    for (let j = 0; j < 3; j++) flower(g, [x + (rand() - .5) * .13, y + rand() * .09, z + (rand() - .5) * .13], .037 + rand() * .027, i % 5 === 0 ? '#f1dfc6' : color)
  }
  return g
}
function vine(parent: T.Group, p: V, length: number, lavender = false) {
  const g = at(parent, p)
  for (let branch = 0; branch < 6; branch++) {
    let last: V = [(branch - 2.5) * .12, .06, 0]
    for (let i = 0; i < 13; i++) {
      const y = -i * length / 13 * (.65 + branch * .05), x = (branch - 2.5) * .13 + Math.sin(i * .6 + branch) * .14, z = Math.cos(i * .4 + branch) * .13
      rod(g, last, [x, y, z], .012, '#6d7858'); last = [x, y, z]
      ball(g, [x + (i % 2 ? -.07 : .07), y, z], [.12, .045, .07], i % 3 ? '#788d65' : '#9ba878', [0, i, i * .9])
      if (lavender && i % 3 === 0) for (let k = 0; k < 4; k++) flower(g, [x + .04, y - k * .045, z + .06], .055 - k * .007, '#b5b4d1')
    }
  }
}
function book(parent: T.Group, p: V, w: number, h: number, d: number, c: string, lean = 0) {
  const g = at(parent, p); g.rotation.z = lean
  box(g, [0, h / 2, 0], [w, h, d], c, .008)
  box(g, [0, h / 2, -.006], [Math.max(.012, w - .026), h - .035, d + .005], '#e0d2b9', 0)
  box(g, [0, h / 2, d / 2 + .006], [w + .004, h, .025], c, .006)
  for (const y of [.075, h - .065]) box(g, [0, y, d / 2 + .023], [w * .8, .012, .004], '#d8bb83', 0)
  if (w > .13) box(g, [0, h * .59, d / 2 + .024], [w * .5, .1, .006], '#cfc1a1', 0)
}
function bookStack(parent: T.Group, p: V, count = 3, scale = 1) {
  const g = at(parent, p, .1, scale)
  for (let i = 0; i < count; i++) { const b = at(g, [(i % 2) * .035, i * .095, 0], (i - 1) * .13); box(b, [0, .045, 0], [.53, .068, .37], '#e5d7b9', .008); for (const y of [0, .085]) box(b, [0, y, 0], [.57, .018, .4], bookColors[i % bookColors.length], .005) }
}
function panel(parent: T.Group, p: V, w: number, h: number, color = C.honey) {
  box(parent, p, [w, h, .065], C.edge)
  box(parent, [p[0], p[1], p[2] + .043], [w - .09, h - .09, .027], color, .01)
  box(parent, [p[0], p[1], p[2] + .06], [w - .16, h - .16, .018], C.wood, .012)
}
function cabinet(parent: T.Group, w: number) {
  box(parent, [0, .53, 0], [w, .95, .63], C.wood)
  box(parent, [0, .11, .02], [w + .08, .13, .7], C.edge)
  box(parent, [0, 1.03, .04], [w + .14, .13, .77], C.honey)
  for (let i = -1; i <= 1; i++) { panel(parent, [i * w / 3, .58, .335], w / 3 - .035, .7); ball(parent, [i * w / 3 + w / 10, .63, .41], [.025, .025, .025], C.brass) }
}
function shelf(parent: T.Group, p: V, angle: number, width = 1.46) {
  const g = at(parent, p, angle)
  cabinet(g, width + .09)
  box(g, [0, 2.59, -.21], [width, 3.11, .12], '#b09981')
  for (const side of [-1, 1]) { box(g, [side * width / 2, 2.61, .02], [.105, 3.14, .57], C.wood); box(g, [side * width / 2, 2.65, .325], [.055, 3.22, .04], C.honey) }
  for (let row = 0; row < 5; row++) {
    const y = 1.15 + row * .72
    box(g, [0, y, .02], [width + .12, .095, .66], C.wood)
    box(g, [0, y + .025, .365], [width + .13, .035, .04], C.honey, .007)
    if (row === 4) continue
    let x = -width / 2 + .13
    let i = 0
    while (x < width / 2 - .13) {
      const w = .105 + rand() * .072, h = .4 + rand() * .19
      book(g, [x, y + .05, .05], w, h, .32 + rand() * .06, bookColors[(i + row * 3) % bookColors.length], i === 6 ? -.12 : (rand() - .5) * .06)
      x += w + .026; i++
    }
  }
  box(g, [0, 4.14, .02], [width + .25, .14, .73], C.honey)
  box(g, [0, 4.23, .015], [width + .15, .05, .64], C.edge)
  return g
}
function archShape(width: number, bottom: number, spring: number) {
  const shape = new T.Shape(), r = width / 2
  shape.moveTo(-r, bottom); shape.lineTo(r, bottom); shape.lineTo(r, spring); shape.absarc(0, spring, r, 0, Math.PI, false); shape.lineTo(-r, bottom); shape.closePath(); return shape
}
function archBand(parent: T.Group, width: number, bottom: number, spring: number, thickness: number, depth: number, z: number, c: string) {
  const shape = archShape(width + thickness * 2, bottom - thickness, spring)
  const inside = archShape(width, bottom, spring); const hole = new T.Path(inside.getPoints(48)); shape.holes.push(hole)
  const geom = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: .013, bevelThickness: .013, curveSegments: 40 })
  parent.add(mesh(geom, c, [0, 0, z]))
}
// Pierced panel legs: a real quatrefoil opening, matching the reference joinery.
function qinPanel(parent: T.Group, x: number, height: number, depth: number, thickness: number) {
  const outline = new T.Shape(); outline.moveTo(-depth / 2, 0); outline.lineTo(depth / 2, 0); outline.lineTo(depth / 2, height - .035)
  outline.quadraticCurveTo(depth / 2, height, depth / 2 - .035, height); outline.lineTo(-depth / 2 + .035, height)
  outline.quadraticCurveTo(-depth / 2, height, -depth / 2, height - .035); outline.closePath()
  const hole = new T.Path(), cy = height * .48, r = Math.min(depth * .32, height * .23)
  for (let i = 0; i <= 96; i++) {
    const a = -i * Math.PI * 2 / 96, radius = r * (1 + .22 * Math.cos(a * 4)), u = Math.cos(a) * radius, v = cy + Math.sin(a) * radius * 1.23
    if (i === 0) hole.moveTo(u, v); else hole.lineTo(u, v)
  }
  hole.closePath(); outline.holes.push(hole)
  const g = new T.ExtrudeGeometry(outline, { depth: thickness, bevelEnabled: true, bevelSize: .014, bevelThickness: .014, bevelSegments: 2, curveSegments: 48, steps: 1 })
  parent.add(mesh(g, C.wood, [x - thickness / 2, 0, 0], [1, 1, 1], [0, Math.PI / 2, 0]))
  box(parent, [x, .037, 0], [thickness + .045, .074, depth + .06], C.edge, .022)
  // Quiet vertical grain on the unpierced edges of each solid side panel.
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
    const z = side * (depth * .38 + i * .014)
    rod(parent, [x + thickness / 2 + .018, .1, z], [x + thickness / 2 + .018, height - .07, z + .006], .0023, C.honey)
  }
}
function makeGuqin(parent: T.Group) {
  const roomCorner = at(parent, QIN_POSITION, QIN_ROTATION), table = at(roomCorner, [0, 0, 0]), bench = at(roomCorner, [0, 0, QIN_BENCH.offset])
  roomCorner.name = 'guqin-corner'; table.name = 'guqin-table'; bench.name = 'guqin-bench'
  const w = QIN_TABLE.width, d = QIN_TABLE.depth, h = QIN_TABLE.height
  box(table, [0, h, 0], [w, .12, d], C.honey, .055)
  box(table, [0, h - .07, 0], [w - .09, .035, d - .05], C.edge, .012)
  for (const side of [-1, 1]) {
    qinPanel(table, side * (w / 2 - .1), h - .06, d - .075, .13)
    box(table, [side * (w / 2 - .19), h - .16, .19], [.18, .22, .1], C.wood, .018, [0, 0, side * -.6])
  }
  box(table, [0, h - .14, .235], [w - .2, .17, .065], C.wood, .012)
  for (let i = 0; i < 7; i++) rod(table, [-w / 2 + .1, h + .061, -.27 + i * .088], [w / 2 - .1, h + .061, -.265 + i * .088], .0022, '#cab69b')
  // A muted silk runner with a short drape at the table's right end.
  box(table, [0, h + .066, 0], [w + .018, .009, .4], '#aaa7ce', .004)
  box(table, [w / 2 + .007, h - .06, 0], [.012, .25, .4], '#9599c0', .004)
  for (const z of [-.187, .187]) rod(table, [-w / 2, h + .073, z], [w / 2, h + .073, z], .004, '#dfd6b7')
  for (const x of [-.7, .71]) box(table, [x, h + .086, 0], [.07, .024, .27], '#79695b', .005)
  const instrument = at(roomCorner, [0, h + .106, 0]); instrument.name = 'seven-string-guqin'
  const body = new T.Shape()
  body.moveTo(-.96, -.155); body.quadraticCurveTo(-.99, 0, -.96, .155)
  body.bezierCurveTo(-.87, .17, -.68, .19, -.55, .17); body.bezierCurveTo(-.38, .125, -.24, .125, -.08, .14)
  body.bezierCurveTo(.33, .16, .69, .13, .91, .105); body.quadraticCurveTo(.96, 0, .91, -.105)
  body.bezierCurveTo(.69, -.13, .33, -.16, -.08, -.14); body.bezierCurveTo(-.24, -.125, -.38, -.125, -.55, -.17)
  body.bezierCurveTo(-.68, -.19, -.87, -.17, -.96, -.155); body.closePath()
  const bodyGeometry = new T.ExtrudeGeometry(body, { depth: .069, bevelEnabled: true, bevelSize: .009, bevelThickness: .009, bevelSegments: 2, steps: 1, curveSegments: 28 })
  instrument.add(mesh(bodyGeometry, '#392d2b', [0, 0, 0], [1, 1, 1], [-Math.PI / 2, 0, 0]))
  box(instrument, [-.875, .082, 0], [.033, .034, .305], '#805746', .006)
  box(instrument, [.865, .079, 0], [.024, .021, .218], '#4e3930', .004)
  // Seven strings, a low curved lacquer body, and thirteen ivory hui markers.
  for (let i = 0; i < 7; i++) {
    const z = (i - 3) * .033
    const string = rod(instrument, [-.878, .105, z], [.868, .095, z * .77], .0018, '#d2c4a0')
    string.name = `qin-string-${i + 1}`
    cylinder(instrument, [-.9, -.025, z], .009, .007, .046, '#85634c', 8)
  }
  const hui = [1 / 8, 1 / 6, 1 / 5, 1 / 4, 1 / 3, 2 / 5, 1 / 2, 3 / 5, 2 / 3, 3 / 4, 4 / 5, 5 / 6, 7 / 8]
  hui.forEach((fraction, i) => ball(instrument, [-.86 + fraction * 1.72, .083, -.14], [i === 6 ? .011 : .0075, .0035, i === 6 ? .011 : .0075], '#e3d9b8'))
  // A silk tassel at the head, resting below the edge rather than adding a harp bridge.
  for (let i = 0; i < 5; i++) rod(instrument, [-.91, .045, .09 + i * .004], [-.98 + i * .005, -.12, .11 + i * .003], .003, '#a77a50')
  box(bench, [0, QIN_BENCH.height, 0], [QIN_BENCH.width, .105, QIN_BENCH.depth], C.honey, .045)
  for (const side of [-1, 1]) qinPanel(bench, side * (QIN_BENCH.width / 2 - .09), QIN_BENCH.height - .04, QIN_BENCH.depth - .035, .12)
  box(bench, [0, QIN_BENCH.height + .075, -.005], [QIN_BENCH.width - .1, .07, QIN_BENCH.depth - .03], '#c2bbd6', .048)
  for (let i = 0; i < 12; i++) rod(bench, [-.45 + i * .08, QIN_BENCH.height + .112, -.18], [-.45 + i * .08, QIN_BENCH.height + .112, .17], .0015, '#aaa0c2')
  batch(table); batch(bench); batch(instrument)
  instrument.traverse(obj => { obj.userData.action = 'qin' })
  return { group: roomCorner, table, bench, instrument }
}
export type WindowBay = { group: T.Group; width: number; bottom: number; spring: number; phi: number }
export type RoomModel = { group: T.Group; windows: WindowBay[]; architecture: { group: T.Group; phi: number; wallHeight: number; materials: T.MeshToonMaterial[] }[]; desk: T.Group; chair: T.Group; study: T.Group; wand: T.Group; sidecase: T.Group; frontFlowers: T.Group; qin: ReturnType<typeof makeGuqin>; lamp: T.Mesh; lampLight: T.SpotLight; book: T.Group; tea: T.Vector3; targets: T.Object3D[]; dispose: () => void }
export function buildRoom(): RoomModel {
  seed = 27
  const root = new T.Group(), decor = new T.Group(); root.add(decor)
  const windows: WindowBay[] = [], architecture: RoomModel['architecture'] = []
  // Round, layered stone foundation and individually clipped limestone tiles.
  cylinder(decor, [0, -.24, 0], 4.03, 3.97, .36, '#697394', 128)
  cylinder(decor, [0, -.074, 0], 4.065, 4.065, .08, '#b3accf', 128)
  cylinder(decor, [0, -.025, 0], 3.96, 3.96, .08, '#8c93b6', 128)
  torus(decor, [0, -.25, 0], 4.01, .018, '#586489', [Math.PI / 2, 0, 0])
  for (let row = -5; row <= 5; row++) for (let col = -5; col <= 5; col++) {
    const x = col * .81 + (row % 2) * .405, z = row * .76
    // Clip rectangles against a regular polygon of the circular floor.
    let points = [[x - .394, z - .369], [x + .394, z - .369], [x + .394, z + .369], [x - .394, z + .369]]
    for (let k = 0; k < 80 && points.length; k++) {
      const a = k * Math.PI / 40, nx = Math.cos(a), nz = Math.sin(a), output: number[][] = []
      for (let i = 0; i < points.length; i++) {
        const p = points[i], q = points[(i + 1) % points.length], dp = p[0] * nx + p[1] * nz - 3.91, dq = q[0] * nx + q[1] * nz - 3.91
        if (dp <= 0) output.push(p)
        if ((dp <= 0) !== (dq <= 0)) { const t = dp / (dp - dq); output.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]) }
      }
      points = output
    }
    if (points.length < 3) continue
    const shape = new T.Shape(points.map(p => new T.Vector2(p[0], -p[1])))
    const geom = new T.ExtrudeGeometry(shape, { depth: .024, bevelEnabled: true, bevelSize: .009, bevelThickness: .007, bevelSegments: 1, steps: 1 })
    decor.add(mesh(geom, ['#c8cee5', '#d6d3e9', '#bfc9df', '#ddd9ec'][Math.floor(rand() * 4)], [0, .008, 0], [1, 1, 1], [-Math.PI / 2, 0, 0]))
  }
  // Five facets form a continuous half-round room: window, bookcase, window, bookcase, window.
  for (let bay = -2; bay <= 2; bay++) {
    const phi = bay * Math.PI / 5.8, radius = 3.49, g = at(root, [Math.sin(phi) * radius, 0, -Math.cos(phi) * radius], -phi)
    const w = 1.965, h = bay === 0 ? 5.14 : Math.abs(bay) === 1 ? 4.92 : 4.57
    const wall = new T.Shape(); wall.moveTo(-w / 2, 0); wall.lineTo(w / 2, 0); wall.lineTo(w / 2, h - .09); wall.quadraticCurveTo(0, h + .03, -w / 2, h - .09); wall.closePath()
    if (bay % 2 === 0) {
      const ww = bay === 0 ? 1.68 : 1.51, spring = bay === 0 ? 3.91 : 3.38, bottom = 1.19
      const hole = new T.Path(archShape(ww, bottom, spring).getPoints(48)); wall.holes.push(hole)
      archBand(g, ww, bottom, spring, .14, .12, .09, C.cream)
      archBand(g, ww + .3, bottom - .14, spring, .045, .035, .075, '#9298bc')
      archBand(g, ww - .085, bottom + .035, spring, .035, .045, .115, C.honey)
      const totalH = spring + ww / 2 - bottom
      box(g, [0, bottom + totalH / 2, .16], [.055, totalH, .065], '#b9afce', .005)
      box(g, [0, 2.24, .16], [ww, .06, .065], '#b9afce', .005)
      if (bay === 0) for (const side of [-1, 1]) rod(g, [side * ww / 2, 2.27, .16], [0, 2.96, .16], .026, '#b9afce')
      box(g, [0, bottom - .04, .2], [ww + .34, .13, .48], C.cream)
      cabinet(g, w - .14)
      flowers(g, [bay === 0 ? .06 : -.32, 1.105, .22], bay === 0 ? 1.22 : .69, bay === -2 ? '#c3b6ce' : '#e3aba0', bay === 0 ? 42 : 24)
      if (bay !== 0) bookStack(g, [.47, 1.12, .13], 3, .75)
      windows.push({ group: g, width: ww, bottom, spring, phi })
    } else {
      shelf(g, [0, 0, .24], 0, 1.49)
      flowers(g, [bay < 0 ? -.36 : .3, 4.32, .26], .76, bay < 0 ? '#b9b5d0' : '#dda8b1', 28)
      vine(g, [bay < 0 ? -.5 : .59, 4.53, .44], bay < 0 ? 1.57 : 1.22, bay < 0)
    }
    const geo = new T.ExtrudeGeometry(wall, { depth: .2, bevelEnabled: true, bevelSegments: 1, bevelSize: .015, bevelThickness: .015, curveSegments: 40 })
    g.add(mesh(geo, C.wall, [0, 0, -.15]))
    box(g, [0, .16, .14], [w, .23, .18], '#818eb4')
    box(g, [0, h - .065, .025], [w + .07, .125, .32], C.cream)
    for (const side of [-1, 1]) {
      box(g, [side * (w / 2 - .028), h / 2, .05], [.075, h, .22], '#b9bcdb')
      box(g, [side * (w / 2 - .028), .29, .11], [.13, .39, .27], '#919bbd')
    }
    batch(g)
    const own: T.MeshToonMaterial[] = []
    g.traverse(obj => { if (obj instanceof T.Mesh && obj.material instanceof T.MeshToonMaterial) { obj.material = obj.material.clone(); own.push(obj.material) } })
    architecture.push({ group: g, phi, wallHeight: h, materials: own })
  }
  // Antique partner's desk. The writing edge is +Z; the window is directly -Z.
  const study = at(root, [0, 0, STUDY_SHIFT_Z]); study.name = 'window-writing-area'
  const desk = at(study, [0, 0, -.24]); desk.name = 'writing-desk'
  box(desk, [0, 1.47, 0], [2.62, .13, 1.45], C.honey, .055)
  box(desk, [0, 1.395, 0], [2.51, .075, 1.34], C.edge, .025)
  box(desk, [0, 1.3, -.57], [2.27, .23, .09], C.wood)
  for (const x of [-1.08, 1.08]) {
    box(desk, [x, 1.29, 0], [.1, .28, 1.18], C.wood)
    for (const z of [-.52, .52]) {
      box(desk, [x, 1.14, z], [.17, .37, .17], C.wood)
      cylinder(desk, [x, .84, z], .074, .055, .35, C.wood)
      ball(desk, [x, .67, z], [.094, .115, .094], C.honey)
      cylinder(desk, [x, .39, z], .06, .043, .42, C.wood)
      ball(desk, [x, .13, z], [.067, .085, .067], C.edge)
      for (const y of [.19, .6, .79, .99]) cylinder(desk, [x, y, z], .073, .073, .028, C.honey)
    }
    rod(desk, [x, .33, -.52], [x, .33, .52], .035, C.wood)
  }
  for (const x of [-.78, 0, .78]) {
    panel(desk, [x, 1.25, .59], .7, .24)
    torus(desk, [x, 1.25, .663], .041, .01, C.brass)
    ball(desk, [x, 1.275, .67], [.018, .018, .018], C.brass)
  }
  // Subtle handcrafted grain on the desk, with no photo textures.
  for (let i = 0; i < 15; i++) {
    const z = -.64 + i * .091
    for (let j = 0; j < 3; j++) {
      const x = -1.18 + j * .8
      rod(desk, [x, 1.537, z], [x + .51 + rand() * .19, 1.537, z + (rand() - .5) * .012], .0022, i % 3 ? '#baa38a' : '#e0cfb5')
    }
  }
  box(desk, [.02, 1.548, .13], [1.23, .018, .84], '#717fab', .055)
  box(desk, [.02, 1.56, .13], [1.15, .006, .76], '#9297c2', .035)
  const openBook = at(study, [.02, 1.565, -.06], -.08)
  for (const side of [-1, 1]) {
    const pg = at(openBook, [side * .23, .018, 0]); pg.rotation.z = side * -.09
    box(pg, [0, 0, 0], [.47, .045, .57], '#96785b', .014)
    box(pg, [0, .032, 0], [.44, .045, .54], '#f1e2bf', .012)
    for (let line = 0; line < 8; line++) box(pg, [0, .058, -.2 + line * .049], [.31 - (line % 3) * .027, .002, .007], '#b5aa8d', 0)
  }
  box(openBook, [.16, .078, .02], [.034, .006, .6], '#b7705b', 0)
  bookStack(desk, [-.86, 1.545, -.21], 3, .75)
  flowers(desk, [1.02, 1.54, -.46], .38, '#e3a49a', 16)
  cylinder(desk, [.8, 1.58, .36], .19, .19, .03, '#d4c5a2')
  cylinder(desk, [.8, 1.67, .36], .1, .073, .15, '#e7d7b6')
  cylinder(desk, [.8, 1.751, .36], .082, .082, .006, '#6c4833')
  torus(desk, [.913, 1.678, .36], .058, .016, '#e7d7b6')
  cylinder(desk, [.55, 1.607, -.35], .066, .082, .12, '#4d635d')
  rod(desk, [.55, 1.66, -.35], [.7, 2.03, -.38], .012, C.brass)
  ball(desk, [.676, 1.97, -.38], [.043, .16, .012], '#f1e3c7', [0, 0, -.35])
  // A carved walnut wand rests beside the writing mat, clear of the tea cup.
  const wand = at(study, [1.12, 1.575, -.18], -.08); wand.name = 'desk-wand'
  wand.add(mesh(new T.CylinderGeometry(.009, .026, .64, 10), '#765a69', [0, 0, -.035], [1, 1, 1], [-Math.PI / 2, 0, 0]))
  wand.add(mesh(new T.CylinderGeometry(.029, .032, .2, 10), '#4b3d55', [0, 0, .25], [1, 1, 1], [-Math.PI / 2, 0, 0]))
  for (const z of [.16, .19, .28, .32, .35]) torus(wand, [0, 0, z], .031, .004, '#dcc48e')
  for (let i = 0; i < 18; i++) {
    const a = i * .6, b = (i + 1) * .6, z = .12 - i * .018
    rod(wand, [Math.cos(a) * .021, Math.sin(a) * .021, z], [Math.cos(b) * .021, Math.sin(b) * .021, z - .018], .0025, '#cbb580')
  }
  wand.add(mesh(new T.OctahedronGeometry(.035), '#b9a3dd', [0, 0, .385], [1, .8, 1.3]))
  const wandTip = mesh(new T.OctahedronGeometry(.018), '#f3e0b6', [0, 0, -.368], [.8, .8, 1.6]); wand.add(wandTip)
  for (const z of [-.16, .32]) box(desk, [1.12, 1.548, z], [.095, .024, .07], '#c5b4d8', .012)
  // Lavender library lamp with a brass gooseneck, with an independent clickable shade.
  cylinder(desk, [-.97, 1.56, .38], .19, .2, .05, '#716947')
  rod(desk, [-.97, 1.59, .38], [-.97, 2.13, .38], .019, C.brass)
  rod(desk, [-.97, 2.13, .38], [-.72, 2.24, .38], .02, C.brass)
  const lamp = mesh(new T.CylinderGeometry(.12, .28, .18, 32, 1, true), '#6b6caa', [-.71, 2.16, .14]); study.add(lamp)
  lamp.material = new T.MeshToonMaterial({ color: '#797bb8', side: T.DoubleSide, gradientMap: ramp }); lamp.userData.action = 'lamp'
  const bulb = mesh(new T.SphereGeometry(.058, 12, 8), '#f5d395', [-.71, 2.08, .14]); study.add(bulb)
  const lampLight = new T.SpotLight('#ffce83', 0, 5, .95, .8, 2); lampLight.position.set(-.71, 2.045, .14); lampLight.target.position.set(-.25, .6, .15); lampLight.castShadow = true; lampLight.shadow.mapSize.set(1024, 1024); lampLight.shadow.normalBias = .012; lampLight.shadow.bias = -.0001; study.add(lampLight, lampLight.target)
  // Solid timber Windsor chair, its spindle back behind the sitter (+Z).
  const chair = at(study, [0, 0, 1.16]); chair.name = 'writing-chair'
  box(chair, [0, .73, 0], [.88, .13, .79], C.wood, .1)
  box(chair, [0, .795, -.018], [.73, .025, .65], C.honey, .09)
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    rod(chair, [x * .32, .69, z * .28], [x * .42, .095, z * .37], .041, C.wood)
    ball(chair, [x * .395, .19, z * .35], [.052, .07, .052], C.honey)
  }
  for (const x of [-1, 1]) rod(chair, [x * .38, .31, -.34], [x * .38, .31, .34], .026, C.edge)
  rod(chair, [-.38, .31, 0], [.38, .31, 0], .026, C.edge)
  for (const x of [-.36, .36]) { rod(chair, [x, .74, .3], [x * 1.14, 1.71, .41], .043, C.wood); ball(chair, [x * 1.14, 1.72, .41], [.057, .057, .057], C.honey) }
  for (let i = -2; i <= 2; i++) { rod(chair, [i * .115, .79, .32], [i * .135, 1.65, .415], .021, C.honey); ball(chair, [i * .125, 1.18, .36], [.029, .08, .029], C.wood) }
  box(chair, [0, 1.66, .416], [.9, .19, .105], C.wood, .065)
  box(chair, [0, 1.678, .479], [.68, .09, .025], C.honey, .025)
  // Botanical foreground, a little side stool, and books put down in the light.
  flowers(decor, [2.4, .07, 2.12], 1.18, '#e4b4a6', 38)
  flowers(decor, [-3.35, .08, .19], .72, '#e8c3a1', 25)
  const stool = at(decor, [-2.4, 0, .27], .16)
  cylinder(stool, [0, .65, 0], .4, .4, .09, C.wood)
  for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; rod(stool, [Math.cos(a) * .27, .62, Math.sin(a) * .27], [Math.cos(a) * .34, .08, Math.sin(a) * .34], .038, C.wood) }
  bookStack(stool, [0, .71, 0], 2, .85)
  bookStack(decor, [1.45, .065, 2.46], 3, .95)
  // A low side bookshelf extends the enclosure without obscuring the writing desk.
  const sidecase = at(root, SIDECASE_POSITION, SIDECASE_ROTATION); sidecase.name = 'wall-side-cabinet'
  box(sidecase, [0, .57, -.18], [1.35, 1.04, .08], C.wood)
  for (const side of [-1, 1]) box(sidecase, [side * .7, .59, 0], [.09, 1.16, .61], C.wood)
  for (const y of [.07, .6, 1.18]) box(sidecase, [0, y, .015], [1.51, .09, .69], C.honey)
  for (let row = 0; row < 2; row++) for (let i = 0; i < 8; i++) book(sidecase, [-.57 + i * .16, .12 + row * .53, .04], .12, .33 + (i % 3) * .035, .33, bookColors[(i + row) % 8], (i % 3 - 1) * .03)
  flowers(sidecase, [.36, 1.23, .02], .73, '#dfa7ad', 23)
  bookStack(sidecase, [-.42, 1.23, .04], 2, .78)
  const flowerAnchor = new T.Vector3(.65, .03, 1.1).applyAxisAngle(new T.Vector3(0, 1, 0), SIDECASE_ROTATION).add(new T.Vector3(...SIDECASE_POSITION))
  const frontFlowers = flowers(root, flowerAnchor.toArray() as V, .8, '#b6c0c3', 27); frontFlowers.name = 'flowers-in-front-of-cabinet'
  const qin = makeGuqin(root)
  batch(decor); batch(desk); batch(chair); batch(openBook); batch(sidecase); batch(frontFlowers); batch(wand)
  // A slightly wider invisible target makes the slim wand usable on touch screens.
  const wandHit = new T.Mesh(new T.BoxGeometry(.17, .16, .91), new T.MeshBasicMaterial({ visible: false })); wand.add(wandHit)
  wand.traverse(obj => { obj.userData.action = 'wand' })
  openBook.userData.action = 'book'; openBook.traverse(obj => { obj.userData.action = 'book' })
  root.updateMatrixWorld(true)
  return {
    group: root, windows, architecture, desk, chair, study, wand, sidecase, frontFlowers, qin, lamp, lampLight, book: openBook, tea: new T.Vector3(.8, 1.95, .12 + STUDY_SHIFT_Z), targets: [lamp, openBook, qin.instrument, wand],
    dispose() {
      root.traverse(obj => { if (obj instanceof T.Mesh) { obj.geometry.dispose(); if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose()); else obj.material.dispose() } })
      materials.clear(); ramp.dispose()
    },
  }
}
