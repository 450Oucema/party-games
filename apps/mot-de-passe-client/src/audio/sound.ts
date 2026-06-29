type SoundState = {
  muted: boolean
}

type Listener = (state: SoundState) => void
type Bus = 'music' | 'sfx'

const MUTED_KEY = 'mot-de-passe:sound-muted'
const MUSIC_VOLUME = 0.42
const SFX_VOLUME = 0.8

class SoundManager {
  private context: AudioContext | null = null
  private state: SoundState = {
    muted: localStorage.getItem(MUTED_KEY) === '1',
  }
  private listeners = new Set<Listener>()

  getState(): SoundState {
    return { ...this.state }
  }

  isMuted() {
    return this.state.muted
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  setMuted(muted: boolean) {
    this.state.muted = muted
    localStorage.setItem(MUTED_KEY, muted ? '1' : '0')
    this.emit()
  }

  toggleMuted() {
    this.setMuted(!this.state.muted)
    if (!this.state.muted) {
      void this.unlock()
      this.playUiClick()
    }
  }

  async unlock() {
    const context = this.getContext()
    if (!context) return
    if (context.state === 'suspended') await context.resume()
  }

  playUiClick() {
    this.tone('sfx', 620, 0.075, 'square', 0.32, 980)
    this.noise('sfx', 0.025, 0.06)
  }

  playSetting() {
    this.tone('sfx', 740, 0.07, 'square', 0.28, 900)
  }

  playJoin() {
    if (this.state.muted) return
    this.tone('sfx', 523, 0.07, 'square', 0.045)
    window.setTimeout(() => this.tone('sfx', 659, 0.08, 'square', 0.045), 90)
    window.setTimeout(() => {
      this.tone('sfx', 784, 0.15, 'square', 0.06)
      this.noise('sfx', 0.06, 0.025)
    }, 180)
  }

  playStart() {
    if (this.state.muted) return
    this.tone('sfx', 523, 0.10, 'square', 0.055)
    this.tone('sfx', 659, 0.10, 'square', 0.04)
    window.setTimeout(() => {
      this.tone('sfx', 784, 0.18, 'square', 0.07)
      this.noise('sfx', 0.09, 0.035)
    }, 130)
    window.setTimeout(() => this.tone('sfx', 1046, 0.28, 'square', 0.065, 880), 310)
  }

  playAccepted() {
    if (this.state.muted) return
    this.tone('sfx', 660, 0.08, 'square', 0.05)
    window.setTimeout(() => this.tone('sfx', 880, 0.12, 'square', 0.05), 80)
  }

  playRejected() {
    this.tone('sfx', 160, 0.12, 'sawtooth', 0.045, 92)
  }

  playFound() {
    if (this.state.muted) return
    this.tone('sfx', 523, 0.08, 'square', 0.05)
    window.setTimeout(() => this.tone('sfx', 659, 0.08, 'square', 0.05), 80)
    window.setTimeout(() => this.tone('sfx', 784, 0.15, 'square', 0.06), 160)
    window.setTimeout(() => this.noise('sfx', 0.06, 0.03), 260)
  }

  playPass() {
    if (this.state.muted) return
    this.tone('sfx', 220, 0.14, 'triangle', 0.06, 140)
  }

  playForbidden() {
    if (this.state.muted) return
    this.tone('sfx', 180, 0.16, 'sawtooth', 0.05, 110)
    this.noise('sfx', 0.05, 0.04)
  }

  playGameEnd() {
    this.tone('sfx', 392, 0.18, 'square', 0.06)
    window.setTimeout(() => this.tone('sfx', 523, 0.18, 'square', 0.06), 180)
    window.setTimeout(() => this.tone('sfx', 659, 0.3, 'square', 0.07, 880), 360)
  }

  playPodium() {
    this.tone('sfx', 523, 0.12, 'square', 0.06)
    window.setTimeout(() => this.tone('sfx', 659, 0.12, 'square', 0.06), 130)
    window.setTimeout(() => this.tone('sfx', 784, 0.12, 'square', 0.06), 260)
    window.setTimeout(() => this.tone('sfx', 1046, 0.25, 'square', 0.07), 390)
  }

  playCountdownTick(n: number) {
    const freq = n === 3 ? 660 : n === 2 ? 780 : n === 1 ? 920 : 1200
    const gain = n === 0 ? 0.09 : 0.06
    this.tone('sfx', freq, n === 0 ? 0.18 : 0.08, 'square', gain)
    if (n === 0) this.noise('sfx', 0.06, 0.06)
  }

  playAvatarChoice() {
    this.playUiClick()
  }

  playReplay() {
    this.playUiClick()
  }

  private tone(
    bus: Bus,
    frequency: number,
    duration: number,
    type: OscillatorType,
    gainValue: number,
    endFrequency?: number
  ) {
    if (this.state.muted) return
    const context = this.getContext()
    if (!context) return

    const volume = bus === 'music' ? MUSIC_VOLUME : SFX_VOLUME

    const now = context.currentTime
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, now)
    if (endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), now + duration)
    }
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(gainValue * volume, now + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(now)
    oscillator.stop(now + duration + 0.02)
  }

  private noise(bus: Bus, duration: number, gainValue: number) {
    if (this.state.muted) return
    const context = this.getContext()
    if (!context) return

    const volume = bus === 'music' ? MUSIC_VOLUME : SFX_VOLUME

    const buffer = context.createBuffer(1, Math.floor(context.sampleRate * duration), context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1

    const source = context.createBufferSource()
    const gain = context.createGain()
    gain.gain.value = gainValue * volume
    source.buffer = buffer
    source.connect(gain)
    gain.connect(context.destination)
    source.start()
  }

  private emit() {
    const state = this.getState()
    for (const listener of this.listeners) listener(state)
  }

  private getContext() {
    if (typeof window === 'undefined') return null
    if (!this.context) {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext
      this.context = new AudioContextCtor()
    }
    return this.context
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}

export const sound = new SoundManager()
