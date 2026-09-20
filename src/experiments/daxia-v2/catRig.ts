import * as T from 'three'

// A continuous tapered surface blends the rear thigh into the rump, instead of
// showing a sequence of exposed ellipsoids at the hip, knee and hock.
function createHindLegSkin(parent: T.Group, material: T.Material) {
  const rows = 24, sides = 10, positions = new Float32Array((rows + 1) * (sides + 1) * 3), normals = new Float32Array(positions.length)
  const indices: number[] = []
  for (let row = 0; row < rows; row++) for (let side = 0; side < sides; side++) {
    const a = row * (sides + 1) + side, b = a + sides + 1; indices.push(a, a + 1, b, a + 1, b + 1, b)
  }
  const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.BufferAttribute(positions, 3)); geometry.setAttribute('normal', new T.BufferAttribute(normals, 3)); geometry.setIndex(indices)
  const mesh = new T.Mesh(geometry, material); mesh.name = 'cat-hind-leg-skin'; mesh.frustumCulled = false; mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh)
  const curve = new T.CatmullRomCurve3(Array.from({ length: 4 }, () => new T.Vector3()))
  const center = new T.Vector3(), tangent = new T.Vector3(), across = new T.Vector3(), sideAxis = new T.Vector3(), normal = new T.Vector3()
  return (hip: T.Vector3, knee: T.Vector3, hock: T.Vector3, paw: T.Vector3) => {
    // Bury the first ring inside the rump; an exposed open ring reads as a fin.
    curve.points[0].set(hip.x * .7, hip.y + .035, hip.z - .02)
    curve.points[1].copy(knee); curve.points[2].copy(hock); curve.points[3].copy(paw)
    for (let row = 0; row <= rows; row++) {
      const t = row / rows
      curve.getPoint(t, center); curve.getTangent(t, tangent)
      across.set(1, 0, 0).addScaledVector(tangent, -tangent.x).normalize(); sideAxis.crossVectors(tangent, across).normalize()
      const radius = t < .14 ? T.MathUtils.lerp(.035, .077, t / .14) : t < .33 ? T.MathUtils.lerp(.077, .05, (t - .14) / .19) : t < .67 ? T.MathUtils.lerp(.05, .031, (t - .33) / .34) : T.MathUtils.lerp(.031, .027, (t - .67) / .33)
      for (let side = 0; side <= sides; side++) {
        const angle = side / sides * Math.PI * 2, offset = (row * (sides + 1) + side) * 3
        normal.copy(across).multiplyScalar(Math.cos(angle)).addScaledVector(sideAxis, Math.sin(angle)); normal.toArray(normals, offset)
        positions[offset] = center.x + normal.x * radius; positions[offset + 1] = center.y + normal.y * radius; positions[offset + 2] = center.z + normal.z * radius
      }
    }
    geometry.attributes.position.needsUpdate = geometry.attributes.normal.needsUpdate = true
  }
}

/** Connected limbs; rear legs include a raised hock and a separate metatarsal. */
export function createCatLeg(parent: T.Group, material: T.Material, pawMaterial: T.Material, front: boolean) {
  const root = new T.Bone(), knee = new T.Bone(), ankle = new T.Bone()
  const hock = front ? null : new T.Bone()
  root.name = front ? 'cat-shoulder' : 'cat-hip'; knee.name = 'cat-knee'; ankle.name = 'cat-paw'
  parent.add(root); root.add(knee); knee.add(hock ?? ankle)
  if (hock) { hock.name = 'cat-hock'; hock.add(ankle) }
  const radius = front ? .04 : .049
  const ball = (to: T.Object3D, scale: number[], mat = material) => {
    const m = new T.Mesh(new T.SphereGeometry(1, 12, 10), mat); m.scale.set(scale[0], scale[1], scale[2]); m.castShadow = m.receiveShadow = true; to.add(m); return m
  }
  const cap = ball(root, [radius * 1.1, radius * 1.5, radius * 1.1])
  const upper = ball(root, [radius, 1, radius]), lower = ball(knee, [radius * .82, 1, radius * .82])
  const kneeCap = ball(knee, [radius * .9, radius * .9, radius * .9])
  const metatarsal = hock ? ball(hock, [radius * .68, 1, radius * .68]) : null
  const poseSkin = hock ? createHindLegSkin(parent, material) : null
  if (hock) { cap.visible = upper.visible = lower.visible = kneeCap.visible = false; metatarsal!.visible = false }
  const paw = ball(ankle, [.057, .036, .077], pawMaterial); paw.position.z = .025
  const down = new T.Vector3(0, -1, 0), direction = new T.Vector3(), bend = new T.Vector3(), joint = new T.Vector3(), foot = new T.Vector3(), end = new T.Vector3(), pawEnd = new T.Vector3()
  const orientation = new T.Quaternion(), inverse = new T.Quaternion(), pawOrientation = new T.Quaternion()
  return {
    root, knee, ankle, hock, upper, lower,
    pose(shoulder: T.Vector3, target: T.Vector3, upperLength: number, lowerLength: number, hockHeight = .09) {
      root.position.copy(shoulder)
      end.copy(target); if (hock) { end.y += hockHeight; end.z -= hockHeight * .4 }
      direction.subVectors(end, shoulder)
      const distance = T.MathUtils.clamp(direction.length(), Math.abs(upperLength - lowerLength) + .001, upperLength + lowerLength - .001)
      direction.normalize(); foot.copy(shoulder).addScaledVector(direction, distance)
      bend.set(0, 0, front ? -1 : 1).addScaledVector(direction, -(front ? -direction.z : direction.z)).normalize()
      const along = (upperLength ** 2 - lowerLength ** 2 + distance ** 2) / (2 * distance)
      joint.copy(shoulder).addScaledVector(direction, along).addScaledVector(bend, Math.sqrt(Math.max(0, upperLength ** 2 - along ** 2)))
      direction.subVectors(joint, shoulder).normalize(); root.quaternion.setFromUnitVectors(down, direction)
      knee.position.set(0, -upperLength, 0); direction.subVectors(foot, joint).normalize()
      orientation.setFromUnitVectors(down, direction); inverse.copy(root.quaternion).invert()
      knee.quaternion.copy(inverse).multiply(orientation)
      if (hock && metatarsal) {
        hock.position.set(0, -lowerLength, 0)
        const length = hockHeight * Math.sqrt(1.16)
        direction.set(0, -1, .4).normalize(); pawOrientation.setFromUnitVectors(down, direction)
        hock.quaternion.copy(orientation).invert().multiply(pawOrientation)
        ankle.position.set(0, -length, 0); ankle.quaternion.copy(pawOrientation).invert()
        metatarsal.position.y = -length / 2; metatarsal.scale.y = length / 2 + radius * .25
        pawEnd.copy(foot).addScaledVector(direction, length); poseSkin!(shoulder, joint, foot, pawEnd)
      } else { ankle.position.set(0, -lowerLength, 0); ankle.quaternion.copy(orientation).invert() }
      upper.position.y = -upperLength / 2; upper.scale.y = upperLength / 2 + radius * .4
      lower.position.y = -lowerLength / 2; lower.scale.y = lowerLength / 2 + radius * .35
    },
  }
}
