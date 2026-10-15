import {instruments, validatePlayback} from './score-clock.js';

async function json(url) {
  const response = await fetch(url);
  if (!response.ok) throw Error('Die Notendatei konnte nicht geladen werden.');
  return validatePlayback(await response.json());
}
export class BrowserPlayer {
  constructor() {
    this.pending = new Map();
    this.id = 0;
    this.generation = 0;
    this.banks = new Set();
    this.scores = new Map();
    this.state = 'idle';
  }
  update(state, extra = {}) {
    this.state = state;
    this.listener?.({state, ...extra});
  }
  async initialize() {
    if (!this.context) {
      const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Context) throw Error('Dieser Browser unterstützt den Instrumentenplayer nicht. Bitte nutze einen Download.');
      this.context = new Context();
      this.context.onstatechange = () => {
        if (this.context.state !== 'running' && this.state === 'playing') {
          this.node?.port.postMessage({type: 'pause'});
          this.update('paused', {message: 'Wiedergabe unterbrochen. Zum Fortsetzen auf Abspielen tippen.'});
        }
      };
    }
    // Called directly within the user's click, before any asynchronous download.
    if (!this.context.audioWorklet) throw Error('Der Instrumentenplayer benötigt einen aktuellen Browser und HTTPS. Bitte nutze sonst einen Download.');
    const resume = this.context.resume();
    if (!this.initializing) {
      this.initializing = this.context.audioWorklet.addModule(new URL('./synth-worklet.js', import.meta.url))
        .then(() => {
          this.node = new AudioWorkletNode(this.context, 'melodino-synth', {numberOfInputs: 0,
            numberOfOutputs: 1, outputChannelCount: [2]});
          this.node.onprocessorerror = () => {
            this.update('error', {message: 'Der Instrumentenplayer wurde unterbrochen. Bitte lade die Seite neu.'});
          };
          const gain = this.context.createGain();
          gain.gain.value = .55;
          this.node.connect(gain).connect(this.context.destination);
          this.node.port.onmessage = ({data}) => {
            if (data.id) {
              const pending = this.pending.get(data.id);
              if (pending) {
                clearTimeout(pending.timeout);
                this.pending.delete(data.id);
                if (data.error) pending.reject(Error(data.error));
                else pending.resolve();
              }
            } else if (data.state && this.state !== 'loading' && this.state !== 'idle') {
              if (this.state === 'paused' && data.state === 'playing') return;
              this.update(data.state, data);
            }
          };
        }).catch(error => { this.initializing = undefined; throw error; });
    }
    await Promise.all([resume, this.initializing]);
  }
  request(data) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(Error('Das Instrument antwortet nicht. Bitte lade die Seite neu.'));
      }, 20000);
      this.pending.set(id, {resolve, reject, timeout});
      this.node.port.postMessage({...data, id});
    });
  }
  async start(owner, options, listener) {
    const token = ++this.generation;
    if (this.owner !== owner) this.listener?.({state: 'idle'});
    this.owner = owner;
    this.listener = listener;
    this.update('loading');
    try {
      const initialization = this.initialize();
      // Silence the previous song while the next instrument loads.
      if (this.node) this.node.port.postMessage({type: 'stop'});
      await initialization;
      if (token !== this.generation) return;
      await this.request({type: 'stop'});
      let score = this.scores.get(options.url);
      if (!score) {
        score = await json(options.url);
        this.scores.set(options.url, score);
      }
      if (token !== this.generation) return;
      if (!Object.hasOwn(instruments, options.instrument)) throw Error('Unbekanntes Instrument.');
      if (!this.banks.has(options.instrument)) {
        const response = await fetch(new URL(`./samples/${options.instrument}.sf2`, import.meta.url));
        if (!response.ok) throw Error('Das Instrument konnte nicht geladen werden. Bitte versuche es erneut.');
        const binary = await response.arrayBuffer();
        if (token !== this.generation) return;
        await this.request({type: 'bank', instrument: options.instrument, binary});
        this.banks.add(options.instrument);
      }
      if (token !== this.generation) return;
      await this.request({type: 'load', score, instrument: options.instrument, bpm: options.bpm,
        verses: options.verses});
      if (token !== this.generation) return;
      this.update('playing', {verse: 1, quarter: 0});
      await this.request({type: 'play'});
    } catch (error) {
      if (token === this.generation) {
        this.node?.port.postMessage({type: 'stop'});
        this.update('error', {message: error.message});
      }
    }
  }
  pause(owner) {
    if (this.owner !== owner || this.state !== 'playing') return;
    this.node.port.postMessage({type: 'pause'});
    this.update('paused');
  }
  async resume(owner) {
    if (this.owner !== owner || this.state !== 'paused') return;
    const token = this.generation;
    try {
      await this.context.resume();
      if (token !== this.generation) return;
      this.update('playing');
      await this.request({type: 'play'});
    } catch (error) {
      if (token === this.generation) this.update('error', {message: error.message});
    }
  }
  stop(owner) {
    if (owner !== this.owner) return;
    ++this.generation;
    this.node?.port.postMessage({type: 'stop'});
    this.update('idle');
  }
  tempo(owner, bpm) {
    if (this.owner === owner && ['playing', 'paused'].includes(this.state)) {
      this.node.port.postMessage({type: 'tempo', bpm});
    }
  }
}
export const player = new BrowserPlayer();
