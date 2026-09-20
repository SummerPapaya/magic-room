import * as T from 'three'

export const WAND_SPELLS = ['glitter', 'petals', 'snow', 'fireworks', 'maple'] as const
export type WandSpell = typeof WAND_SPELLS[number]

/** One flight owns one spell. Reversing a flight reuses the same bounded buffers. */
export function createWandMagic(wand: T.Group, random = Math.random) {
  const group = new T.Group(); group.name = 'wand-spell'; group.visible = false
  const home = wand.position.clone(), homeRotation = wand.quaternion.clone()
  const raised = home.clone().add(new T.Vector3(.13, 1.13, .35))
  const raisedRotation = new T.Quaternion().setFromEuler(new T.Euler(1.03, .27, -.32))
  const count = 720, fallingCount = 240, position = new Float32Array(count * 3)
  const color = new Float32Array(count * 3), alpha = new Float32Array(count), size = new Float32Array(count), angle = new Float32Array(count)
  const geometry = new T.BufferGeometry()
  geometry.setAttribute('position', new T.BufferAttribute(position, 3)); geometry.setAttribute('color', new T.BufferAttribute(color, 3))
  geometry.setAttribute('alpha', new T.BufferAttribute(alpha, 1)); geometry.setAttribute('size', new T.BufferAttribute(size, 1)); geometry.setAttribute('angle', new T.BufferAttribute(angle, 1))
  const material = new T.ShaderMaterial({ transparent: true, depthWrite: false, vertexColors: true,
    uniforms: { mode: { value: 0 }, viewport: { value: 980 }, strength: { value: 0 } },
    vertexShader: `attribute float alpha;attribute float size;attribute float angle;uniform float viewport;
      varying vec3 vColor;varying float vAlpha;varying float vAngle;
      void main(){vColor=color;vAlpha=alpha;vAngle=angle;vec4 p=modelViewMatrix*vec4(position,1.);
        gl_Position=projectionMatrix*p;gl_PointSize=clamp(viewport*size/-p.z,2.,34.);}`,
    fragmentShader: `uniform float mode;uniform float strength;varying vec3 vColor;varying float vAlpha;varying float vAngle;
      float leafLobe(vec2 p,vec2 tip,float width){vec2 base=vec2(0.,.29);vec2 d=tip-base;float len=length(d);d/=len;
        vec2 q=p-base;float y=dot(q,d)/len;float x=abs(q.x*d.y-q.y*d.x);
        float w=width*sin(clamp(y,0.,1.)*3.14159)*(.85+.15*cos(y*25.13));
        return (1.-smoothstep(w,w+.012,x))*step(0.,y)*step(y,1.);}
      void main(){vec2 p=(gl_PointCoord-.5)*2.;p=mat2(cos(vAngle),-sin(vAngle),sin(vAngle),cos(vAngle))*p;
        float r=length(p);float a=0.;vec3 c=vColor;
        if(mode<.5){float diamond=abs(p.x)+abs(p.y);float core=1.-smoothstep(.05,.27,diamond);
          float star=pow(max(0.,1.-min(abs(p.x),abs(p.y))*10.),2.)*pow(max(0.,1.-r),2.);
          a=core+star*.75+pow(max(0.,1.-r),3.)*.35;}
        else if(mode<1.5){vec2 q=p;q.x*=1.25/(.88+p.y*.19);float edge=length(q*vec2(1.,.92));
          a=(1.-smoothstep(.78,.95,edge))*.92;c*=.84+.16*(1.-p.x);}
        else if(mode<2.5){float theta=atan(p.y,p.x);float spoke=abs(sin(theta*3.))*r;
          float arms=1.-smoothstep(.035,.085,spoke);float branches=(1.-smoothstep(.025,.06,abs(spoke-abs(r-.52)*.65)))*step(.25,r);
          a=max(arms,branches*.75)*(1.-smoothstep(.72,.94,r));}
        else if(mode<3.5){float core=1.-smoothstep(.02,.28,r);
          float glint=pow(max(0.,1.-min(abs(p.x),abs(p.y))*12.),3.)*pow(max(0.,1.-r),1.7);
          a=pow(max(0.,1.-r),1.6)*.65+core+glint*.65;c=mix(c,vec3(1.),max(core*.9,glint*.6));}
        else{p.x*=1.+sin(vAngle*1.3)*.3;
          a=max(leafLobe(p,vec2(0.,-.92),.24),max(leafLobe(p,vec2(-.6,-.57),.22),leafLobe(p,vec2(.6,-.57),.22)));
          a=max(a,max(leafLobe(p,vec2(-.88,-.08),.2),leafLobe(p,vec2(.88,-.08),.2)));
          float stem=(1.-smoothstep(.018,.035,abs(p.x)))*step(.25,p.y)*(1.-smoothstep(.78,.87,p.y));a=max(a,stem);
          float vein=max(leafLobe(p,vec2(0.,-.9),.013),max(leafLobe(p,vec2(-.8,-.09),.009),leafLobe(p,vec2(.8,-.09),.009)));
          c*=.95+.05*p.x;c=mix(c,c*.65,max(vein*.65,stem*.7));}
        if(a*vAlpha*strength<.005)discard;gl_FragColor=vec4(c,clamp(a*vAlpha*strength,0.,1.));}`,
  })
  const particles = new T.Points(geometry, material); particles.frustumCulled = false; group.add(particles)
  const tipMaterial = new T.MeshBasicMaterial({ color: '#ffe5a9', transparent: true, opacity: 0 })
  const tip = new T.Mesh(new T.IcosahedronGeometry(.031, 1), tipMaterial); tip.position.z = -.368; tip.userData.action = 'wand'; wand.add(tip)
  const haloMaterial = new T.MeshBasicMaterial({ color: '#f8d895', transparent: true, opacity: 0, depthWrite: false })
  const halo = new T.Mesh(new T.TorusGeometry(.07, .004, 5, 40), haloMaterial); halo.position.z = -.368; halo.userData.action = 'wand'; wand.add(halo)
  const tipLight = new T.PointLight('#ffe1af', 0, 1.1, 2); tipLight.position.z = -.368; wand.add(tipLight)
  const palette = ['#ffe3a0', '#f5aacb', '#a5dbf2', '#f5c19e', '#c4b0ed', '#b0e1d4'].map(c => new T.Color(c))
  const petalColors = ['#ffe0e9', '#ffd5e3', '#ffeaf1', '#fbdce7'].map(c => new T.Color(c))
  // Brighter than a literal autumn-leaf sample: ACES tone mapping and the
  // shader's own shading both pull the mid-tones down, so these sit a step
  // lighter and warmer than the colours they are standing in for.
  const mapleColors = ['#eda46c', '#e08a72', '#f0c47e', '#d18473'].map(c => new T.Color(c))
  const snowColor = new T.Color('#f4f9ff'), goldColor = new T.Color('#ffe6aa')
  const fract = (n: number) => n - Math.floor(n)
  let flying = false, progress = 0, strength = 0, spellTime = 0, spell: WandSpell = 'glitter'
  const land = () => { flying = false }
  return {
    group,
    get active() { return flying },
    get spell() { return spell },
    toggle() {
      if (flying) { land(); return null }
      flying = true; spellTime = 0; strength = 0; group.visible = false; material.uniforms.strength.value = 0
      spell = WAND_SPELLS[Math.min(WAND_SPELLS.length - 1, Math.max(0, Math.floor(random() * WAND_SPELLS.length)))]
      material.uniforms.mode.value = WAND_SPELLS.indexOf(spell)
      material.blending = spell === 'glitter' ? T.AdditiveBlending : T.NormalBlending
      material.needsUpdate = true
      // Maple draws only its thinned 144; every other spell keeps the full row.
      geometry.setDrawRange(0, spell === 'fireworks' ? count : spell === 'maple' ? 144 : fallingCount)
      return spell
    },
    land,
    resize(height: number) { material.uniforms.viewport.value = height },
    update(delta: number, elapsed: number, reduced: boolean) {
      progress = reduced ? Number(flying) : T.MathUtils.clamp(progress + delta * (flying ? 1 / 1.05 : -1 / .85), 0, 1)
      const ease = progress * progress * (3 - 2 * progress)
      wand.position.lerpVectors(home, raised, ease); wand.quaternion.slerpQuaternions(homeRotation, raisedRotation, ease)
      if (progress > 0 && !reduced) { wand.position.y += Math.sin(elapsed * 1.6) * .045 * ease; wand.rotateZ(Math.sin(elapsed * .8) * .05 * ease) }
      strength = reduced ? Number(flying) * .75 : T.MathUtils.lerp(strength, flying && progress >= 1 ? 1 : 0, 1 - Math.exp(-delta * 3))
      material.uniforms.strength.value = strength; group.visible = strength > .005
      tipMaterial.opacity = ease; haloMaterial.opacity = ease * .5; halo.scale.setScalar(1 + (reduced ? 0 : Math.sin(elapsed * 2) * .13))
      tipLight.intensity = ease * .48
      tip.visible = halo.visible = progress > 0
      if (!group.visible) return
      if (flying && progress >= 1) spellTime += delta
      const t = reduced ? 1.3 : spellTime
      if (spell === 'fireworks') {
        // Six small staggered blooms; each ray has two fading trail points.
        for (let i = 0; i < count; i++) {
          const bloom = Math.floor(i / 120), ray = Math.floor((i % 120) / 3), trail = i % 3
          const age = reduced ? .7 : ((t - bloom * .54) % 4.9) - trail * .07
          const visible = age > 0 && age < 2.2
          const latitude = 1 - 2 * (ray + .5) / 40, longitude = ray * 2.39996
          const radial = Math.sqrt(1 - latitude * latitude), radius = .9 * (1 - Math.exp(-Math.max(0, age) * 2.5)) * (1 - trail * .09)
          const centerX = (bloom % 3 - 1) * 1.45, centerY = 4.9 + (bloom % 2) * .42, centerZ = -.2 + Math.floor(bloom / 3) * .65
          position.set([centerX + Math.cos(longitude) * radial * radius, centerY + latitude * radius - Math.max(0, age) ** 2 * .11, centerZ + Math.sin(longitude) * radial * radius * .8], i * 3)
          const sparkle = reduced ? .55 : Math.max(0, Math.sin(t * 9 + ray * 2.4 + bloom)) ** 8
          palette[bloom].toArray(color, i * 3); size[i] = (.145 - trail * .023) * (1 + sparkle * .18); angle[i] = ray * .7
          alpha[i] = visible ? Math.min(1, (1 - age / 2.2) * 1.8) * (1 - trail * .16) * (.7 + sparkle * .5) : 0
        }
      } else {
        // Maple thins the field to ~60% — fewer leaves read calmer than a full
        // curtain of them — and rides a shared breeze: the gust strength swells
        // and ebbs while its heading wanders slowly, and every leaf takes the
        // wind with its own lag, ride and flutter, so the fall drifts in soft
        // curved sweeps instead of sprinkling straight down.
        const breeze = spell === 'maple'
        const gust = breeze ? .5 + .5 * Math.sin(t * .17 + Math.sin(t * .05) * 1.3) : 0
        const heading = .9 + Math.sin(t * .06) * 1.4
        const windX = Math.cos(heading) * gust, windZ = Math.sin(heading) * gust
        const n = breeze ? 144 : fallingCount
        for (let i = 0; i < n; i++) {
          const seed = fract(Math.sin(i * 127.1 + 9.2) * 43758.54), seed2 = fract(Math.sin(i * 73.7 + 23.8) * 19341.13)
          const phase = fract(seed + t * (spell === 'glitter' ? .017 : spell === 'petals' ? .026 : spell === 'maple' ? .03 : .045))
          const radius = Math.sqrt(seed2) * 2.93, azimuth = i * 2.39996
          const sway = spell === 'maple' ? .42 : spell === 'petals' ? .34 : spell === 'glitter' ? .18 : .12
          const ride = breeze ? .7 + seed * .8 : 0, lag = breeze ? seed2 * 6.28 : 0
          const sweep = breeze ? Math.sin(t * .23 + lag) : 0
          position.set([Math.cos(azimuth) * radius + Math.sin(t * .8 + i) * sway + windX * ride * sweep, .22 + (1 - phase) * 5.1 + (spell === 'glitter' ? Math.sin(t * .65 + i) * .12 : breeze ? Math.sin(t * .9 + i * 1.7) * .05 : 0), Math.sin(azimuth) * radius + Math.cos(t * .65 + i) * sway + windZ * ride * sweep], i * 3)
          const c = spell === 'maple' ? mapleColors[i % 4] : spell === 'petals' ? petalColors[i % 4] : spell === 'snow' ? snowColor : goldColor
          c.toArray(color, i * 3)
          size[i] = spell === 'maple' ? .23 + seed * .1 : spell === 'petals' ? .12 + seed * .055 : spell === 'snow' ? .18 + seed * .12 : .029 + seed * .026
          angle[i] = i + t * (spell === 'maple' ? .48 : spell === 'petals' ? .4 : .2) + (breeze ? Math.sin(t * .55 + lag) * .4 : 0)
          alpha[i] = Math.min(1, phase * 14, (1 - phase) * 12) * (spell === 'glitter' ? .35 + .65 * Math.sin(t * 3 + i) ** 6 : .85)
        }
      }
      for (const name of ['position', 'color', 'alpha', 'size', 'angle']) geometry.attributes[name].needsUpdate = true
    },
    dispose() {
      wand.position.copy(home); wand.quaternion.copy(homeRotation)
      group.removeFromParent(); geometry.dispose(); material.dispose()
      tip.removeFromParent(); halo.removeFromParent(); tipLight.removeFromParent()
      tip.geometry.dispose(); halo.geometry.dispose(); tipMaterial.dispose(); haloMaterial.dispose()
    },
  }
}
