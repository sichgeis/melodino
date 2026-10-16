import {validatePlayback,instruments} from './score-clock.js?v=20261016-main-arrangements';
export function validateArrangements(catalog, songs) {
  if(!catalog||catalog.schema_version!==1||!Array.isArray(catalog.songs))throw Error('Ungültiger Arrangementkatalog.');
  const known=new Set(songs.map(s=>s.slug)),seen=new Set();
  for(const entry of catalog.songs){
    if(!known.has(entry.slug)||seen.has(entry.slug)||!Array.isArray(entry.versions)||!entry.versions.length||entry.versions.length>2)throw Error('Ungültiges Arrangement.');
    seen.add(entry.slug);const versions=new Set();
    for(const v of entry.versions){
      if(!['original','researched'].includes(v.id)||versions.has(v.id)||typeof v.label!=='string'||!Array.isArray(v.variants)||v.variants.length!==4)throw Error('Ungültige Melodiefassung.');
      versions.add(v.id);
      if(v.id==='researched'&&v.source!==`arrangements/${entry.slug}-researched-source.json`)throw Error('Ungültige Vergleichsquelle.');
      if(v.id==='original'&&v.source!==undefined)throw Error('Ungültige Originalquelle.');
      const ids=new Set();
      for(const item of v.variants){
        if(!['reference','warm','gentle','lively'].includes(item.id)||ids.has(item.id)||
            typeof item.label!=='string'||typeof item.description!=='string'||
            item.url!==`arrangements/${entry.slug}-${v.id}-${item.id}.json`)throw Error('Ungültiger Arrangementpfad.');
        ids.add(item.id);
      }
    }
    if(!versions.has('original'))throw Error('Originalfassung fehlt.');
  }
  return catalog;
}
export function configureScore(score, melodyInstrument, source) {
  validatePlayback(score);
  if(melodyInstrument!==undefined&&!Object.hasOwn(instruments,melodyInstrument))throw Error('Unbekanntes Melodieinstrument.');
  if(source){
    validatePlayback(source);
    const melody=score.schema_version===1?score.notes:score.tracks.filter(t=>t.role==='melody').flatMap(t=>t.notes);
    const identity=notes=>notes.map(({at,duration,midi})=>[at,duration,midi]).sort((a,b)=>a[0]-b[0]||a[2]-b[2]||a[1]-b[1]);
    if(source.schema_version!==1||score.quarters!==source.quarters||JSON.stringify(identity(melody))!==JSON.stringify(identity(source.notes)))
      throw Error('Diese Begleitung passt nicht mehr zu den Noten. Bitte wähle Solo; die Begleitung muss neu erstellt werden.');
  }
  if(score.schema_version===1||melodyInstrument===undefined)return score;
  return {...score,tracks:score.tracks.map(track=>track.role==='melody'?{...track,instrument:melodyInstrument}:track)};
}
