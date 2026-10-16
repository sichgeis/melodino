// Musical positions are absolute quarter notes; AudioWorklet renders at exact frames.
export const instruments = Object.freeze({
  clarinet: {name: 'Klarinette', program: 71, gap: .06},
  glockenspiel: {name: 'Glockenspiel', program: 9, gap: 0},
  piano: {name: 'Klavier', program: 0, gap: 0},
  flute: {name: 'Flöte', program: 73, gap: .06},
  guitar: {name: 'Nylongitarre', program: 24, gap: .025},
  bass: {name: 'Akustischer Bass', program: 32, gap: .04},
  woodblock: {name: 'Holzblock', program: 115, gap: 0}
});
export function validatePlayback(score) {
  if (!score || ![1, 2].includes(score.schema_version) || typeof score.title !== 'string' ||
      !Number.isFinite(score.bpm) || score.bpm <= 0 ||
      !Number.isFinite(score.quarters) || score.quarters <= 0) throw Error('Ungültige Notendatei.');
  const tracks = score.schema_version === 1 ? [{notes: score.notes}] : score.tracks;
  if (!Array.isArray(tracks) || !tracks.length || tracks.length > 8) throw Error('Ungültige Stimmen.');
  if (score.room !== undefined && (!Number.isFinite(score.room) || score.room < 0 || score.room > 1)) throw Error('Ungültiger Raumklang.');
  let count = 0;
  for (const track of tracks) {
    if (score.schema_version === 2 && (!Object.hasOwn(instruments, track.instrument) ||
        !['melody', 'backing', 'rhythm'].includes(track.role) ||
        !Number.isInteger(track.volume) || track.volume < 0 || track.volume > 127 ||
        !Number.isInteger(track.pan) || track.pan < 0 || track.pan > 127)) throw Error('Ungültige Stimme.');
    if (!Array.isArray(track.notes) || !track.notes.length) throw Error('Ungültige Noten.');
    count += track.notes.length;
    for (const n of track.notes) {
      if (!n || !Number.isInteger(n.midi) || n.midi < 0 || n.midi > 127 ||
          !Number.isFinite(n.at) || n.at < 0 || !Number.isFinite(n.duration) || n.duration <= 0 ||
          n.at + n.duration > score.quarters + 1e-7 ||
          (n.velocity !== undefined && (!Number.isInteger(n.velocity) || n.velocity < 1 || n.velocity > 127))) throw Error('Ungültige Note.');
    }
  }
  if (count > 100000) throw Error('Zu viele Noten.');
  return score;
}
export function scoreTracks(score, instrument) {
  validatePlayback(score);
  if (score.schema_version === 2) return score.tracks;
  if (!Object.hasOwn(instruments, instrument)) throw Error('Unbekanntes Instrument.');
  return [{role: 'melody', instrument, volume: 100, pan: 64, notes: score.notes}];
}
export function makeEvents(score, instrument) {
  return scoreTracks(score, instrument).flatMap((track, channel) => {
    const gap = instruments[track.instrument].gap;
    return track.notes.flatMap(n => [
      {at: n.at, midi: n.midi, on: true, channel, velocity: n.velocity ?? 92},
      {at: n.at + n.duration - Math.min(gap, n.duration * .1), midi: n.midi, on: false, channel}
    ]);
  }).sort((a, b) => a.at - b.at || Number(a.on) - Number(b.on));
}
export class ScoreClock {
  constructor(synth, sampleRate, notify = () => {}) {
    this.synth = synth;
    this.sampleRate = sampleRate;
    this.notify = notify;
    this.state = 'idle';
    this.frame = 0;
  }
  load(score, instrument, bpm, verses, gapQuarters = 0) {
    this.stop();
    this.events = makeEvents(score, instrument);
    this.length = score.quarters;
    if (!Number.isFinite(gapQuarters) || gapQuarters < 0 || gapQuarters > 128) throw Error('Ungültige Strophenpause.');
    this.stride = this.length + gapQuarters;
    this.gap = gapQuarters;
    if (![1, 2, 3, 4, Infinity].includes(verses)) throw Error('Ungültige Strophenzahl.');
    this.verses = verses;
    this.cycle = 0;
    this.index = 0;
    this.frame = 0;
    this.epochFrame = 0;
    this.epochQuarter = 0;
    this.setTempo(bpm);
    this.tracks = scoreTracks(score, instrument);
    this.synth.setSystemParameter?.('reverbGain', score.room ?? 1);
    this.tracks.forEach((track, channel) => {
      this.synth.programChange(channel, instruments[track.instrument].program);
      this.synth.controllerChange?.(channel, 10, track.pan);
      this.synth.controllerChange?.(channel, 91, 40);
    });
    this.mix(1, true);
    this.state = 'paused';
  }
  mix(backing = 1, melody = true, rhythm = true, accompaniment = true) {
    if (!Number.isFinite(backing) || backing < 0 || backing > 1 || [melody, rhythm, accompaniment].some(value => typeof value !== 'boolean')) throw Error('Ungültige Mischung.');
    this.tracks?.forEach((track, channel) => {
      const gain = track.role === 'melody' ? Number(melody) : backing * Number(track.role === 'rhythm' ? rhythm : accompaniment);
      this.synth.controllerChange?.(channel, 7, Math.round(track.volume * gain));
    });
  }
  get quarter() {
    return this.epochQuarter + (this.frame - this.epochFrame) / this.framesPerQuarter;
  }
  setTempo(bpm) {
    if (!Number.isFinite(bpm) || bpm < 40 || bpm > 200) throw Error('Tempo muss zwischen 40 und 200 liegen.');
    const position = this.framesPerQuarter ? this.quarter : 0;
    this.epochFrame = this.frame;
    this.epochQuarter = position;
    this.bpm = bpm;
    this.framesPerQuarter = this.sampleRate * 60 / bpm;
  }
  frameAt(quarter) {
    // Never round each verse separately: phase is anchored across all repetitions.
    return Math.round(this.epochFrame + (quarter - this.epochQuarter) * this.framesPerQuarter);
  }
  play() { if (this.state === 'paused') this.state = 'playing'; }
  pause() { if (this.state === 'playing') this.state = 'paused'; }
  stop() {
    this.synth.stopAllChannels(true);
    this.state = 'idle';
    this.frame = 0;
  }
  render(left, right) {
    if (this.state === 'finished') {
      this.synth.process(left, right, 0, left.length);
      return;
    }
    if (this.state !== 'playing') return;
    let offset = 0;
    while (offset < left.length && this.state === 'playing') {
      const event = this.events[this.index];
      const boundary = !event;
      const position = this.cycle * this.stride + (boundary ? this.length + (this.cycle + 1 < this.verses ? this.gap : 0) : event.at);
      const eventFrame = this.frameAt(position);
      const count = Math.min(left.length - offset, Math.max(0, eventFrame - this.frame));
      if (count) {
        this.synth.process(left, right, offset, count);
        this.frame += count;
        offset += count;
      }
      if (this.frame < eventFrame) break;
      if (boundary) {
        this.cycle++;
        if (this.cycle >= this.verses) {
          this.state = 'finished';
          this.synth.stopAllChannels(false);
          this.notify({state: this.state, verse: this.cycle, frame: this.frame});
          if (offset < left.length) this.synth.process(left, right, offset, left.length - offset);
        } else {
          this.index = 0;
          this.notify({state: 'playing', verse: this.cycle + 1, inGap: false, frame: this.frame});
        }
      } else {
        if (event.on) this.synth.noteOn(event.channel, event.midi, event.velocity);
        else this.synth.noteOff(event.channel, event.midi);
        this.index++;
      }
    }
  }
}
