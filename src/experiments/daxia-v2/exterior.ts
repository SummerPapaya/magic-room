import * as T from 'three'
import type { WindowBay } from './model'
import { environmentState, weatherForSeason } from './environment'
import type { Season, Weather } from './environment'

type Environment = ReturnType<typeof environmentState>
const seasonOrder: Season[] = ['spring', 'summer', 'autumn', 'winter']
const seasonalColors = {
  spring: { hills: ['#c4d3c2', '#9db49c', '#93aa85'], leaves: ['#b6c697', '#f0c4cb', '#d9a9bc'], ground: '#9cab83' },
  summer: { hills: ['#bdcdd0', '#8daaa0', '#6f957e'], leaves: ['#70965e', '#92ae72', '#4c795c'], ground: '#7d9663' },
  autumn: { hills: ['#d9c9af', '#b7b092', '#a19a70'], leaves: ['#c5894e', '#d9aa57', '#b46a49'], ground: '#b6986b' },
  winter: { hills: ['#d1dbe1', '#bbcbd3', '#a6bdc9'], leaves: ['#e9eee8', '#d8e3e2', '#ccdada'], ground: '#dde6e1' },
}
/** Four equirectangular paintings of ONE continuous exterior. Neither sun nor moon
 * is baked into them. The shader samples world directions, never per-window UVs.
 */
