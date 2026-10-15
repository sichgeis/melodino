import {SoundBankLoader, SpessaSynthProcessor, SpessaLog} from './vendor/spessasynth-core-4.3.22.js';
import {ScoreClock} from './score-clock.js';
SpessaLog.info = () => {};
SpessaLog.group = () => {};
SpessaLog.groupCollapsed = () => {};
SpessaLog.groupEnd = () => {};
class MelodinoSynth extends AudioWorkletProcessor {
  constructor() {
    super();
    this.synth = new SpessaSynthProcessor(sampleRate);
    this.ready = false;
    this.clock = new ScoreClock(this.synth, sampleRate, data => this.port.postMessage(data));
    this.reportFrame = 0;
    this.port.onmessage = async ({data}) => {
      try {
        if (data.type === 'bank') {
          await this.synth.processorInitialized;
          const bank = SoundBankLoader.fromArrayBuffer(data.binary);
          this.synth.soundBankManager.addSoundBank(bank, data.instrument);
          this.ready = true;
        } else if (data.type === 'load') {
          if (!this.ready) throw Error('Instrument noch nicht geladen.');
          this.clock.load(data.score, data.instrument, data.bpm, data.verses);
          this.reportFrame = 0;
        } else if (data.type === 'play') this.clock.play();
        else if (data.type === 'pause') this.clock.pause();
        else if (data.type === 'stop') this.clock.stop();
        else if (data.type === 'tempo') this.clock.setTempo(data.bpm);
        this.port.postMessage({id: data.id, ok: true});
      } catch (error) {
        this.clock.stop();
        this.port.postMessage({id: data.id, error: error.message});
      }
    };
  }
  process(_inputs, outputs) {
    const [left, right] = outputs[0];
    if (!left || !right || !this.ready) return true;
    this.clock.render(left, right);
    if (this.clock.state === 'playing' && this.clock.frame >= this.reportFrame) {
      this.reportFrame = this.clock.frame + sampleRate / 5;
      this.port.postMessage({state: 'playing', verse: this.clock.cycle + 1,
        quarter: this.clock.quarter % this.clock.length, bpm: this.clock.bpm});
    }
    return true;
  }
}
registerProcessor('melodino-synth', MelodinoSynth);
