import { solarState } from './environment'
import type { Weather, Season } from './environment'
import { COPY } from './i18n'
import type { Lang } from './i18n'

/* Levels are calibrated by measuring the real output, not by ear: the bed was
 * previously ~-52 dBFS at best (-78 at night, i.e. inaudible — the old numbers
 * were written for the brown-noise loop and never re-tuned when the source
 * became quieter white noise). These land the room at roughly -42 dBFS on a
 * clear day, -39 in rain, -48 in snow: present as a background, never a
 * foreground. Re-measure with a probe tap before changing them.
 */
export function ambientProfile(weather: Weather, hour: number, season: Season) {
  const day = solarState(hour, season).aboveHorizon
  return {
    bed: ({ sun: .045, cloud: .055, rain: .14, snow: .035 }[weather]) * (day ? 1 : .55),
    lowpass: weather === 'rain' ? 5200 : 2700,
    birds: day && weather === 'sun' && season !== 'winter',
    cicadas: day && season === 'summer' && (weather === 'sun' || weather === 'cloud') ? (weather === 'sun' ? .55 : .36) : 0,
  }
}
export function ambientDescription(weather: Weather, hour: number, season: Season, lang: Lang = 'zh') {
  const profile = ambientProfile(weather, hour, season), words = COPY[lang].sound.ambience
  if (weather === 'rain') return words.rain
  if (weather === 'snow') return words.snow
  if (profile.cicadas) return profile.birds ? words.cicadasBirds : words.cicadas
  return profile.birds ? words.birds : words.plain
}

