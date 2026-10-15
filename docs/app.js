'use strict';
const root = document.querySelector('#songs');
const status = document.querySelector('#status');
const names = {bell: 'Glockenklang', clarinet: 'Klarinette'};
const filenames = {mp3: 'melody.mp3', wav: 'melody.wav', midi: 'melody.mid', musicxml: 'score.musicxml', csv: 'notes.csv'};
const labels = {mp3: 'MP3', wav: 'WAV', midi: 'MIDI', musicxml: 'MusicXML', csv: 'Notenliste'};
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function validate(song) {
  if (!song || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(song.slug) || song.slug.length > 80 ||
      typeof song.title !== 'string' || !Object.hasOwn(names, song.instrument) ||
      !Number.isFinite(song.bpm) || song.bpm <= 0 || !Number.isFinite(song.duration_seconds) ||
      song.duration_seconds <= 0 || !song.files || !song.files.wav) throw Error('Ungültiger Liedeintrag.');
  for (const [kind, path] of Object.entries(song.files)) {
    if (!Object.hasOwn(filenames, kind) || path !== `assets/${song.slug}/${filenames[kind]}`) {
      throw Error('Ungültiger Dateiverweis.');
    }
  }
}
function card(song, index) {
  validate(song);
  const article = element('article', `song ${song.instrument}`);
  const top = element('div', 'song-top');
  const badge = element('div', 'instrument');
  const icon = element('span', 'instrument-icon', song.instrument === 'bell' ? '♩' : '♪');
  icon.setAttribute('aria-hidden', 'true');
  badge.append(icon, element('span', '', names[song.instrument]));
  top.append(badge, element('span', 'edition', `Hörprobe ${String(index + 1).padStart(2, '0')}`));
  const title = element('h3', '', song.title);
  const seconds = Math.round(song.duration_seconds);
  const duration = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  const meta = element('p', 'meta', `${song.bpm} Viertel / Minute · ${duration} Min.`);
  const audio = element('audio');
  audio.controls = true;
  audio.preload = 'metadata';
  audio.setAttribute('aria-label', `${song.title}, ${names[song.instrument]}`);
  for (const [kind, type] of [['mp3', 'audio/mpeg'], ['wav', 'audio/wav']]) {
    if (!song.files[kind]) continue;
    const source = element('source');
    source.src = song.files[kind];
    source.type = type;
    audio.append(source);
  }
  audio.append('Dein Browser unterstützt den Audioplayer nicht. Nutze die Downloads darunter.');
  const error = element('p', 'error', 'Die Aufnahme konnte nicht geladen werden. Bitte lade die Seite neu oder nutze den WAV-Download.');
  error.hidden = true;
  error.setAttribute('role', 'alert');
  audio.addEventListener('error', () => { error.hidden = false; });
  // Only the selected player plays, so two melodies never overlap accidentally.
  audio.addEventListener('play', () => document.querySelectorAll('audio').forEach(other => { if (other !== audio) other.pause(); }));
  const controls = element('div', 'controls');
  const loop = element('label', 'loop');
  const check = element('input');
  check.type = 'checkbox';
  check.addEventListener('change', () => { audio.loop = check.checked; });
  loop.append(check, 'Wiederholen');
  const speed = element('div', 'speed');
  speed.setAttribute('role', 'group');
  speed.setAttribute('aria-label', 'Abspielgeschwindigkeit');
  for (const rate of [.75, 1, 1.25]) {
    const button = element('button', '', `${rate * 100} %`);
    button.type = 'button';
    button.setAttribute('aria-pressed', String(rate === 1));
    button.addEventListener('click', () => {
      audio.preservesPitch = true;
      audio.webkitPreservesPitch = true;
      audio.playbackRate = rate;
      speed.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    });
    speed.append(button);
  }
  controls.append(loop, speed);
  const downloads = element('div', 'downloads');
  for (const kind of Object.keys(filenames)) {
    if (!song.files[kind]) continue;
    const a = element('a', '', labels[kind]);
    a.href = song.files[kind];
    a.download = `${song.slug}.${kind === 'midi' ? 'mid' : kind}`;
    a.setAttribute('aria-label', `${labels[kind]} herunterladen: ${song.title}, ${names[song.instrument]}`);
    downloads.append(a);
  }
  article.append(top, title, meta, audio, error, controls, element('div', 'download-title', 'FÜR SPÄTER MITNEHMEN'), downloads);
  return article;
}
async function load() {
  try {
    const response = await fetch('library.json', {cache: 'no-cache'});
    if (!response.ok) throw Error(`HTTP ${response.status}`);
    const songs = await response.json();
    if (!Array.isArray(songs)) throw Error('Ungültiger Katalog.');
    const cards = songs.map(card);
    root.replaceChildren(...cards);
    document.querySelector('#count').textContent = `${songs.length} Hörproben`;
    status.textContent = songs.length ? '' : 'Hier ist bald Platz für euer erstes Lied.';
    status.hidden = songs.length > 0;
  } catch (err) {
    status.textContent = 'Die Liedersammlung konnte nicht geladen werden. Bitte prüfe die Verbindung und lade die Seite erneut.';
    status.setAttribute('role', 'alert');
  }
}
load();
