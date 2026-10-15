import {player} from './player.js?v=20261015-verse-gap';
import {instruments} from './score-clock.js';
const root = document.querySelector('#songs');
const status = document.querySelector('#status');
const filenames = {mp3: 'melody.mp3', wav: 'melody.wav', midi: 'melody.mid', musicxml: 'score.musicxml', csv: 'notes.csv', playback: 'playback.json'};
const labels = {mp3: 'MP3', wav: 'WAV', midi: 'MIDI', musicxml: 'MusicXML', csv: 'Notenliste'};
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function validate(song) {
  if (!song || typeof song.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(song.slug) || song.slug.length > 80 ||
      typeof song.title !== 'string' || !['bell', 'clarinet'].includes(song.instrument) ||
      !Number.isFinite(song.bpm) || song.bpm <= 0 || !Number.isFinite(song.quarters) ||
      song.quarters <= 0 || !song.files?.playback) throw Error('Ungültiger Liedeintrag.');
  if (song.verse_gap_bars !== undefined && ![0, 1, 2].includes(song.verse_gap_bars)) throw Error('Ungültige Strophenpause.');
  if (song.measure_quarters !== undefined && (!Number.isFinite(song.measure_quarters) || song.measure_quarters <= 0 || song.measure_quarters > 64)) throw Error('Ungültige Taktlänge.');
  if (song.verse_gap_bars > 0 && song.measure_quarters === undefined) throw Error('Taktlänge fehlt.');
  for (const [kind, path] of Object.entries(song.files)) {
    if (!Object.hasOwn(filenames, kind) || path !== `assets/${song.slug}/${filenames[kind]}`) throw Error('Ungültiger Dateiverweis.');
  }
}
function selectField(label, choices) {
  const wrapper = element('label', 'field');
  const select = element('select');
  select.setAttribute('aria-label', label);
  for (const [value, name] of choices) {
    const option = element('option', '', name);
    option.value = value;
    select.append(option);
  }
  wrapper.append(element('span', '', label), select);
  return {wrapper, select};
}
function card(song) {
  validate(song);
  const article = element('article', 'song');
  article.dataset.state = 'idle';
  const top = element('div', 'song-top');
  const badge = element('div', 'instrument');
  const icon = element('span', 'instrument-icon', '♪');
  icon.setAttribute('aria-hidden', 'true');
  badge.append(icon, element('span', '', 'LIVE-INSTRUMENTE'));
  top.append(badge);
  const title = element('h3', '', song.title);
  const meta = element('p', 'meta');
  const instrument = selectField('Instrument', Object.entries(instruments).map(([id, i]) => [id, i.name]));
  instrument.select.value = song.instrument === 'bell' ? 'glockenspiel' : 'clarinet';
  const verses = selectField('Strophen', [['1', '1 Strophe'], ['2', '2 Strophen'], ['3', '3 Strophen'], ['4', '4 Strophen'], ['infinite', 'Endlos ↻']]);
  const gap = selectField('Strophenpause', [['0', 'keine'], ['1', '1 Takt'], ['2', '2 Takte']]);
  gap.select.value = String(song.verse_gap_bars ?? 0);
  gap.select.disabled = !song.measure_quarters;
  const fields = element('div', 'player-fields');
  fields.append(instrument.wrapper, verses.wrapper, gap.wrapper);
  const tempoLabel = element('label', 'tempo-label');
  const bpm = element('input');
  bpm.type = 'range'; bpm.min = '40'; bpm.max = '200'; bpm.step = '1';
  bpm.value = Math.max(40, Math.min(200, Math.round(song.bpm)));
  bpm.setAttribute('aria-label', 'Tempo in Vierteln pro Minute');
  const bpmText = element('span');
  tempoLabel.append(bpmText, bpm);
  const speed = element('div', 'speed');
  speed.setAttribute('role', 'group');
  speed.setAttribute('aria-label', 'Tempo-Schnellwahl');
  const updateTempo = () => {
    const value = Number(bpm.value);
    bpmText.textContent = `${value} Viertel / Minute`;
    const seconds = Math.round(song.quarters * 60 / value);
    meta.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} Min. pro Strophe · Originaltonhöhe`;
    player.tempo(article, value);
    speed.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.bpm) === value)));
  };
  for (const rate of [.75, 1, 1.25]) {
    const button = element('button', '', `${rate * 100} %`);
    button.type = 'button';
    button.dataset.bpm = Math.max(40, Math.min(200, Math.round(song.bpm * rate)));
    button.addEventListener('click', () => { bpm.value = button.dataset.bpm; updateTempo(); });
    speed.append(button);
  }
  bpm.addEventListener('input', updateTempo);
  updateTempo();
  const tempoRow = element('div', 'tempo-row');
  tempoRow.append(tempoLabel, speed);
  const controls = element('div', 'play-controls');
  const play = element('button', 'play-button', '▶ Abspielen');
  const stop = element('button', 'stop-button', '■ Zum Anfang');
  play.type = stop.type = 'button';
  stop.disabled = true;
  controls.append(play, stop);
  const message = element('p', 'player-message', 'Bereit zum Mitsingen.');
  message.setAttribute('role', 'status');
  const position = element('p', 'player-position');
  const progress = element('progress');
  progress.max = song.quarters;
  progress.value = 0;
  progress.setAttribute('aria-label', 'Fortschritt der Strophe');
  let state = 'idle', verse = 1, inGap = false;
  function display(update) {
    state = update.state;
    if (update.inGap !== undefined) inGap = update.inGap;
    if (['idle', 'finished', 'loading'].includes(state)) inGap = false;
    article.dataset.state = state;
    if (update.verse) verse = update.verse;
    if (update.quarter !== undefined) progress.value = update.quarter;
    if (state === 'idle') { progress.value = 0; verse = 1; }
    if (state === 'finished') progress.value = song.quarters;
    play.textContent = {idle: '▶ Abspielen', loading: 'Instrument lädt …', playing: 'Ⅱ Pause', paused: '▶ Fortsetzen', finished: '▶ Noch einmal', error: '▶ Erneut versuchen'}[state];
    play.disabled = state === 'loading';
    stop.disabled = ['idle', 'error'].includes(state);
    message.classList.toggle('error', state === 'error');
    const text = update.message || {idle: 'Bereit zum Mitsingen.', loading: 'Klang wird einmalig geladen …', playing: inGap ? 'Strophenpause · Zeit zum Atmen.' : 'Die Melodie spielt.', paused: 'Pausiert.', finished: 'Fertig gesungen.', error: 'Der Klang konnte nicht geladen werden.'}[state];
    if (message.textContent !== text) message.textContent = text;
    position.textContent = ['playing', 'paused', 'finished'].includes(state)
      ? `Strophe ${verse}${verses.select.value === 'infinite' ? ' · endlos' : ` von ${verses.select.value}`}` : '';
  }
  play.addEventListener('click', () => {
    if (state === 'playing') player.pause(article);
    else if (state === 'paused') player.resume(article);
    else player.start(article, {url: song.files.playback, instrument: instrument.select.value,
      gapQuarters: Number(gap.select.value) * (song.measure_quarters ?? 0), bpm: Number(bpm.value), verses: verses.select.value === 'infinite' ? Infinity : Number(verses.select.value)}, display);
  });
  stop.addEventListener('click', () => player.stop(article));
  for (const select of [instrument.select, verses.select, gap.select]) select.addEventListener('change', () => player.stop(article));
  const details = element('details', 'download-section');
  details.append(element('summary', '', 'Downloads & Aufnahme'));
  const downloads = element('div', 'downloads');
  for (const [kind, label] of Object.entries(labels)) {
    if (!song.files[kind]) continue;
    const a = element('a', '', label);
    a.href = song.files[kind]; a.download = `${song.slug}.${kind === 'midi' ? 'mid' : kind}`;
    a.setAttribute('aria-label', `${label} herunterladen: ${song.title}`);
    downloads.append(a);
  }
  details.append(downloads);
  if (song.files.wav || song.files.mp3) {
    details.append(element('p', 'recording-note', 'Die Aufnahme enthält das ursprüngliche Instrument und Tempo. Für mehrere Strophen den Instrumentenplayer oben verwenden.'));
    const audio = element('audio'); audio.controls = true; audio.preload = 'none';
    audio.setAttribute('aria-label', `Aufnahme: ${song.title}`);
    for (const [kind, type] of [['mp3', 'audio/mpeg'], ['wav', 'audio/wav']]) {
      if (!song.files[kind]) continue;
      const source = element('source'); source.src = song.files[kind]; source.type = type; audio.append(source);
    }
    const error = element('p', 'error', 'Aufnahme nicht geladen. Bitte nutze den WAV-Download oder versuche es erneut.');
    error.hidden = true; error.setAttribute('role', 'alert');
    audio.addEventListener('error', () => { error.hidden = false; });
    audio.addEventListener('play', () => {
      player.stop(player.owner);
      document.querySelectorAll('audio:not([data-melodino-output])').forEach(other => { if (other !== audio) other.pause(); });
    });
    play.addEventListener('click', () => document.querySelectorAll('audio:not([data-melodino-output])').forEach(other => other.pause()));
    details.append(audio, error);
  }
  article.append(top, title, meta, fields, tempoRow, controls, message, position, progress, details);
  return article;
}
async function load() {
  try {
    const response = await fetch('library.json', {cache: 'no-cache'});
    if (!response.ok) throw Error('Katalog nicht erreichbar.');
    const songs = await response.json();
    if (!Array.isArray(songs)) throw Error('Ungültiger Katalog.');
    root.replaceChildren(...songs.map(card));
    document.querySelector('#count').textContent = `${songs.length} Lieder`;
    status.textContent = songs.length ? '' : 'Hier ist bald Platz für euer erstes Lied.';
    status.hidden = songs.length > 0;
  } catch {
    status.textContent = 'Die Liedersammlung konnte nicht geladen werden. Bitte prüfe die Verbindung und lade die Seite erneut.';
    status.setAttribute('role', 'alert');
  }
}
load();