export class RoomSound {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private gain: GainNode | null = null
  private filter: BiquadFilterNode | null = null
  private source: AudioBufferSourceNode | null = null
  private cicadaGain: GainNode | null = null
  private modulation: OscillatorNode | null = null
  private birds: ReturnType<typeof setTimeout> | null = null
  private weather: Weather = 'sun'
  private enabled = false
  private hour = 17
  private season: Season = 'summer'
  private note = 0
  private lastPluck = -1
  private lastMeow = -Infinity
  private meowBuffer: Promise<AudioBuffer> | null = null
  async playMeow() {
    this.context ??= new AudioContext()
    const ctx = this.context
    await ctx.resume()
    this.meowBuffer ??= fetch('assets/audio/daxia-v2/cat-soft-meow.wav').then(response => {
      if (!response.ok) throw new Error('Cat recording could not be loaded')
      return response.arrayBuffer()
    }).then(data => ctx.decodeAudioData(data)).catch(error => { this.meowBuffer = null; throw error })
    const buffer = await this.meowBuffer
    if (ctx.state === 'closed' || ctx.currentTime - this.lastMeow < buffer.duration + .08) return
    const start = ctx.currentTime; this.lastMeow = start
    const voice = ctx.createBufferSource(), envelope = ctx.createGain(), highpass = ctx.createBiquadFilter()
    voice.buffer = buffer; highpass.type = 'highpass'; highpass.frequency.value = 170; highpass.Q.value = .5
    envelope.gain.setValueAtTime(.00001, start); envelope.gain.linearRampToValueAtTime(.4, start + .018)
    envelope.gain.setValueAtTime(.4, start + buffer.duration - .04); envelope.gain.linearRampToValueAtTime(0, start + buffer.duration)
    voice.connect(highpass); highpass.connect(envelope); envelope.connect(ctx.destination); voice.start(start)
    voice.onended = () => { voice.disconnect(); highpass.disconnect(); envelope.disconnect() }
  }
  async playQin() {
    this.context ??= new AudioContext()
    const ctx = this.context
    await ctx.resume()
    if (ctx.currentTime - this.lastPluck < .12) return
    this.lastPluck = ctx.currentTime
    const frequency = [65.41, 73.42, 87.31, 98, 110, 130.81, 146.83][this.note++ % 7]
    // A damped plucked string: short excitation, warm body, fading harmonics.
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate), data = buffer.getChannelData(0)
    const period = Math.round(ctx.sampleRate / frequency)
    for (let i = 0; i < data.length; i++) {
      if (i < period) data[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / period)
      else data[i] = .497 * (data[i - period] + data[i - period + 1])
    }
    const source = ctx.createBufferSource(), gain = ctx.createGain(), filter = ctx.createBiquadFilter()
    source.buffer = buffer; filter.type = 'lowpass'; filter.frequency.value = 2200
    gain.gain.setValueAtTime(.0001, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.32, ctx.currentTime + .006)
    gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + 2.95)
    source.connect(filter); filter.connect(gain); gain.connect(ctx.destination); source.start()
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect() }
  }
  private createAmbience(ctx: AudioContext) {
    this.master = ctx.createGain(); this.master.gain.value = 0; this.master.connect(ctx.destination)
    this.gain = ctx.createGain(); this.gain.gain.value = 0; this.gain.connect(this.master)
    const highpass = ctx.createBiquadFilter(); highpass.type = 'highpass'; highpass.frequency.value = 500; highpass.Q.value = .7
    this.filter = ctx.createBiquadFilter(); this.filter.type = 'lowpass'; this.filter.Q.value = .6
    highpass.connect(this.filter); this.filter.connect(this.gain)
    // Uncorrelated white noise replaces the former bass-heavy brown-noise loop.
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 5, ctx.sampleRate), data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * .3
    this.source = ctx.createBufferSource(); this.source.buffer = buffer; this.source.loop = true; this.source.connect(highpass)
    const cicadaFilter = ctx.createBiquadFilter(); cicadaFilter.type = 'bandpass'; cicadaFilter.frequency.value = 4400; cicadaFilter.Q.value = 5
    const pulse = ctx.createGain(); pulse.gain.value = .65
    this.cicadaGain = ctx.createGain(); this.cicadaGain.gain.value = 0
    this.source.connect(cicadaFilter); cicadaFilter.connect(pulse); pulse.connect(this.cicadaGain); this.cicadaGain.connect(this.master)
    this.modulation = ctx.createOscillator(); this.modulation.type = 'sine'; this.modulation.frequency.value = 34
    const depth = ctx.createGain(); depth.gain.value = .28; this.modulation.connect(depth); depth.connect(pulse.gain)
    this.source.start(); this.modulation.start()
  }
  async toggle(enabled: boolean, weather: Weather, hour: number, season: Season) {
    this.enabled = enabled; this.weather = weather; this.hour = hour; this.season = season
    if (!enabled) {
      if (this.context) this.master?.gain.setTargetAtTime(0, this.context.currentTime, .16)
      if (this.birds) clearTimeout(this.birds); this.birds = null; return
    }
    this.context ??= new AudioContext()
    if (!this.master) this.createAmbience(this.context)
    await this.context.resume()
    if (!this.enabled) return
    this.master!.gain.setTargetAtTime(1, this.context.currentTime, .5); this.update(weather, hour, season)
    if (!this.birds) { this.chirp(); this.scheduleBirds() }
  }
  update(weather: Weather, hour: number, season: Season) {
    this.weather = weather; this.hour = hour; this.season = season
    if (!this.context || !this.enabled || !this.master) return
    const profile = ambientProfile(weather, hour, season), now = this.context.currentTime
    this.filter!.frequency.setTargetAtTime(profile.lowpass, now, .8)
    this.gain!.gain.setTargetAtTime(profile.bed, now, .8)
    this.cicadaGain!.gain.setTargetAtTime(profile.cicadas, now, 1.2)
  }
  private scheduleBirds() {
    this.birds = setTimeout(() => { this.birds = null; if (!this.enabled) return; this.chirp(); this.scheduleBirds() }, 6500 + Math.random() * 5500)
  }
  private chirp() {
    if (!this.context || !this.enabled || !this.master || !ambientProfile(this.weather, this.hour, this.season).birds) return
    const ctx = this.context
    for (let i = 0; i < 2; i++) {
      const o = ctx.createOscillator(), g = ctx.createGain(), start = ctx.currentTime + .3 + i * .26
      o.type = 'sine'; o.frequency.setValueAtTime(2200 + i * 170, start); o.frequency.exponentialRampToValueAtTime(3100, start + .055); o.frequency.exponentialRampToValueAtTime(2500, start + .16)
      g.gain.setValueAtTime(.00001, start); g.gain.exponentialRampToValueAtTime(.05, start + .026); g.gain.exponentialRampToValueAtTime(.00001, start + .21)
      o.connect(g); g.connect(this.master); o.start(start); o.stop(start + .23); o.onended = () => { o.disconnect(); g.disconnect() }
    }
  }
  dispose() { this.enabled = false; if (this.birds) clearTimeout(this.birds); this.source?.stop(); this.modulation?.stop(); void this.context?.close() }
}
