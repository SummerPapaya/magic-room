import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import * as T from 'three'
import { createWandMagic, WAND_SPELLS } from '../src/experiments/daxia-v2/wandMagic'

function advance(effect: ReturnType<typeof createWandMagic>, seconds: number, reduced = false) {
  for (let i = 0; i < Math.ceil(seconds * 60); i++) effect.update(1 / 60, i / 60, reduced)
}

test('the room effect waits for the wand to finish rising', () => {
  const effect = createWandMagic(new T.Group(), () => .3)
  effect.toggle(); advance(effect, 1)
  assert.equal(effect.active, true); assert.equal(effect.group.visible, false)
  advance(effect, .4); assert.equal(effect.group.visible, true)
  effect.dispose()
})

test('each random branch produces the corresponding finite, visible particle effect', () => {
  for (let i = 0; i < WAND_SPELLS.length; i++) {
    const wand = new T.Group(), effect = createWandMagic(wand, () => (i + .5) / WAND_SPELLS.length)
    assert.equal(effect.toggle(), WAND_SPELLS[i]); advance(effect, 2)
    assert.equal(effect.active, true); assert.equal(effect.group.visible, true)
    const particles = effect.group.children[0] as T.Points
    for (const name of ['position', 'alpha', 'color']) {
      assert.ok(Array.from(particles.geometry.attributes[name].array).every(Number.isFinite))
    }
    assert.ok(Array.from(particles.geometry.attributes.alpha.array).some(a => a > .1))
    // fireworks blooms with the full buffer; maple thins its field to 60%,
    // the other falling spells keep all 240
    assert.equal(particles.geometry.drawRange.count, i === 3 ? 720 : i === 4 ? 144 : 240)
    effect.dispose()
  }
})

test('second click returns the wand exactly to its original pose and clears the effect', () => {
  const wand = new T.Group(); wand.position.set(1.12, 1.575, -.18); wand.rotation.y = -.08
  const home = wand.position.clone(), orientation = wand.quaternion.clone(), effect = createWandMagic(wand, () => .3)
  effect.toggle(); advance(effect, 2); assert.ok(wand.position.y > home.y + 1)
  assert.equal(effect.toggle(), null); advance(effect, 4)
  assert.equal(effect.active, false); assert.equal(effect.group.visible, false)
  assert.ok(wand.position.equals(home)); assert.ok(wand.quaternion.equals(orientation))
  effect.dispose()
})

test('rapid clicks reverse the same flight without adding effects or leaving the wand aloft', () => {
  const wand = new T.Group(), effect = createWandMagic(wand), count = effect.group.children.length
  for (let i = 0; i < 20; i++) { effect.toggle(); advance(effect, .1) }
  effect.land(); advance(effect, 5)
  assert.equal(effect.group.children.length, count); assert.equal(effect.active, false)
  assert.deepEqual(wand.position.toArray(), [0, 0, 0]); assert.equal(effect.group.visible, false)
  effect.dispose(); assert.equal(wand.children.length, 0)
})

test('reduced motion gives a still spell and immediate, reversible wand placement', () => {
  const wand = new T.Group(), effect = createWandMagic(wand, () => .8)
  effect.toggle(); effect.update(.05, 0, true)
  const points = effect.group.children[0] as T.Points
  const position = Array.from(points.geometry.attributes.position.array), pose = wand.position.clone()
  advance(effect, 2, true)
  assert.deepEqual(Array.from(points.geometry.attributes.position.array), position); assert.ok(wand.position.equals(pose))
  effect.land(); effect.update(.05, 3, true)
  assert.equal(effect.group.visible, false); assert.deepEqual(wand.position.toArray(), [0, 0, 0])
  effect.dispose()
})
