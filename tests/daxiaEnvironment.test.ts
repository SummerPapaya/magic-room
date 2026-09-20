import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { environmentState, solarState, SEASONS, formatHour, weatherForSeason } from '../src/experiments/daxia-v2/environment'
import type { Season, Weather } from '../src/experiments/daxia-v2/environment'
const seasons = Object.keys(SEASONS) as Season[]
const weathers: Weather[] = ['sun', 'cloud', 'rain', 'snow']

test('every seasonal sunset aligns with the central window, and dawn stays in front', () => {
  for (const season of seasons) {
    const { sunrise, sunset } = SEASONS[season]
    const evening = solarState(sunset, season), morning = solarState(sunrise, season)
    assert.ok(Math.abs(evening.direction[0]) < 1e-8 && Math.abs(evening.direction[1]) < 1e-8)
    assert.ok(evening.direction[2] < -.999)
    assert.ok(morning.direction[2] < 0 && morning.direction[0] < 0)
    assert.ok(evening.discVisibility > .9, 'upper solar limb is still visible at the sunset horizon')
  }
})
test('the sun rises, peaks, and descends continuously without changing weather-dependent position', () => {
  for (const season of seasons) {
    const { sunrise, sunset } = SEASONS[season], noon = (sunrise + sunset) / 2
    let lastDirection = solarState(sunrise, season).direction
    for (let hour = sunrise; hour <= sunset; hour += .05) {
      const state = solarState(hour, season)
      assert.ok(Math.hypot(...state.direction.map((v, i) => v - lastDirection[i])) < .07)
      lastDirection = state.direction
      assert.ok(state.direction[2] < 0, 'sunlight must stay on the three-window side')
      assert.ok(Math.abs(Math.hypot(...state.direction) - 1) < 1e-8)
      assert.ok(state.elevation >= -1e-8)
      for (const weather of weathers) assert.deepEqual(environmentState(hour, season, weather).direction, state.direction)
    }
    assert.ok(solarState(noon, season).elevation > solarState(noon - 2, season).elevation)
    assert.ok(solarState(noon, season).elevation > solarState(noon + 2, season).elevation)
  }
})
test('night has no direct solar illumination; twilight fades before full darkness', () => {
  for (const season of seasons) for (const weather of weathers) {
    for (const hour of [SEASONS[season].sunrise - 1, SEASONS[season].sunset + 1, 22]) {
      const env = environmentState(hour, season, weather)
      assert.equal(env.direct, 0); assert.equal(env.discVisibility, 0)
      assert.ok(env.diffuse < .17)
    }
    assert.ok(environmentState(SEASONS[season].sunset + .3, season, weather).daylight > environmentState(SEASONS[season].sunset + .8, season, weather).daylight)
  }
})
test('clouds reduce direct light, precipitation removes it, and a lamp has fixed output', () => {
  for (const season of seasons) {
    const clear = environmentState(12, season, 'sun'), cloud = environmentState(12, season, 'cloud')
    assert.ok(clear.direct > cloud.direct && cloud.direct > 0)
    for (const weather of (season === 'winter' ? ['rain', 'snow'] : ['rain']) as Weather[]) {
      const env = environmentState(12, season, weather)
      assert.equal(env.direct, 0); assert.equal(env.discVisibility, 0)
      assert.ok(env.diffuse < clear.diffuse)
      assert.equal(environmentState(22, season, weather).lampIntensity, clear.lampIntensity)
    }
  }
})
test('summer days are longer and solar altitude is higher than winter; time labels keep minutes', () => {
  assert.ok(SEASONS.summer.sunset - SEASONS.summer.sunrise > SEASONS.winter.sunset - SEASONS.winter.sunrise)
  assert.ok(solarState(12, 'summer').elevation > solarState(12, 'winter').elevation)
  assert.equal(formatHour(16.75), '16:45'); assert.equal(formatHour(17.75), '17:45')
})

test('morning-to-noon shadows sweep right-back to left-back, never toward the windows', () => {
  for (const season of seasons) {
    const morning = solarState(SEASONS[season].sunrise + 1, season)
    const noon = solarState((SEASONS[season].sunrise + SEASONS[season].sunset) / 2, season)
    assert.ok(-morning.direction[0] > 0, 'morning shadow points right')
    assert.ok(-noon.direction[0] < 0, 'noon shadow points left')
    for (let hour = SEASONS[season].sunrise + .05; hour < SEASONS[season].sunset; hour += .05) {
      const [x, y, z] = solarState(hour, season).direction
      const floorShadow = [-x / y, -z / y]
      assert.ok(floorShadow[1] > 0, 'shadow extends away from the front windows')
    }
  }
})
test('snow is legal only in winter, and leaving winter resolves it to cloud', () => {
  for (const season of seasons) {
    const expected = season === 'winter' ? 'snow' : 'cloud'
    assert.equal(weatherForSeason('snow', season), expected)
    assert.equal(environmentState(12, season, 'snow').weather, expected)
    for (const weather of ['sun', 'cloud', 'rain'] as const) assert.equal(weatherForSeason(weather, season), weather)
  }
})
test('clear sunset has a stronger orange-red glow than noon or overcast sunset', () => {
  for (const season of seasons) {
    const sunset = SEASONS[season].sunset
    const clear = environmentState(sunset, season, 'sun')
    assert.ok(clear.sunsetGlow > .9)
    assert.equal(environmentState(12, season, 'sun').sunsetGlow, 0)
    assert.ok(environmentState(sunset, season, 'cloud').sunsetGlow < clear.sunsetGlow)
    assert.equal(environmentState(sunset, season, 'rain').sunsetGlow, 0)
    assert.equal(environmentState(sunset + 1, season, 'sun').sunsetGlow, 0)
  }
})
