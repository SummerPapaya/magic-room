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
  // The neck is the wedge that carries the head — without it the head reads
  // as a ball floating next to the torso. It hides inside the body while the
  // cat sleeps and stretches up-forward as the cat rises.
  const neck = ball(group, [0, .2, .12], [.02, .02, .02], fur)
  body.name = 'cat-body'; chest.name = 'cat-chest'; neck.name = 'cat-neck'
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
  // Walking: the tail arches high over the back and curls gently forward,
  // echoing the reference pose where a confident black cat carries its tail
  // upright in a soft "?". The tip sits above the shoulders, slightly forward.
  const walkingCurve = new T.CatmullRomCurve3([[0, .40, -.28], [-.01, .58, -.26], [-.03, .75, -.18], [-.05, .88, -.06], [-.03, .95, .06], [0, .93, .14]].map(p => new T.Vector3(...p)))
  const tailGeometry = new T.TubeGeometry(tailCurve, 32, .036, 8, false), uprightGeometry = new T.TubeGeometry(uprightCurve, 32, .036, 8, false)
  const walkingGeometry = new T.TubeGeometry(walkingCurve, 32, .036, 8, false)
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
      // Three stages, smoothly blended: sleeping (loaf) → sitting (sphinx:
      // haunches on the floor, chest lifted by straight front legs, back legs
      // folded alongside) → walking (horizontal back, long straight legs,
      // head carried high on a sloping neck — the classic silhouette).
      // For each value the formula is `lerp(sleep, lerp(sit, walkTo, walk), rise)`.
      // (The second parameter must NOT be named `walk` — it would shadow the
      // outer blend factor and silently freeze every pose mid-blend.)
      const S = (sit: number, walkTo: number) => T.MathUtils.lerp(sit, walkTo, walk)
      // Body: in the sphinx sit the rear drops to the floor and the front
      // pitches up; walking lifts the belly onto long legs, level and long.
      body.position.set(0, T.MathUtils.lerp(.16, S(.24, .345), rise) + breathe, T.MathUtils.lerp(0, S(-.04, 0), rise))
      body.scale.set(
        T.MathUtils.lerp(.3, S(.17, .11), rise),
        T.MathUtils.lerp(.15, S(.15, .08), rise),
        T.MathUtils.lerp(.23, S(.26, .31), rise),
      )
      body.rotation.x = T.MathUtils.lerp(0, S(-.22, 0), rise)
      // Chest: shoulder mass under the neck.
      chest.position.set(
        0,
        T.MathUtils.lerp(.18, S(.30, .34), rise) + breathe,
        T.MathUtils.lerp(.05, S(.08, .20), rise),
      )
      chest.scale.set(
        .13,
        T.MathUtils.lerp(.12, S(.20, .10), rise),
        T.MathUtils.lerp(.13, S(.13, .12), rise),
      )
      // Neck bridges torso and head so the head is never a floating ball.
      neck.position.set(
        0,
        T.MathUtils.lerp(.2, S(.40, .44), rise) + breathe,
        T.MathUtils.lerp(.12, S(.14, .28), rise),
      )
      neck.scale.set(
        T.MathUtils.lerp(.02, S(.085, .09), rise),
        T.MathUtils.lerp(.02, S(.15, .14), rise),
        T.MathUtils.lerp(.02, S(.085, .09), rise),
      )
      neck.rotation.x = T.MathUtils.lerp(0, S(-.2, -.5), rise)
      // Head: low and tucked when sleeping, upright in the sphinx sit, high
      // and forward at the top of the sloping neck when walking.
      head.position.set(
        T.MathUtils.lerp(.16, S(0, 0), rise),
        T.MathUtils.lerp(.19, S(.52, .50), rise) + breathe + walk * Math.sin(gait * Math.PI * 4) * .012,
        T.MathUtils.lerp(.14, S(.18, .34), rise),
      )
      const look = Math.atan2(gaze.x - group.position.x, gaze.z - group.position.z) - group.rotation.y
      const yaw = T.MathUtils.clamp(Math.atan2(Math.sin(look), Math.cos(look)), -.95, .95)
      // A walking cat watches where it is going — the head faces the
      // direction of travel with only a small gait bob. The gaze tracking
      // (following the cursor) is for the sitting cat.
      const walkYaw = Math.sin(gait * Math.PI * 2) * .07
      head.rotation.y = T.MathUtils.lerp(head.rotation.y, T.MathUtils.lerp(-.45, state === 'walking' ? walkYaw : yaw, rise), smoothing)
      head.rotation.z = T.MathUtils.lerp(-.48, state === 'walking' ? -.08 : -.02, rise)
      head.rotation.x = -.04 * rise
      hitBox.scale.set(1 - rise * .28, .38 + rise * .62, 1 - rise * .28); hitBox.position.y = .19 + rise * .32
      awakeEyes.visible = rise > .65; sleepingEyes.visible = !awakeEyes.visible
      const blink = !reduced && (elapsed % 6.7) < .12
      awakeEyes.scale.y = blink ? .12 : 1
      legs.forEach((leg, i) => {
        const front = i < 2, side = i % 2 ? 1 : -1
        // Four-beat diagonal walk: front-left and rear-right stride together,
        // front-right and rear-left a half-step later. The supporting paw
        // slides backward at the same speed the body travels, so planted
        // feet do not skate; only the returning paw lifts.
        const phase = (gait + [0, .5, .5, 0][i]) % 1, swing = Math.max(0, (phase - .64) / .36)
        const step = reduced ? 0 : phase < .64 ? .11 - phase / .64 * .22 : -.11 + .22 * swing * swing * (3 - 2 * swing)
        const lift = reduced ? 0 : Math.sin(swing * Math.PI) * .05
        // Walking legs: hips and shoulders under the horizontal torso, the
        // segments summing to the shoulder height so the legs read as long
        // and straight like the reference silhouette.
        const hipX = front ? .10 : .08
        const hipY = .33
        const hipZ = front ? .22 : -.21
        const pawX = front ? .10 : .08
        const pawZ = front ? .22 : -.21
        // Back legs have a hock joint: upper+lower only reach the hock
        // (~.09 above the paw), so they must be shorter than the front pair
        // or the knee over-folds and the rump squats.
        const walkUpper = front ? .145 : .11
        const walkLower = front ? .145 : .10
        // Sphinx sit: front legs straight down beside the chest, back legs
        // folded forward at the knee, paws resting alongside the body.
        const sitHipX = front ? .08 : .13
        const sitHipY = front ? .24 : .15
        const sitHipZ = front ? .12 : -.07
        const sitPawX = front ? .08 : .13
        const sitPawZ = front ? .14 : 0
        const sitUpper = front ? .10 : .07
        const sitLower = front ? .10 : .075
        const sitKnee = front ? .04 : .07
        shoulder.set(
          side * T.MathUtils.lerp(.12, S(sitHipX, hipX), rise),
          T.MathUtils.lerp(.14, S(sitHipY, hipY), rise) + breathe,
          T.MathUtils.lerp(front ? .1 : -.11, S(sitHipZ, hipZ), rise),
        )
        footTarget.set(
          side * T.MathUtils.lerp(.13, S(sitPawX, pawX), rise),
          .043 + lift * walk,
          T.MathUtils.lerp(front ? .15 : -.1, S(sitPawZ, pawZ), rise) + step * walk,
        )
        const upper = T.MathUtils.lerp(.09, S(sitUpper, walkUpper), rise)
        const lower = T.MathUtils.lerp(.095, S(sitLower, walkLower), rise)
        const knee = T.MathUtils.lerp(.035, S(sitKnee, .09), rise)
        leg.pose(shoulder, footTarget, upper, lower, knee)
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
