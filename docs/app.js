import {createStrophePanel,validateTextCatalog} from './strophe-panel.js?v=20261016-mond-text';
import {validateLyrics} from './lyric-timing.js?v=20261016-mond-text';
import {validateArrangements} from './song-options.js?v=20261016-strophes';
import {player} from './player.js?v=20261016-mond-text';
import {instruments} from './score-clock.js?v=20261016-strophes';
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
function card(song, arrangement, textInfo) {
  validate(song);
  const article = element('article', 'song');
  article.dataset.state = 'idle';
  article.id = song.slug;
  const top = element('div', 'song-top');
  const badge = element('div', 'instrument');
  const icon = element('span', 'instrument-icon', '♪');
  icon.setAttribute('aria-hidden', 'true');
  badge.append(icon, element('span', '', 'LIVE-INSTRUMENTE'));
  const versionBadge = element('span', 'edition', 'Recherchierte Melodie');
  versionBadge.hidden = true;
  top.append(badge, versionBadge);
  const title = element('h3', '', song.title);
  const meta = element('p', 'meta');
  const version = selectField('Melodiefassung', (arrangement?.versions ?? [{id: 'original', label: 'Übertragene Melodie'}]).map(v => [v.id, v.label]));
  version.wrapper.classList.add('melody-version');
  if (textInfo?.data && arrangement?.versions.some(v=>v.id===textInfo.preferredVersion)) version.select.value=textInfo.preferredVersion;
  const availableVersions = arrangement?.versions ?? [];
  const currentVersion = () => availableVersions.find(v => v.id === version.select.value);
  const style = selectField('Klang', (currentVersion()?.variants ?? [{id:'reference',label:'Solo · ohne Begleitung'}]).map(v => [v.id, v.label]));
  style.select.value = arrangement ? 'gentle' : 'reference';
  const description = element('p', 'arrangement-description');
  const instrument = selectField('Melodieinstrument', [['auto','Automatisch'], ...Object.entries(instruments).filter(([id]) => ['clarinet','glockenspiel','piano','flute','guitar'].includes(id)).map(([id,i]) => [id,i.name])]);
  const verses = selectField('Strophen', [['1','1 Strophe'],['2','2 Strophen'],['3','3 Strophen'],['4','4 Strophen'],['infinite','Endlos ↻']]);
  const gap = selectField('Strophenpause', [['0','keine'],['1','1 Takt'],['2','2 Takte']]);
  gap.select.value = String(song.verse_gap_bars ?? 0);gap.select.disabled = !song.measure_quarters;
  let lyricPanel;
  const automaticCount = element('p','automatic-count');
  if (textInfo?.data) lyricPanel = createStrophePanel(textInfo.data,textInfo.source,()=>{
    player.stop(article);updateTempo();display({state:'idle'});
  });
  const fields = element('div', 'player-fields main-fields');fields.append(style.wrapper, lyricPanel ? automaticCount : verses.wrapper);
  const settings = element('details', 'sound-settings');
  settings.append(element('summary', '', lyricPanel ? 'Strophen & Klang' : 'Klang & Einstellungen'));
  if (lyricPanel) settings.append(lyricPanel.choices);
  const extraFields = element('div', 'player-fields');
  if (availableVersions.length > 1) extraFields.append(version.wrapper);
  extraFields.append(instrument.wrapper, gap.wrapper);
  const toggles = element('div', 'track-toggles');
  function toggle(label) {
    const wrapper = element('label', 'track-toggle');
    const input = element('input');input.type='checkbox';input.checked=true;
    wrapper.append(input,element('span','',label));toggles.append(wrapper);return input;
  }
  const melody = toggle('Melodie'), accompaniment = toggle('Begleitung'), rhythm = toggle('Rhythmus');
  const mixLabel = element('label', 'tempo-label mix-label'), mixText = element('span');
  const mix = element('input');mix.type='range';mix.min='0';mix.max='100';mix.value='80';mix.setAttribute('aria-label','Begleitlautstärke');
  mixLabel.append(mixText,mix);
  const mixHint = element('p', 'settings-hint', 'Begleitung und Rhythmus sind eigene Arrangementvorschläge.');
  function updateMix() {
    mixText.textContent=`Begleitlautstärke: ${mix.value} %`;
    player.mix(article,Number(mix.value)/100,melody.checked,rhythm.checked,accompaniment.checked);
  }
  for (const input of [melody,accompaniment,rhythm]) input.addEventListener('change',updateMix);
  mix.addEventListener('input',updateMix);updateMix();
  function updateStyle() {
    player.stop(article);
    versionBadge.hidden = version.select.value !== 'researched';
    const choice = currentVersion()?.variants.find(v => v.id === style.select.value);
    const text = choice?.description ?? 'Nur die Melodie, mit eurem Wunschinstrument.';
    description.textContent = instrument.select.value === 'auto' ? text : text.replace(/^(Klarinette|Flöte)/, instruments[instrument.select.value].name);
    const backing = ['gentle','lively'].includes(style.select.value);
    accompaniment.disabled = !backing;rhythm.disabled = style.select.value !== 'lively';mix.disabled = !backing;
    melody.disabled = !backing;
    if (!backing) melody.checked = true;
  }
  instrument.select.addEventListener('change',updateStyle);
  style.select.addEventListener('change',updateStyle);
  version.select.addEventListener('change',updateStyle);
  updateStyle();
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
    const count = lyricPanel?.count;
    const quarters = count === undefined ? song.quarters : count*song.quarters+Math.max(0,count-1)*Number(gap.select.value)*(song.measure_quarters??0);
    const seconds = Math.round(quarters * 60 / value);
    automaticCount.textContent = `${count ?? 0} Textstrophen · automatisch`;
    meta.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} Min.${count === undefined ? ' pro Strophe' : ' insgesamt'} · Originaltonhöhe`;
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
  settings.append(extraFields, tempoRow, toggles, mixLabel, mixHint);
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
    const previous = state;
    state = update.state;
    if (state === 'playing' && previous === 'loading') updateMix();
    if (update.inGap !== undefined) inGap = update.inGap;
    if (['idle', 'finished', 'loading'].includes(state)) inGap = false;
    article.dataset.state = state;
    if (update.verse) verse = update.verse;
    if (update.quarter !== undefined) progress.value = update.quarter;
    if (state === 'idle') { progress.value = 0; verse = 1; }
    if (state === 'finished') progress.value = song.quarters;
    play.textContent = {idle: '▶ Abspielen', loading: 'Klänge laden …', playing: 'Ⅱ Pause', paused: '▶ Fortsetzen', finished: '▶ Noch einmal', error: '▶ Erneut versuchen'}[state];
    play.disabled = state === 'loading' || lyricPanel?.count === 0;
    stop.disabled = ['idle', 'error'].includes(state);
    message.classList.toggle('error', state === 'error');
    const text = update.message || {idle: 'Bereit zum Mitsingen.', loading: 'Klang wird einmalig geladen …', playing: inGap ? 'Strophenpause · Zeit zum Atmen.' : 'Die Musik spielt.', paused: 'Pausiert.', finished: 'Fertig gesungen.', error: 'Der Klang konnte nicht geladen werden.'}[state];
    if (message.textContent !== text) message.textContent = text;
    lyricPanel?.update(update);
    position.textContent = !lyricPanel && ['playing', 'paused', 'finished'].includes(state)
      ? `Strophe ${verse}${verses.select.value === 'infinite' ? ' · endlos' : ` von ${verses.select.value}`}` : '';
  }
  play.addEventListener('click', () => {
    if (state === 'playing') player.pause(article);
    else if (state === 'paused') player.resume(article);
    else {
      if (lyricPanel?.count === 0) return;
      const choice = currentVersion()?.variants.find(v => v.id === style.select.value);
      // Plain solo follows the actual source directly; it also remains a safe fallback.
      const source = currentVersion()?.source ?? song.files.playback;
      const plain = style.select.value === 'reference';
      player.start(article, {url: plain ? source : (choice?.url ?? source),
        sourceUrl: plain ? undefined : source,
        instrument: song.instrument === 'bell' ? 'glockenspiel' : 'clarinet',
        melodyInstrument: instrument.select.value === 'auto' ? undefined : instrument.select.value,
        backing: Number(mix.value)/100, melody: melody.checked,
        accompaniment: accompaniment.checked, rhythm: rhythm.checked,
        gapQuarters: Number(gap.select.value)*(song.measure_quarters ?? 0),bpm:Number(bpm.value),
        reportHz:lyricPanel?30:5,verses:lyricPanel ? lyricPanel.count : verses.select.value === 'infinite' ? Infinity : Number(verses.select.value)}, display);
    }
  });
  stop.addEventListener('click', () => player.stop(article));
  for (const select of [verses.select, gap.select]) select.addEventListener('change', () => {player.stop(article);updateTempo();});
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
  details.append(element('p','recording-note','Downloads enthalten die ursprüngliche übertragene Melodie. Begleitstimmen und recherchierte Alternativen sind nur im Browserplayer hörbar.'),downloads);
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
  article.append(top, title, meta, fields, description, controls, message, position, progress);
  if (lyricPanel) article.append(lyricPanel.panel);
  else article.append(element('p','text-note',textInfo?.error ? 'Der Text passt gerade nicht zur Melodie oder konnte nicht geladen werden. Instrumental könnt ihr weiterhören.' : 'Instrumental · Liedtext noch nicht hinterlegt.'));
  article.append(settings, details);
  return article;
}
async function loadJson(url){const response=await fetch(url);if(!response.ok)throw Error('Datei nicht erreichbar.');return response.json();}
async function load() {
  try {
    const response = await fetch('library.json', {cache: 'no-cache'});
    if (!response.ok) throw Error('Katalog nicht erreichbar.');
    const songs = await response.json();
    if (!Array.isArray(songs)) throw Error('Ungültiger Katalog.');
    let arrangements, fallback = false;
    try {
      const response = await fetch('arrangements/catalog.json', {cache: 'no-cache'});
      if (!response.ok) throw Error('Begleitungen nicht erreichbar.');
      arrangements = validateArrangements(await response.json(), songs);
    } catch { fallback = true; }
    const texts = new Map();
    try {
      const response = await fetch('lyrics/catalog.json',{cache:'no-cache'});
      if (!response.ok) throw Error('Textkatalog nicht erreichbar.');
      const textCatalog=validateTextCatalog(await response.json(),songs);
      await Promise.all(textCatalog.songs.map(async entry=>{
        try {
          const song=songs.find(s=>s.slug===entry.slug),versions=arrangements?.songs.find(s=>s.slug===entry.slug)?.versions??[];
          const sourcePath=versions.find(v=>v.id===entry.preferredVersion)?.source??song.files.playback;
          const [data,source]=await Promise.all([loadJson(entry.url),loadJson(sourcePath)]);
          validateLyrics(data,source);
          for(const version of versions)validateLyrics(data,await loadJson(version.source??song.files.playback));
          texts.set(entry.slug,{data,source,preferredVersion:entry.preferredVersion});
        } catch {texts.set(entry.slug,{error:true});}
      }));
    } catch { for(const song of songs)texts.set(song.slug,{error:true}); }
    root.replaceChildren(...songs.map(song => card(song, arrangements?.songs.find(entry => entry.slug === song.slug),texts.get(song.slug))));
    document.querySelector('#count').textContent = `${songs.length} Lieder`;
    status.textContent = songs.length ? '' : 'Hier ist bald Platz für euer erstes Lied.';
    if (fallback) status.textContent = 'Begleitungen sind gerade nicht erreichbar. Die Solomelodien könnt ihr weiterhin abspielen.';
    status.hidden = songs.length > 0 && !fallback;
  } catch {
    status.textContent = 'Die Liedersammlung konnte nicht geladen werden. Bitte prüfe die Verbindung und lade die Seite erneut.';
    status.setAttribute('role', 'alert');
  }
}
load();
