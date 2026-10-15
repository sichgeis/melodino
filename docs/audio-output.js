// WebKit treats media playback differently from ambient Web Audio in silent mode.
// https://bugs.webkit.org/show_bug.cgi?id=251532
export function configurePlaybackSession(navigator = globalThis.navigator) {
  try {
    if (!navigator?.audioSession) return false;
    navigator.audioSession.type = 'playback';
    return navigator.audioSession.type === 'playback';
  } catch {
    // Optional API: older engines and restricted webviews must still be usable.
    return false;
  }
}
export function isAppleMobile(navigator = globalThis.navigator) {
  return /iPhone|iPad|iPod/.test(navigator?.userAgent || '') ||
    (navigator?.platform === 'MacIntel' && navigator?.maxTouchPoints > 1);
}
const activationError = () => Error('Die Audioausgabe startet nicht. Bitte tippe erneut auf Abspielen. Auf dem iPhone die Seite direkt in Safari öffnen.');

export class AudioOutput {
  constructor(context, {navigator = globalThis.navigator, document = globalThis.document,
    hasPlaybackSession = configurePlaybackSession(navigator)} = {}) {
    this.activation = 0;
    this.context = context;
    this.navigator = navigator;
    this.destination = context.destination;
    if (isAppleMobile(navigator) && !hasPlaybackSession) {
      // Older iOS: send the actual synthesized audio through a media element.
      // No microphone, external clip, muted element, or second audible path.
      this.destination = context.createMediaStreamDestination();
      this.media = document.createElement('audio');
      this.media.srcObject = this.destination.stream;
      this.media.playsInline = true;
      this.media.setAttribute('playsinline', '');
      this.media.setAttribute('aria-hidden', 'true');
      this.media.setAttribute('data-melodino-output', '');
      this.media.hidden = true;
      document.body.append(this.media);
    }
  }
  async activate(timeoutMs = 8000) {
    const token = ++this.activation;
    clearTimeout(this.releaseTimer);
    configurePlaybackSession(this.navigator);
    // All three starts occur in the click handler, before the first await.
    const source = this.context.createBufferSource();
    source.buffer = this.context.createBuffer(1, 1, this.context.sampleRate);
    source.connect(this.destination);
    source.onended = () => source.disconnect();
    source.start(0);
    const resume = this.context.resume();
    const play = this.media?.play();
    let timer;
    try {
      await Promise.race([
        Promise.all([resume, play]),
        new Promise((_, reject) => { timer = setTimeout(() => reject(activationError()), timeoutMs); })
      ]);
      if (token !== this.activation) return;
      if (this.context.state !== 'running') throw activationError();
    } catch {
      if (token === this.activation) this.pause();
      throw activationError();
    } finally {
      clearTimeout(timer);
    }
  }
  pause() {
    ++this.activation;
    clearTimeout(this.releaseTimer);
    this.media?.pause();
  }
  finish() {
    // Let the last note release, then release a legacy media output session.
    if (this.media) this.releaseTimer = setTimeout(() => this.pause(), 1500);
  }
}
