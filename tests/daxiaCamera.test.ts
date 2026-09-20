import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import * as T from 'three'
import { createRoomOrbit, ROOM_PIVOT } from '../src/experiments/daxia-v2/roomCamera'

function setup() {
  const document = new EventTarget()
  const element = Object.assign(new EventTarget(), { style: {}, ownerDocument: document, getRootNode: () => document }) as unknown as HTMLElement
  const camera = new T.PerspectiveCamera(35, 1440 / 980, .1, 80); camera.position.set(5.5, 9.5, 15.5)
  const orbit = createRoomOrbit(camera, element); orbit.controls.enableDamping = false; orbit.controls.update(); orbit.apply(1440, 980); camera.updateMatrixWorld()
  return { camera, orbit }
}
test('panning changes framing while the room centre stays at the same screen position throughout an orbit', () => {
  const { camera, orbit } = setup(), before = ROOM_PIVOT.clone().project(camera)
  const distance = camera.position.distanceTo(ROOM_PIVOT)
  orbit.pan(150, -70, 1440, 980); orbit.apply(1440, 980)
  const panned = ROOM_PIVOT.clone().project(camera)
  assert.ok(Math.abs((panned.x - before.x) * 720 - 150) < .0001)
  assert.ok(Math.abs((panned.y - before.y) * -490 + 70) < .0001)
  for (let i = 0; i < 100; i++) {
    orbit.controls.rotateLeft(.08); orbit.controls.update(); camera.updateMatrixWorld()
    assert.ok(orbit.controls.target.equals(ROOM_PIVOT))
    assert.ok(Math.abs(camera.position.distanceTo(ROOM_PIVOT) - distance) < .00001)
    assert.ok(ROOM_PIVOT.clone().project(camera).distanceTo(panned) < .00001)
  }
  orbit.controls.dispose()
})
test('framing the guqin or desk never changes the orbit centre, and reset clears pan', () => {
  const { camera, orbit } = setup()
  for (const focus of [new T.Vector3(-2.4, 1, 1.4), new T.Vector3(0, 1.45, -1)]) {
    camera.position.set(.7, 4.6, 7.8); orbit.controls.update()
    orbit.framing.copy(orbit.offsetFor(camera.position, focus)); orbit.apply(1440, 980); camera.updateMatrixWorld()
    const projected = focus.clone().project(camera)
    assert.ok(Math.abs(projected.x + .07) < .0001 && Math.abs(projected.y) < .0001)
    assert.ok(orbit.controls.target.equals(ROOM_PIVOT))
  }
  orbit.framing.copy(orbit.offsetFor(new T.Vector3(5.5, 9.5, 15.5), ROOM_PIVOT))
  assert.ok(orbit.framing.length() < .00001); orbit.controls.dispose()
})
