import * as T from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

/** Small, explicitly magical objects have their own local light, never sunlight. */
export function createMagic() {
  const group = new T.Group(); group.name = 'quiet-magic'
  const ink = new T.MeshToonMaterial({ color: '#646595' })
  const paper = new T.MeshToonMaterial({ color: '#e4dbef' })
  const gold = new T.MeshBasicMaterial({ color: '#d6bc84' })
  const luminous = new T.MeshBasicMaterial({ color: '#bbcaff', transparent: true, opacity: .8 })
  const stroke = new T.LineBasicMaterial({ color: '#d7c6a0', transparent: true, opacity: .65 })
  const box = (parent: T.Group, p: number[], size: [number, number, number], material: T.Material) => {
    const mesh = new T.Mesh(new RoundedBoxGeometry(...size, 1, .008), material)
    mesh.position.set(p[0], p[1], p[2]); mesh.castShadow = true; parent.add(mesh); return mesh
  }
  const ring = (parent: T.Group, radius: number, rotation: [number, number, number], material: T.Material = gold) => {
    const mesh = new T.Mesh(new T.TorusGeometry(radius, .008, 5, 64), material)
    mesh.rotation.set(...rotation); parent.add(mesh); return mesh
  }
  const line = (parent: T.Group, positions: T.Vector3[]) => {
    const mesh = new T.Line(new T.BufferGeometry().setFromPoints(positions), stroke); parent.add(mesh)
  }
  const grimoire = new T.Group(); grimoire.position.set(1.33, 2.58, -1.6); grimoire.rotation.set(.12, -.35, -.08); group.add(grimoire)
  for (const side of [-1, 1]) {
    const leaf = new T.Group(); leaf.position.x = side * .19; leaf.rotation.z = side * -.15; grimoire.add(leaf)
    box(leaf, [0, 0, 0], [.39, .045, .53], ink)
    box(leaf, [0, .035, 0], [.36, .03, .5], paper)
    for (let i = 0; i < 5; i++) box(leaf, [0, .053, -.04 + i * .055], [.21 - (i % 2) * .045, .002, .007], gold)
    const glyph = ring(leaf, .049, [Math.PI / 2, 0, 0]); glyph.position.set(0, .053, -.15)
    box(leaf, [0, .055, -.15], [.006, .003, .13], gold)
  }
  const bookHalo = new T.Group(); bookHalo.position.y = -.22; grimoire.add(bookHalo)
  ring(bookHalo, .42, [Math.PI / 2, 0, 0]); ring(bookHalo, .46, [Math.PI / 2, 0, 0], luminous)
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4, mark = box(bookHalo, [Math.cos(a) * .44, 0, Math.sin(a) * .44], [.035, .006, .016], gold); mark.rotation.y = -a
  }
  const slips: T.Group[] = []
  for (let i = 0; i < 3; i++) {
    const slip = new T.Group(); slip.position.set(1.37 + i * .2, 2.98 + i * .24, -1.45 - i * .23)
    slip.rotation.set(.4, -.3 + i * .3, .14 + i * .1); group.add(slip); slips.push(slip)
    box(slip, [0, 0, 0], [.16, .009, .24], paper)
    for (let j = 0; j < 3; j++) box(slip, [0, .006, -.06 + j * .045], [.085, .002, .004], gold)
  }
  const armillary = new T.Group(); armillary.position.set(-1.18, 3.4, -2.35); group.add(armillary)
  ring(armillary, .29, [.6, .3, .25]); ring(armillary, .34, [-.4, .6, -.6]); ring(armillary, .26, [Math.PI / 2, 0, 0], luminous)
  const crystalMaterial = new T.MeshToonMaterial({ color: '#a1b5ec', emissive: '#8c9ded', emissiveIntensity: .55 })
  const crystal = new T.Mesh(new T.OctahedronGeometry(.16, 0), crystalMaterial); crystal.scale.y = 1.6; armillary.add(crystal)
  const orbitStar = new T.Mesh(new T.OctahedronGeometry(.037, 0), gold); orbitStar.position.set(.31, .1, .1); armillary.add(orbitStar)
  const constellation = [new T.Vector3(-.28, .1, 0), new T.Vector3(-.48, .34, -.06), new T.Vector3(-.3, .61, -.1), new T.Vector3(.03, .51, -.12)]
  line(armillary, constellation)
  constellation.forEach(p => { const star = new T.Mesh(new T.OctahedronGeometry(.025), luminous); star.position.copy(p); armillary.add(star) })
  const bookLight = new T.PointLight('#b4b8ff', .3, 1.4, 2); bookLight.position.y = .15; grimoire.add(bookLight)
  const orbLight = new T.PointLight('#92b8ff', .45, 1.6, 2); armillary.add(orbLight)
  grimoire.traverse(o => { o.userData.action = 'magic-book' }); armillary.traverse(o => { o.userData.action = 'magic-orb' })
  const count = 64, positions = new Float32Array(count * 3), geometry = new T.BufferGeometry()
  geometry.setAttribute('position', new T.BufferAttribute(positions, 3))
  const particlesMaterial = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending,
    uniforms: { opacity: { value: .6 } },
    vertexShader: 'void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(55./-p.z,2.,9.);}',
    fragmentShader: 'uniform float opacity;void main(){float r=length(gl_PointCoord-.5)*2.;float a=pow(max(0.,1.-r),2.);gl_FragColor=vec4(.77,.8,1.,a*opacity);}' })
  const motes = new T.Points(geometry, particlesMaterial); motes.frustumCulled = false; group.add(motes)
  const source = new T.Vector3(), destination = new T.Vector3(1.33, 2.6, -1.6)
  let burst = 0
  return {
    group, targets: [grimoire, armillary],
    pulse(from: T.Vector3) { if (!group.visible) return; source.copy(from); burst = 1 },
    update(time: number, delta: number, enabled: boolean, reduced: boolean) {
      group.visible = enabled
      if (!enabled) { burst = 0; return }
      const t = reduced ? 0 : time
      burst = reduced ? 0 : Math.max(0, burst - delta * .45)
      grimoire.position.y = 2.58 + Math.sin(t * .8) * .065
      grimoire.rotation.y = -.35 + Math.sin(t * .27) * .12
      bookHalo.rotation.y = t * .14; crystal.rotation.y = t * .3
      armillary.rotation.y = Math.sin(t * .3) * .24
      slips.forEach((s, i) => { s.position.y = 2.98 + i * .24 + Math.sin(t * .75 + i) * .04 })
      bookLight.intensity = .3 + burst * .45; orbLight.intensity = .45 + burst * .5
      for (let i = 0; i < count; i++) {
        const a = i * 2.399 + t * .17, radius = .2 + (i % 7) * .08
        if (burst > 0 && i < 40) {
          const progress = T.MathUtils.clamp((1 - burst) * 1.8 - i / 90, 0, 1)
          positions[i * 3] = T.MathUtils.lerp(source.x, destination.x, progress) + Math.sin(a) * .09 * Math.sin(progress * Math.PI)
          positions[i * 3 + 1] = T.MathUtils.lerp(source.y, destination.y, progress) + Math.sin(progress * Math.PI) * .72
          positions[i * 3 + 2] = T.MathUtils.lerp(source.z, destination.z, progress) + Math.cos(a) * .13 * Math.sin(progress * Math.PI)
        } else {
          positions[i * 3] = (i % 2 ? 1.33 : -1.18) + Math.cos(a) * radius
          positions[i * 3 + 1] = (i % 2 ? 2.6 : 3.4) + Math.sin(a * 1.3) * .35
          positions[i * 3 + 2] = (i % 2 ? -1.6 : -2.35) + Math.sin(a) * radius
        }
      }
      geometry.attributes.position.needsUpdate = true
    },
    dispose() {
      group.removeFromParent()
      const materials = new Set<T.Material>()
      group.traverse(o => { if (o instanceof T.Mesh || o instanceof T.Line || o instanceof T.Points) { o.geometry.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => materials.add(m)) } })
      materials.forEach(m => m.dispose())
    },
  }
}