function landscapeTexture(season: Season) {
  const canvas = document.createElement('canvas'); canvas.width = 2048; canvas.height = 1024
  const ctx = canvas.getContext('2d')!, w = canvas.width, h = canvas.height, colors = seasonalColors[season]
  let state = 701
  const random = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296 }
  for (let layer = 0; layer < 3; layer++) {
    const base = 539 + layer * 18
    ctx.fillStyle = colors.hills[layer]; ctx.beginPath(); ctx.moveTo(0, h)
    for (let x = 0; x <= w; x += 8) { const y = base - Math.sin(x * .007 + layer) * (9 + layer * 5) - Math.sin(x * .019 + layer * 2) * 5; ctx.lineTo(x, y) }
    ctx.lineTo(w, h); ctx.closePath(); ctx.fill()
  }
  // A single distant town, to the left of the central sunset line.
  ctx.fillStyle = season === 'winter' ? '#a2b7c2' : '#a4b1a4'
  ctx.fillRect(925, 492, 78, 33)
  for (const [x, top, width] of [[944, 457, 12], [968, 440, 13], [987, 470, 11]]) {
    ctx.fillRect(x, top, width, 75); ctx.beginPath(); ctx.moveTo(x - 3, top); ctx.lineTo(x + width / 2, top - 27); ctx.lineTo(x + width + 3, top); ctx.fill()
    ctx.strokeStyle = '#879da6'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + width / 2, top - 27); ctx.lineTo(x + width / 2, top - 39); ctx.stroke()
    ctx.fillStyle = '#dce0ce'; for (let i = 0; i < 3; i++) ctx.fillRect(x + width / 2 - 1, top + 10 + i * 14, 2, 6)
    ctx.fillStyle = season === 'winter' ? '#a2b7c2' : '#a4b1a4'
  }
  const tree = (x: number, base: number, height: number, size: number) => {
    ctx.strokeStyle = season === 'winter' ? '#84918f' : '#7c8268'; ctx.lineWidth = 4.4 * size; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(x, base); ctx.bezierCurveTo(x - 4, base - height * .35, x + 4, base - height * .67, x, base - height); ctx.stroke()
    const tips: [number, number][] = []
    for (let b = 0; b < 10; b++) {
      const side = b % 2 ? -1 : 1, y = base - height * (.25 + b * .058), endX = x + side * (16 + random() * 29) * size, endY = y - (18 + random() * 21) * size
      ctx.lineWidth = Math.max(.9, (3 - b * .19) * size); ctx.beginPath(); ctx.moveTo(x, y + 14); ctx.quadraticCurveTo(endX, y - 2, endX, endY); ctx.stroke(); tips.push([endX, endY])
      ctx.lineWidth = 1.1 * size; ctx.beginPath(); ctx.moveTo(endX - side * 7 * size, endY + 10 * size); ctx.lineTo(endX + side * 9 * size, endY - 9 * size); ctx.stroke()
    }
    if (season === 'winter') {
      ctx.strokeStyle = '#f0f3eb'; ctx.lineWidth = 3.5 * size
      tips.forEach(([tx, ty]) => { ctx.beginPath(); ctx.moveTo(tx - 10 * size, ty + 8 * size); ctx.quadraticCurveTo(tx - 1 * size, ty + 3 * size, tx + 6 * size, ty + 3 * size); ctx.stroke() })
    } else {
      tips.push([x, base - height])
      for (const [tx, ty] of tips) for (let b = 0; b < 15; b++) {
        const r = (6 + random() * 10) * size
        ctx.fillStyle = colors.leaves[Math.floor(random() * 3)]; ctx.beginPath(); ctx.ellipse(tx + (random() - .5) * 31 * size, ty + (random() - .5) * 27 * size, r, r * .73, random() * 3, 0, Math.PI * 2); ctx.fill()
      }
    }
  }
  for (const [x, base, height, size] of [[594, 583, 115, 1.25], [655, 559, 126, 1.04], [722, 577, 94, .9], [879, 551, 70, .62], [1096, 573, 127, 1.02], [1308, 573, 90, .88], [1370, 569, 140, 1.18], [1428, 589, 119, 1.1], [1501, 561, 101, .8]]) tree(x, base, height, size)
  // Low hedges, blossom drifts, autumn leaf litter or settled winter snow.
  for (let i = 0; i < 220; i++) {
    const x = random() * w, y = 578 + random() * 120
    ctx.fillStyle = season === 'winter' ? ['#f2f3eb', '#cbd9d6'][i % 2] : i % 4 === 0 && season === 'spring' ? '#e6b9c4' : colors.leaves[i % 3]
    ctx.beginPath(); ctx.ellipse(x, y, 2 + random() * 12, 1 + random() * 5, random(), 0, Math.PI * 2); ctx.fill()
  }
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace; texture.wrapS = T.RepeatWrapping; texture.anisotropy = 4
  return texture
}
function windowShape(bay: WindowBay) {
  const s = new T.Shape(), r = bay.width / 2
  s.moveTo(-r, bay.bottom); s.lineTo(r, bay.bottom); s.lineTo(r, bay.spring); s.absarc(0, bay.spring, r, 0, Math.PI, false); s.lineTo(-r, bay.bottom); s.closePath(); return s
}
function colorsFor(env: Environment, season: Season) {
  const daySky = season === 'winter' ? '#9dbccc' : season === 'summer' ? '#89bcc7' : '#adcad0'
  const upper = new T.Color('#152437').lerp(new T.Color(daySky), env.daylight)
  const lower = new T.Color('#34475b').lerp(new T.Color('#e1ddc1'), env.daylight)
  upper.lerp(new T.Color('#aa9daa'), env.goldenHour * .28 * (1 - env.coverage))
  lower.lerp(new T.Color('#ed9968'), env.goldenHour * .78 * (1 - env.coverage))
  upper.lerp(new T.Color('#c17d88'), env.sunsetGlow * .48)
  lower.lerp(new T.Color('#f07745'), env.sunsetGlow * .92)
  upper.lerp(new T.Color('#a0afb7').multiplyScalar(.2 + env.daylight * .8), env.coverage * .75)
  lower.lerp(new T.Color('#c7cfd0').multiplyScalar(.2 + env.daylight * .8), env.coverage * .78)
  const afternoonGold = T.MathUtils.smoothstep(env.phase, .58, .93) * env.daylight * (1 - env.coverage)
  const light = new T.Color('#ffecd0').lerp(new T.Color('#ffe0b4'), afternoonGold * .32).lerp(new T.Color('#ffb074'), env.warm)
  light.lerp(new T.Color('#ff713b'), env.sunsetGlow * .95)
  const daylightBounce = new T.Color('#f3ece1').lerp(upper.clone().lerp(lower, .65), .22 + env.coverage * .28)
  const ambient = new T.Color('#9cb2cb').lerp(daylightBounce, env.daylight)
  ambient.lerp(new T.Color('#ffab73'), env.sunsetGlow * .72)
  const center = new T.Color('#34354e').lerp(new T.Color('#eeecf8'), env.daylight)
  const edge = new T.Color('#252b46').lerp(new T.Color('#d9dff2'), env.daylight)
  center.lerp(new T.Color('#d5bedc'), env.sunsetGlow * .45)
  edge.lerp(new T.Color('#ac9fc6'), env.sunsetGlow * .24)
  center.lerp(new T.Color('#d4dcda').multiplyScalar(.35 + env.daylight * .65), env.coverage * .2)
  return { upper, lower, light, ambient, center, edge }
}
export function createExterior(windows: WindowBay[], initial: { season: Season; hour: number; weather: Weather }) {
  const textures = seasonOrder.map(landscapeTexture), initialEnv = environmentState(initial.hour, initial.season, initial.weather), firstColors = colorsFor(initialEnv, initial.season)
  const weights = new T.Vector4(...seasonOrder.map(s => s === initial.season ? 1 : 0) as [number, number, number, number])
  const uniforms = {
    upper: { value: firstColors.upper }, lower: { value: firstColors.lower }, sunColor: { value: firstColors.light }, sunDirection: { value: new T.Vector3(...initialEnv.direction) },
    sunVisible: { value: initialEnv.discVisibility }, sunlight: { value: initialEnv.transmission }, daylight: { value: initialEnv.daylight }, cloudCover: { value: initialEnv.coverage }, stars: { value: initialEnv.clearNight }, clock: { value: 0 },
    spring: { value: textures[0] }, summer: { value: textures[1] }, autumn: { value: textures[2] }, winter: { value: textures[3] }, seasonWeights: { value: weights },
  }
  const material = new T.ShaderMaterial({ side: T.DoubleSide, uniforms,
    vertexShader: `varying vec3 worldPoint; void main(){vec4 p=modelMatrix*vec4(position,1.);worldPoint=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
    fragmentShader: `
      varying vec3 worldPoint;
      uniform vec3 upper,lower,sunColor,sunDirection;
      uniform float sunVisible,sunlight,daylight,cloudCover,stars,clock;
      uniform sampler2D spring,summer,autumn,winter;
      uniform vec4 seasonWeights;
      const float PI=3.14159265359;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      void main(){
        // Shared room-eye projection preserves the same panorama across all three
        // windows in the cutaway view. No repeated per-pane sun, town or horizon.
        vec3 ray=normalize(worldPoint-vec3(0.,2.66,0.));
        vec2 uv=vec2(atan(ray.x,-ray.z)/(2.*PI)+.5,asin(clamp(ray.y,-1.,1.))/PI+.5);
        vec3 c=mix(lower,upper,smoothstep(-.02,.65,ray.y));
        float distanceToSun=acos(clamp(dot(ray,normalize(sunDirection)),-1.,1.));
        float disc=1.-smoothstep(.027,.033,distanceToSun);
        float horizon=smoothstep(-.004,.004,ray.y);
        float halo=exp(-distanceToSun*12.)*.25*sunVisible*sunlight*horizon;
        c+=sunColor*halo;
        c=mix(c,sunColor*1.6,disc*sunVisible*horizon*mix(.35,1.,sunlight));
        vec2 cloudUV=vec2(uv.x*24.+clock*.009,uv.y*29.);
        float n=noise(cloudUV)+.45*noise(cloudUV*2.1);
        float clouds=smoothstep(1.05-cloudCover*.54,1.28-cloudCover*.55,n)*smoothstep(-.02,.12,ray.y);
        c=mix(c,mix(lower,upper,.28)*(.93+daylight*.1),clouds*cloudCover*.83);
        vec2 starCell=floor(uv*vec2(600.,300.));
        float sparkle=(1.-smoothstep(.055,.16,length(fract(uv*vec2(600.,300.))-.5)))*step(.986,hash(starCell));
        c+=sparkle*stars*smoothstep(.05,.2,ray.y)*.7;
        vec4 landscape=texture2D(spring,uv)*seasonWeights.x+texture2D(summer,uv)*seasonWeights.y+texture2D(autumn,uv)*seasonWeights.z+texture2D(winter,uv)*seasonWeights.w;
        vec3 land=landscape.rgb*(.075+daylight*.87)*mix(vec3(1.),sunColor, .15*sunlight);
        c=mix(c,land,landscape.a);
        gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  })
  const meshes = windows.map(bay => { const m = new T.Mesh(new T.ShapeGeometry(windowShape(bay), 48), material); m.position.z = -.12; m.name = 'shared-exterior-window'; bay.group.add(m); return m })
  return { meshes,
    update(env: Environment, season: Season, time: number, factor: number) {
      const colors = colorsFor(env, season)
      uniforms.upper.value.lerp(colors.upper, factor); uniforms.lower.value.lerp(colors.lower, factor); uniforms.sunColor.value.copy(colors.light)
      uniforms.sunDirection.value.set(...env.direction); uniforms.sunVisible.value = env.discVisibility; uniforms.sunlight.value = env.transmission
      uniforms.daylight.value = env.daylight; uniforms.cloudCover.value = env.coverage; uniforms.stars.value = env.clearNight; uniforms.clock.value = time
      weights.lerp(new T.Vector4(...seasonOrder.map(s => s === season ? 1 : 0) as [number, number, number, number]), factor)
      return colors
    },
    dispose() { textures.forEach(t => t.dispose()); meshes.forEach(m => { m.removeFromParent(); m.geometry.dispose() }); material.dispose() },
  }
}
export function createWindowWeather(bay: WindowBay, index: number) {
  const count = 94, rain = new Float32Array(count * 6), particles = new Float32Array(count * 3)
  const seeds = Array.from({ length: count }, (_, i) => ({ x: ((Math.sin(i * 78.12 + index * 31) * 4573.3) % 1 + 1) % 1, y: (i * .6180339) % 1, speed: .7 + (i % 7) * .09 }))
  const rg = new T.BufferGeometry(); rg.setAttribute('position', new T.BufferAttribute(rain, 3)); const pg = new T.BufferGeometry(); pg.setAttribute('position', new T.BufferAttribute(particles, 3))
  const lines = new T.LineSegments(rg, new T.LineBasicMaterial({ color: '#d9e8e7', transparent: true, opacity: .5, depthWrite: false })); lines.position.z = .055; lines.frustumCulled = false
  const pm = new T.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { tint: { value: new T.Color('#fff9e9') }, opacity: { value: 1 }, size: { value: 4 }, kind: { value: 0 }, clock: { value: 0 } },
    vertexShader: `uniform float size; void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_PointSize=clamp(size*12./-p.z,1.5,10.);gl_Position=projectionMatrix*p;}`,
    fragmentShader: `uniform vec3 tint;uniform float opacity,kind,clock;void main(){vec2 p=gl_PointCoord-.5;float a=clock*.4; p=mat2(cos(a),-sin(a),sin(a),cos(a))*p;if(kind>1.5)p.y*=1.7;float d=length(p);if(d>.45)discard;gl_FragColor=vec4(tint,(1.-smoothstep(.25,.45,d))*opacity);\n#include <colorspace_fragment>\n}`,
  })
  const points = new T.Points(pg, pm); points.position.z = .06; points.frustumCulled = false; bay.group.add(lines, points)
  return { update(time: number, weather: Weather, season: Season, reduced: boolean, daylight: number, facing: boolean) {
    weather = weatherForSeason(weather, season)
    const seasonal = weather !== 'rain' && weather !== 'snow'
    lines.visible = facing && weather === 'rain'; points.visible = facing && weather !== 'rain' && (weather === 'snow' || season !== 'winter')
    if (!lines.visible && !points.visible) return
    lines.material.opacity = .14 + daylight * .4
    pm.uniforms.tint.value.set(weather === 'snow' ? '#f5f7ef' : season === 'spring' ? '#eeb8c8' : season === 'autumn' ? '#c28b4d' : '#e7dda0')
    pm.uniforms.opacity.value = .22 + daylight * .65; pm.uniforms.kind.value = weather === 'snow' ? 0 : season === 'summer' ? 1 : 2
    pm.uniforms.size.value = weather === 'snow' ? 3.6 : season === 'summer' ? 2 : 5; pm.uniforms.clock.value = reduced ? 0 : time
    const height = bay.spring + bay.width / 2 - bay.bottom, r = bay.width / 2, h = reduced ? 0 : time, amount = seasonal ? season === 'summer' ? 9 : 26 : count
    let written = 0
    for (let i = 0; i < amount; i++) {
      const seed = seeds[i], progress = (seed.y + h * seed.speed * (weather === 'rain' ? .65 : .075)) % 1
      const x = (seed.x - .5) * (bay.width - .09) + Math.sin(h * .55 + i) * (weather === 'rain' ? .008 : .025), y = bay.bottom + (1 - progress) * height
      const top = bay.spring + Math.sqrt(Math.max(0, (r - .03) ** 2 - x * x))
      if (y > top || Math.abs(x) > r - .02 || y < bay.bottom + .025) continue
      if (weather === 'rain') rain.set([x, y, 0, x - .012, Math.min(y + .1, top), 0], written * 6)
      else particles.set([x, y, 0], written * 3)
      written++
    }
    rg.setDrawRange(0, written * 2); pg.setDrawRange(0, written); rg.attributes.position.needsUpdate = true; pg.attributes.position.needsUpdate = true
  }, dispose() { lines.removeFromParent(); points.removeFromParent(); rg.dispose(); pg.dispose(); lines.material.dispose(); pm.dispose() } }
}
