import * as T from 'three'
import { createCatNavigation } from './catNavigation'
import { createCatLeg } from './catRig'

export type CatState = 'sleeping' | 'sitting' | 'walking'
export function createCat(obstacles: T.Box2[], onState: (state: CatState) => void) {
  const group = new T.Group(); group.name = 'little-black-cat'; group.position.set(.05, .045, 2.16); group.rotation.y = -.25; group.scale.setScalar(.8)
  const fur = new T.MeshToonMaterial({ color: '#34364b', emissive: '#222239', emissiveIntensity: .12 })
  const softFur = new T.MeshToonMaterial({ color: '#454961', emissive: '#28263e', emissiveIntensity: .1 })
  const earViolet = new T.MeshToonMaterial({ color: '#747092' }), nosePink = new T.MeshToonMaterial({ color: '#b89aab' })
  const eye = new T.MeshBasicMaterial({ color: '#e8e6d6' })
  const black = new T.MeshBasicMaterial({ color: '#161721' }), white = new T.MeshBasicMaterial({ color: '#e3ded2' })
  const faceLines = new T.LineBasicMaterial({ color: '#b4b5cf', transparent: true, opacity: .55 })
  const ball = (parent: T.Group, p: number[], scale: number[], material: T.Material) => {
    const mesh = new T.Mesh(new T.SphereGeometry(1, 16, 12), material); mesh.position.set(p[0], p[1], p[2]); mesh.scale.set(scale[0], scale[1], scale[2]); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh
  }
  const body = ball(group, [0, .16, 0], [.3, .15, .23], fur)
  const chest = ball(group, [0, .2, .05], [.125, .23, .13], fur)
  body.name = 'cat-body'; chest.name = 'cat-chest'
  const head = new T.Group(); head.scale.setScalar(.78); group.add(head)
  ball(head, [0, 0, 0], [.2, .175, .16], fur)
  for (const side of [-1, 1]) {
    const ear = new T.Mesh(new T.ConeGeometry(.092, .29, 3), fur); ear.position.set(side * .13, .205, -.015); ear.rotation.set(.13, side * -.25, side * -.18); ear.castShadow = true; head.add(ear)
    const inset = new T.Mesh(new T.ConeGeometry(.055, .205, 3), earViolet); inset.position.set(side * .13, .22, .025); inset.rotation.copy(ear.rotation); head.add(inset)
    ball(head, [side * .038, -.058, .134], [.044, .029, .028], softFur)
    for (let i = 0; i < 3; i++) {
      const points = [new T.Vector3(side * .075, -.055, .15), new T.Vector3(side * (.225 + i * .008), -.04 + (i - 1) * .023, .13)]
      head.add(new T.Line(new T.BufferGeometry().setFromPoints(points), faceLines))
    }
  }
  const nose = new T.Mesh(new T.ConeGeometry(.018, .016, 3), nosePink); nose.rotation.z = Math.PI; nose.position.set(0, -.04, .168); head.add(nose)
  const awakeEyes = new T.Group(), sleepingEyes = new T.Group(); head.add(awakeEyes, sleepingEyes)
  for (const side of [-1, 1]) {
    const iris = ball(awakeEyes, [side * .078, .024, .14], [.047, .061, .013], eye); iris.rotation.z = side * -.15
    ball(awakeEyes, [side * .078, .025, .153], [.013, .046, .007], black)
    ball(awakeEyes, [side * .078 - .011, .047, .16], [.008, .009, .004], white)
    const curve = new T.QuadraticBezierCurve3(new T.Vector3(side * .078 - .037, .018, .151), new T.Vector3(side * .078, -.005, .163), new T.Vector3(side * .078 + .037, .018, .151))
    sleepingEyes.add(new T.Line(new T.BufferGeometry().setFromPoints(curve.getPoints(12)), faceLines))
  }
  const legs = Array.from({ length: 4 }, (_, i) => createCatLeg(group, fur, softFur, i < 2))
  const shoulder = new T.Vector3(), footTarget = new T.Vector3()
  const tail = new T.Group(); group.add(tail)
  const tailCurve = new T.CatmullRomCurve3([[0, .16, -.2], [-.2, .1, -.29], [-.34, .065, -.07], [-.24, .06, .23], [.04, .06, .28], [.18, .075, .2]].map(p => new T.Vector3(...p)))
  const uprightCurve = new T.CatmullRomCurve3([[0, .18, -.19], [-.17, .27, -.28], [-.36, .53, -.29], [-.38, .83, -.2], [-.3, .97, -.11], [-.23, .95, -.07]].map(p => new T.Vector3(...p)))
  const walkingCurve = new T.CatmullRomCurve3([[0, .43, -.4], [.015, .49, -.57], [.035, .66, -.69], [.055, .89, -.72], [.055, 1.04, -.65], [.03, 1.015, -.55]].map(p => new T.Vector3(...p)))
  const tailGeometry = new T.TubeGeometry(tailCurve, 32, .027, 8, false), uprightGeometry = new T.TubeGeometry(uprightCurve, 32, .027, 8, false)
  const walkingGeometry = new T.TubeGeometry(walkingCurve, 32, .027, 8, false)
  tailGeometry.morphAttributes.position = [uprightGeometry.attributes.position.clone(), walkingGeometry.attributes.position.clone()]
  tailGeometry.morphAttributes.normal = [uprightGeometry.attributes.normal.clone(), walkingGeometry.attributes.normal.clone()]; uprightGeometry.dispose(); walkingGeometry.dispose()
  const tailMesh = new T.Mesh(tailGeometry, fur); tailMesh.name = 'cat-tail'; tailMesh.castShadow = true; tailMesh.frustumCulled = false; tail.add(tailMesh)
  const tailTip = ball(tail, [.18, .075, .2], [.027, .027, .027], fur)
  const sleepingTip = tailCurve.getPoint(1), sittingTip = uprightCurve.getPoint(1), walkingTip = walkingCurve.getPoint(1)
  const hitBox = new T.Mesh(new T.BoxGeometry(.78, 1.12, .72), new T.MeshBasicMaterial({ visible: false })); hitBox.position.y = .45; group.add(hitBox)
  group.traverse(o => { o.userData.action = 'cat' })
  const navigation = createCatNavigation(obstacles)
  let state: CatState = 'sleeping', rise = 0, walk = 0, gait = 0, route: T.Vector2[] = []
  const gaze = new T.Vector3(.05, 0, 4), point = new T.Vector2()
  const setState = (next: CatState) => { if (state !== next) { state = next; onState(state) } }
  const wake = () => { if (state === 'sleeping') setState('sitting') }
  const sleep = () => { route = []; setState('sleeping') }
  return {
    group, head, targets: [group],
    get state() { return state },
    wake, sleep,
    lookAt(p: T.Vector3) { gaze.copy(p) },
    moveTo(p: T.Vector3) {
      if (state === 'sleeping') return false
      route = navigation.path(new T.Vector2(group.position.x, group.position.z), new T.Vector2(p.x, p.z))
      if (route.length) { setState('walking'); return true }
      return false
    },
    update(delta: number, elapsed: number, reduced: boolean) {
      const smoothing = reduced ? 1 : 1 - Math.exp(-delta * 6)
      rise = T.MathUtils.lerp(rise, state === 'sleeping' ? 0 : 1, smoothing)
      walk = T.MathUtils.lerp(walk, state === 'walking' ? 1 : 0, smoothing)
      if (route.length) {
        let remaining = delta * .6 * walk
        while (route.length && remaining > 0) {
          point.set(group.position.x, group.position.z); const distance = point.distanceTo(route[0])
          const travel = Math.min(remaining, distance), direction = route[0].clone().sub(point)
          if (distance > .001) {
            const desired = Math.atan2(direction.x, direction.y), diff = Math.atan2(Math.sin(desired - group.rotation.y), Math.cos(desired - group.rotation.y))
            group.rotation.y += diff * smoothing
            point.addScaledVector(direction, travel / distance); group.position.x = point.x; group.position.z = point.y; gait += travel / .3625
          }
          remaining -= travel
          if (distance <= travel + .001) route.shift(); else break
        }
        if (!route.length) setState('sitting')
      }
      const breathe = reduced ? 0 : Math.sin(elapsed * 1.6) * .004 + Math.sin(gait * Math.PI * 4) * .006 * walk
      body.position.set(0, T.MathUtils.lerp(.16, .34 + walk * .045, rise) + breathe, -.025 * walk)
      body.scale.set(T.MathUtils.lerp(.3, .18 - walk * .01, rise), T.MathUtils.lerp(.15, .28 - walk * .125, rise), T.MathUtils.lerp(.23, .175 + walk * .26, rise))
      chest.position.set(0, T.MathUtils.lerp(.18, .54 - walk * .1, rise) + breathe, .05 + walk * .21)
      chest.scale.set(.13, T.MathUtils.lerp(.12, .23 - walk * .09, rise), .13 + walk * .055)
      head.position.set(.16 * (1 - rise), T.MathUtils.lerp(.19, .79 - walk * .2, rise) + breathe, T.MathUtils.lerp(.14, .115 + walk * .34, rise))
      const look = Math.atan2(gaze.x - group.position.x, gaze.z - group.position.z) - group.rotation.y
      const yaw = T.MathUtils.clamp(Math.atan2(Math.sin(look), Math.cos(look)), -.95, .95)
      head.rotation.y = T.MathUtils.lerp(head.rotation.y, T.MathUtils.lerp(-.45, state === 'walking' ? 0 : yaw, rise), smoothing)
      head.rotation.z = -.48 * (1 - rise); head.rotation.x = -.03 * rise
      hitBox.scale.set(1 - rise * .28, .38 + rise * .62, 1 - rise * .28); hitBox.position.y = .19 + rise * .32
      awakeEyes.visible = rise > .65; sleepingEyes.visible = !awakeEyes.visible
      const blink = !reduced && (elapsed % 6.7) < .12
      awakeEyes.scale.y = blink ? .12 : 1
      legs.forEach((leg, i) => {
        const front = i < 2, side = i % 2 ? 1 : -1
        // Four-beat walk: the supporting paw moves backward relative to the body;
        // only the returning paw lifts, so the feet do not paddle through the floor.
        const phase = (gait + [.75, .25, 0, .5][i]) % 1, swing = Math.max(0, (phase - .64) / .36)
        const step = reduced ? 0 : phase < .64 ? .145 - phase / .64 * .29 : -.145 + .29 * swing * swing * (3 - 2 * swing)
        const lift = reduced ? 0 : Math.sin(swing * Math.PI) * .06
        const hipX = front ? .078 + walk * .017 : .13 - walk * .01
        const hipY = front ? .46 - walk * .045 : .27 + walk * .11
        const hipZ = front ? .105 + walk * .165 : -.07 - walk * .22
        shoulder.set(side * T.MathUtils.lerp(.12, hipX, rise), T.MathUtils.lerp(.14, hipY, rise) + breathe, T.MathUtils.lerp(front ? .1 : -.11, hipZ, rise))
        const pawX = front ? .08 + walk * .015 : .145 - walk * .025
        const pawZ = front ? .175 + walk * .105 : -.14 - walk * .15
        footTarget.set(side * T.MathUtils.lerp(.13, pawX, rise), .043 + lift * walk, T.MathUtils.lerp(front ? .15 : -.1, pawZ, rise) + step * walk)
        const upper = front ? .225 - walk * .025 : .135 + walk * .035, lower = front ? .23 - walk * .015 : .14 + walk * .02
        leg.pose(shoulder, footTarget, T.MathUtils.lerp(.09, upper, rise), T.MathUtils.lerp(.095, lower, rise), T.MathUtils.lerp(.035, .09, rise))
      })
      tailMesh.morphTargetInfluences![0] = rise * (1 - walk)
      tailMesh.morphTargetInfluences![1] = rise * walk
      tailTip.position.copy(sleepingTip).multiplyScalar(1 - rise).addScaledVector(sittingTip, rise * (1 - walk)).addScaledVector(walkingTip, rise * walk)
      tail.rotation.y = (reduced ? 0 : Math.sin(elapsed * .85) * .045 * rise)
    },
    dispose() {
      group.removeFromParent(); const mats = new Set<T.Material>()
      group.traverse(o => { if (o instanceof T.Mesh || o instanceof T.Line) { o.geometry.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => mats.add(m)) } }); mats.forEach(m => m.dispose())
    },
  }
}
