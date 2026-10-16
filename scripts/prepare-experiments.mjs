import {arrange} from './arrangement-tools.mjs';
// Deterministic arrangement suggestions; the confirmed melody exports stay untouched.
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const write = (path, data) => writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
const dir = 'docs/experiments/data';
mkdirSync(dir, {recursive: true});
const original = read('docs/assets/schlaf-kindlein-schlaf-klarinette/playback.json');
// Independent melody transcription, aligned to F/4/4 for an honest same-tempo comparison.
const measures = [
  [['A4',2],['G4',1],['G4',1]], [['F4',3],['C4',1]],
  [['A4',1],['A4',1],['G4',1],['G4',1]], [['F4',3],['F4',1]],
  [['B-4',1],['B-4',1],['G4',1],['G4',1]], [['C5',1],['C5',1],['A4',1],['A4',1]],
  [['B-4',1],['B-4',1],['G4',1],['G4',1]], [['C5',1],['C5',1],['A4',2]],
  [['B-4',2],['G4',1],['G4',1]], [['F4',4]]
];
write('examples/schlaf-kindlein-schlaf-vergleich.json', {
  title: 'Schlaf, Kindlein, schlaf – recherchierte Vergleichsmelodie',
  source: 'Gemeinfreie Reichardt-Melodie; unabhängig nach Liederkiste und Sing Kinderlieder geprüft, nach F transponiert; siehe research/schlaf-kindlein-schlaf.md',
  key: 'F', meter: '4/4', bpm: 104, measures
});
const pitches = {'A4':69,'G4':67,'F4':65,'C4':60,'B-4':70,'C5':72};
let at = 0;
const notes = measures.flatMap(m => m.map(([pitch,duration]) => {
  const n = {at, duration, midi: pitches[pitch]}; at += duration; return n;
}));
const comparison = {...original, title: 'Schlaf, Kindlein, schlaf – Vergleichsmelodie', notes};
const trees = read('docs/assets/was-muessen-das-fuer-baeume-sein-glocke/playback.json');
function harmony(id, standard) {
  if (id === 'trees') return [[.5,'G'],[8.5,'D'],[10.5,'G'],[12.5,'D'],[14.5,'G'],
    [16.5,'D'],[18.5,'G'],[20.5,'D'],[22.5,'G'],[28.5,'D'],[30.5,'G'],[32.5,'D'],[34.5,'G']];
  return [[0,'F'],[2,'C'],[4,'F'],[8,standard?'F':'C7'],[10,'C7'],[12,'F'],
    [15,standard?'F':'C7'],[16,'Gm'],[20,'F'],[24,'Gm'],[28,'F'],[32,standard?'Gm':'F'],[34,'C7'],[36,'F']];
}
const variants = [
  ['reference','0 · Bisheriger Soloklang','Zum direkten Vergleich: ursprünglicher Klang ohne neue Begleitung.'],
  ['warm','A · Pur und warm','Klarinette, sanfte Phrasendynamik und dezenter Raum.'],
  ['gentle','B · Sanft begleitet','Klarinette mit leisen gebrochenen Klavierakkorden und akustischem Bass.'],
  ['lively','C · Lebhaft begleitet','Flöte, gezupfte Nylongitarre, Bass und ein leiser Holzpuls.']
];
const catalog = [];
for (const [id, score, title, measure, pickup, defaultInstrument, standard] of [
  ['sleep',original,'Schlaf, Kindlein, schlaf · bisherige Melodie',4,0,'clarinet',false],
  ['sleep-standard',comparison,'Schlaf, Kindlein, schlaf · recherchierte Melodie',4,0,'clarinet',true],
  ['trees',trees,'Was müssen das für Bäume sein',2,.5,'glockenspiel',false]
]) {
  const choices = [];
  for (const [variant,label,description] of variants) {
    const data = arrange(score, {title, measure, pickup, defaultInstrument, plan: harmony(id === 'trees' ? 'trees' : 'sleep', standard)}, variant);
    const file = `${id}-${variant}.json`;
    write(`${dir}/${file}`,data);
    choices.push({id:variant,label,description,url:`experiments/data/${file}`});
  }
  catalog.push({id,title,bpm:score.bpm,quarters:score.quarters,measure_quarters:measure,
    verse_gap_bars:id==='trees'?1:0,variants:choices});
}
write('docs/experiments/catalog.json',catalog);
