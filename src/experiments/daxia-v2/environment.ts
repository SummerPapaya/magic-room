/** An art-directed, window-facing daylight path, rather than a geographic ephemeris.
 * The shared panorama and directional light MUST use the same solar direction.
 * The full path stays in the front window hemisphere. The cutaway is not a light opening.
 * All seasons keep sunset on the central window axis; day length and altitude vary.
 */
export type Weather = 'sun' | 'cloud' | 'rain' | 'snow'
export type Season = 'spring' | 'summer' | 'autumn' | 'winter'
export const SEASONS = {
  spring: { name: '春', label: '春樱', description: '樱花绽开，新叶与花瓣一起迎风。', sunrise: 6, sunset: 18, altitude: 58 },
  summer: { name: '夏', label: '夏荫', description: '绿荫繁盛，漫长的白昼慢慢落幕。', sunrise: 5, sunset: 19, altitude: 74 },
  autumn: { name: '秋', label: '秋枫', description: '树梢染上金橙，落叶轻轻经过窗前。', sunrise: 6.25, sunset: 17.75, altitude: 48 },
  winter: { name: '冬', label: '冬雪', description: '远山覆雪，疏枝等着下一次春天。', sunrise: 7.25, sunset: 16.75, altitude: 30 },
} as const
export function smoothstep(a: number, b: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
export function formatHour(hour: number) {
  const minutes = Math.round(hour * 60)
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}
export function weatherForSeason(weather: Weather, season: Season): Weather {
  return weather === 'snow' && season !== 'winter' ? 'cloud' : weather
}
export function solarState(hour: number, season: Season) {
  const { sunrise, sunset, altitude } = SEASONS[season]
  const phase = (hour - sunrise) / (sunset - sunrise)
  // Morning light enters the left-front window; by noon it enters from the
  // right-front side, before returning to the central window for sunset.
  // No direction can illuminate the room through its open display/camera side.
  const azimuth = (phase <= .65
    ? -58 + 102 * smoothstep(0, .65, phase)
    : 44 * (1 - smoothstep(.65, 1, phase))) * Math.PI / 180
  const elevation = Math.sin(Math.PI * phase) * altitude * Math.PI / 180
  const direction: [number, number, number] = [Math.sin(azimuth) * Math.cos(elevation), Math.sin(elevation), -Math.cos(azimuth) * Math.cos(elevation)]
  const aboveHorizon = hour >= sunrise && hour < sunset
  const daylight = smoothstep(sunrise - .65, sunrise + .55, hour) * (1 - smoothstep(sunset - .4, sunset + .8, hour))
  const discVisibility = smoothstep(sunrise - .08, sunrise + .06, hour) * (1 - smoothstep(sunset, sunset + .1, hour))
  const direct = aboveHorizon ? smoothstep(0, .09, Math.sin(elevation)) * (1.1 + 1.7 * Math.max(0, Math.sin(elevation))) : 0
  const warm = (1 - smoothstep(.035, .45, Math.max(0, Math.sin(elevation)))) * daylight
  const goldenHour = (1 - smoothstep(0, 1.6, Math.min(Math.abs(hour - sunrise), Math.abs(hour - sunset)))) * daylight
  const sunsetWarmth = smoothstep(sunset - 2, sunset - .3, hour) * (1 - smoothstep(sunset + .15, sunset + 1, hour))
  const night = 1 - daylight
  return { sunrise, sunset, phase, azimuth, elevation, direction, aboveHorizon, daylight, discVisibility, direct, warm, goldenHour, sunsetWarmth, night }
}
export function environmentState(hour: number, season: Season, weather: Weather) {
  weather = weatherForSeason(weather, season)
  const sun = solarState(hour, season)
  const coverage = { sun: .06, cloud: .4, rain: 1, snow: .94 }[weather]
  const transmission = { sun: 1, cloud: .56, rain: 0, snow: 0 }[weather]
  const diffuseTransmission = { sun: 1, cloud: .92, rain: .56, snow: .78 }[weather]
  const direct = sun.direct * transmission
  const diffuse = (.14 + sun.daylight * 1.6) * diffuseTransmission
  const clearNight = sun.night * (1 - coverage) ** 3
  return { ...sun, weather, coverage, transmission, direct, diffuse, clearNight,
    sunsetGlow: sun.sunsetWarmth * (1 - coverage) ** 1.2,
    discVisibility: sun.discVisibility * (weather === 'rain' || weather === 'snow' ? 0 : 1),
    // A bulb has constant output; day/night perception changes with surrounding light.
    lampIntensity: 5,
  }
}
