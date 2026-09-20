import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import * as T from 'three'
import { createCatNavigation } from '../src/experiments/daxia-v2/catNavigation'
import { createCat } from '../src/experiments/daxia-v2/cat'
import { ambientProfile } from '../src/experiments/daxia-v2/sound'

test('cat paths go around furniture and stay inside the circular floor', () => {
  const obstacle = new T.Box2(new T.Vector2(-.4, -1), new T.Vector2(.4, 1))
  const nav = createCatNavigation([obstacle]), from = new T.Vector2(-1.8, 0), goal = new T.Vector2(1.8, 0)
  const path = nav.path(from, goal); assert.ok(path.length > 1)
  let start = from
  for (const end of path) {
    for (let i = 0; i <= 100; i++) assert.ok(nav.canStand(start.clone().lerp(end, i / 100)))
    start = end
  }
  assert.ok(start.distanceTo(goal) < .15)
  const boundary = nav.path(from, new T.Vector2(30, 30)).at(-1)!
  assert.ok(boundary.length() <= 3.48 && nav.canStand(boundary))
  const blocked = nav.path(from, new T.Vector2(0, 0)).at(-1)!
  assert.ok(nav.canStand(blocked) && !obstacle.containsPoint(blocked))
})

test('the cat sleeps until activated, tracks the pointer, walks and sits at its destination', () => {
  const states: string[] = [], cat = createCat([], state => states.push(state))
  const home = cat.group.position.clone()
  assert.equal(cat.moveTo(new T.Vector3(-1, 0, 2)), false)
  cat.update(1, 1, false); assert.ok(cat.group.position.equals(home)); assert.equal(cat.state, 'sleeping')
  cat.wake(); cat.lookAt(new T.Vector3(-2, 0, 3))
  for (let i = 0; i < 120; i++) cat.update(1 / 60, i / 60, false)
  const left = cat.head.rotation.y
  cat.lookAt(new T.Vector3(2, 0, 3))
  for (let i = 0; i < 120; i++) cat.update(1 / 60, i / 60, false)
  assert.ok(cat.head.rotation.y > left + .3)
  assert.equal(cat.moveTo(new T.Vector3(-1, 0, 2)), true)
  for (let i = 0; i < 300; i++) cat.update(1 / 60, i / 60, false)
  assert.equal(cat.state, 'sitting'); assert.ok(Math.hypot(cat.group.position.x + 1, cat.group.position.z - 2) < .15)
  cat.sleep(); assert.equal(cat.state, 'sleeping'); assert.ok(states.includes('walking')); cat.dispose()
})

test('summer cicadas and fair-weather birds fall silent at night and during precipitation', () => {
  assert.ok(ambientProfile('sun', 12, 'summer').cicadas > 0)
  assert.ok(ambientProfile('sun', 12, 'spring').birds)
  for (const season of ['spring', 'autumn', 'winter'] as const) assert.equal(ambientProfile('sun', 12, season).cicadas, 0)
  for (const weather of ['rain', 'snow'] as const) {
    const p = ambientProfile(weather, 12, 'summer'); assert.equal(p.cicadas, 0); assert.equal(p.birds, false)
  }
  const night = ambientProfile('sun', 22, 'summer'); assert.equal(night.cicadas, 0); assert.equal(night.birds, false)
  assert.ok(night.bed < ambientProfile('sun', 12, 'summer').bed)
})

test('every leg stays attached to the torso, with connected joints and level paws throughout a walk', () => {
  const cat = createCat([], () => {}), body = cat.group.getObjectByName('cat-body')!, chest = cat.group.getObjectByName('cat-chest')!
  const roots = cat.group.children.filter(o => o instanceof T.Bone)
  assert.equal(roots.length, 4)
  cat.wake()
  const point = new T.Vector3(), kneePoint = new T.Vector3(), pawPoint = new T.Vector3(), up = new T.Vector3()
  const inside = (p: T.Vector3, torso: T.Object3D) => p.clone().sub(torso.position).divide(torso.scale).length() < 1.05
  let lifted = false, grounded = false
  for (let i = 0; i < 480; i++) {
    if (i === 100) cat.moveTo(new T.Vector3(-2.1, 0, .8))
    cat.update(1 / 60, i / 60, false); cat.group.updateMatrixWorld(true)
    for (const root of roots) {
      assert.ok(inside(root.position, body) || inside(root.position, chest), 'shoulder or hip must remain inside the body')
      const knee = root.children.find(o => o instanceof T.Bone)!, ankle = root.getObjectByName('cat-paw')!
      root.getWorldPosition(point); knee.getWorldPosition(kneePoint); ankle.getWorldPosition(pawPoint)
      assert.ok(Math.abs(point.distanceTo(kneePoint) - knee.position.length() * .8) < .00001)
      root.traverse(bone => {
        if (bone instanceof T.Bone && bone.parent instanceof T.Bone) {
          const start = bone.parent.getWorldPosition(new T.Vector3()), end = bone.getWorldPosition(new T.Vector3())
          assert.ok(Math.abs(start.distanceTo(end) - bone.position.length() * .8) < .00001)
        }
      })
      up.set(0, 1, 0).transformDirection(ankle.matrixWorld); assert.ok(up.y > .9999)
      cat.group.worldToLocal(pawPoint); assert.ok(pawPoint.y >= .042)
      if (cat.state === 'walking') { lifted ||= pawPoint.y > .085; grounded ||= pawPoint.y < .05 }
    }
  }
  assert.ok(lifted && grounded); cat.dispose()
})
