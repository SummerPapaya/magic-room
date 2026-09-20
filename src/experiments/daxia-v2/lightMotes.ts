import * as T from 'three'
import type { WindowBay } from './model'
import type { environmentState } from './environment'

/** Golden specks carried through the real window apertures along the solar rays. */
export function createLightMotes(windows: WindowBay[], lampPosition: T.Vector3) {
  const perWindow = 54, lampCount = 28, count = windows.length * perWindow + lampCount
  const positions = new Float32Array(count * 3), brightness = new Float32Array(count), seeds = new Float32Array(count)
  for (let i = 0; i < count; i++) seeds[i] = ((i * 173 + 47) % 997) / 997
  const geometry = new T.BufferGeometry()
  geometry.setAttribute('position', new T.BufferAttribute(positions, 3))
  geometry.setAttribute('glow', new T.BufferAttribute(brightness, 1))
  geometry.setAttribute('seed', new T.BufferAttribute(seeds, 1))
  const material = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending,
    uniforms: { viewportHeight: { value: 980 } },
    vertexShader: `attribute float glow; attribute float seed; uniform float viewportHeight;
      varying float vGlow; varying float vSeed;
      void main(){vGlow=glow;vSeed=seed;vec4 p=modelViewMatrix*vec4(position,1.);
        gl_Position=projectionMatrix*p;gl_PointSize=clamp(viewportHeight*(.075+seed*.045)/-p.z,3.,19.);}`,
    fragmentShader: `varying float vGlow;varying float vSeed;
      void main(){vec2 p=(gl_PointCoord-.5)*2.;float r=length(p);if(r>1.||vGlow<.002)discard;
        float core=1.-smoothstep(0.,.2,r);float halo=pow(1.-r,2.4)*.48;
        float sparkle=vSeed>.86?pow(max(0.,1.-min(abs(p.x),abs(p.y))*17.),3.)*pow(1.-r,2.)*.35:0.;
        gl_FragColor=vec4(mix(vec3(1.,.73,.35),vec3(1.,.94,.77),core),vGlow*(core+halo+sparkle));}`,
  })
  const points = new T.Points(geometry, material); points.frustumCulled = false; points.name = 'glowing-window-motes'
  const ray = new T.Vector3(), entry = new T.Vector3(), inward = new T.Vector3(), p = new T.Vector3()
  return {
    points,
    resize(height: number) { material.uniforms.viewportHeight.value = height },
    update(time: number, env: ReturnType<typeof environmentState>, reduced: boolean, enabled: boolean, lamp: boolean) {
      points.visible = enabled
      if (!enabled) return
      const t = reduced ? 0 : time
      ray.set(...env.direction).negate()
      const daylightGlow = Math.min(1, env.direct * .55) + env.daylight * (1 - env.coverage) * .045
      windows.forEach((bay, windowIndex) => {
        inward.set(-Math.sin(bay.phi), 0, Math.cos(bay.phi))
        const incidence = Math.max(0, inward.dot(ray)), radius = bay.width / 2
        for (let j = 0; j < perWindow; j++) {
          const i = windowIndex * perWindow + j, seed = seeds[i]
          let x = (seed * 2 - 1) * (radius - .15)
          if (Math.abs(x) < .065) x += .13
          const top = bay.spring + Math.sqrt(Math.max(0, radius * radius - x * x)) - .2
          let y = T.MathUtils.lerp(bay.bottom + .25, top, ((j * 37 + 13) % 101) / 101)
          if (Math.abs(y - 2.24) < .065) y += .13
          entry.set(x, y, .23).applyMatrix4(bay.group.matrixWorld)
          // Clip every ray to the interior floor and circular enclosure.
          const a = ray.x * ray.x + ray.z * ray.z, b = entry.x * ray.x + entry.z * ray.z
          const c = entry.x * entry.x + entry.z * entry.z - 3.68 ** 2
          const exit = a > .0001 ? (-b + Math.sqrt(Math.max(0, b * b - a * c))) / a : 5
          const distance = Math.max(0, Math.min(3.7, exit, (entry.y - .4) / Math.max(.001, -ray.y)))
          const phase = (seed + t * (.016 + seed * .008)) % 1
          p.copy(entry).addScaledVector(ray, distance * phase)
          p.x += Math.sin(t * .31 + j * 2.4) * .024; p.y += Math.sin(t * .24 + j) * .018
          positions.set(p.toArray(), i * 3)
          brightness[i] = daylightGlow * Math.sqrt(incidence) * Math.sin(phase * Math.PI) * (.65 + .35 * Math.sin(t * .7 + j) ** 2)
        }
      })
      for (let j = 0; j < lampCount; j++) {
        const i = windows.length * perWindow + j, seed = seeds[i], phase = (seed + t * .024) % 1, angle = j * 2.4 + t * .1
        const radius = .06 + phase * .32
        positions.set([lampPosition.x + Math.cos(angle) * radius, lampPosition.y - .17 - phase * .47, lampPosition.z + Math.sin(angle) * radius], i * 3)
        brightness[i] = lamp ? Math.sin(phase * Math.PI) * .6 : 0
      }
      geometry.attributes.position.needsUpdate = true; geometry.attributes.glow.needsUpdate = true
    },
    dispose() { points.removeFromParent(); geometry.dispose(); material.dispose() },
  }
}
