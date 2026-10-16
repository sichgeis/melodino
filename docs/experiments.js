import {player} from './player.js?v=20261016-experiments';
const root = document.querySelector('#experiments');
const status = document.querySelector('#status');
function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function select(label, choices) {
  const wrapper = el('label', undefined, 'field');
  const input = el('select'); input.setAttribute('aria-label', label);
  for (const [value, text] of choices) { const option=el('option',text);option.value=value;input.append(option); }
  wrapper.append(el('span',label),input);
  return {wrapper,input};
}
function card(song) {
  if (!/^[a-z]+(?:-[a-z]+)*$/.test(song.id) || typeof song.title !== 'string' ||
      !Number.isFinite(song.bpm) || !Number.isFinite(song.quarters) || song.quarters<=0 ||
      ![0,1,2].includes(song.verse_gap_bars) || !Number.isFinite(song.measure_quarters) ||
      !Array.isArray(song.variants) || song.variants.length!==4) throw Error('Ungültiges Experiment.');
  for (const v of song.variants) if (!['reference','warm','gentle','lively'].includes(v.id) ||
      v.url !== `experiments/data/${song.id}-${v.id}.json` || typeof v.label !== 'string' || typeof v.description !== 'string') throw Error('Ungültiger Hörvergleich.');
  const article = el('article',undefined,'song lab-card'); article.id=song.id;article.dataset.state='idle';
  article.append(el('span','KLANGEXPERIMENT','eyebrow'),el('h2',song.title));
  const variant=select('Hörvariante',song.variants.map(v=>[v.id,v.label]));variant.input.value='warm';
  const description=el('p',undefined,'lab-description');
  const verses=select('Strophen',[['1','1 Strophe'],['2','2 Strophen'],['infinite','Endlos ↻']]);verses.input.value='2';
  const gap=select('Strophenpause',[['0','keine'],['1','1 Takt'],['2','2 Takte']]);gap.input.value=song.verse_gap_bars;
  const fields=el('div',undefined,'player-fields');fields.append(verses.wrapper,gap.wrapper);
  const tempoLabel=el('label',undefined,'lab-label'),tempoText=el('span'),tempo=el('input');
  tempo.type='range';tempo.min=40;tempo.max=200;tempo.value=song.bpm;tempo.setAttribute('aria-label','Tempo');tempoLabel.append(tempoText,tempo);
  const mixLabel=el('label',undefined,'lab-label'),mixText=el('span'),mix=el('input');
  mix.type='range';mix.min=0;mix.max=100;mix.value=80;mix.setAttribute('aria-label','Begleitlautstärke');mixLabel.append(mixText,mix);
  const melodyLabel=el('label',undefined,'lab-toggle'),melody=el('input');melody.type='checkbox';melody.checked=true;melodyLabel.append(melody,el('span','Melodie hörbar'));
  const meta=el('p',`Originaltonhöhe · ${song.verse_gap_bars?'1 Takt Atemzeit vorgeschlagen':'Lange Schlussnote · keine Zusatzpause vorgeschlagen'}`,'lab-meta');
  const controls=el('div',undefined,'play-controls'),play=el('button','▶ Abspielen','play-button'),stop=el('button','■ Zum Anfang','stop-button');
  play.type=stop.type='button';stop.disabled=true;controls.append(play,stop);
  const message=el('p','Bereit zum Vergleichen.','lab-status');message.setAttribute('role','status');
  const progress=el('progress');progress.max=song.quarters;progress.value=0;progress.setAttribute('aria-label','Strophenfortschritt');
  let state='idle';
  function display(update) {
    state=update.state;article.dataset.state=state;
    if(update.quarter!==undefined)progress.value=update.quarter;
    if(state==='idle')progress.value=0;
    if(state==='finished')progress.value=song.quarters;
    play.textContent={idle:'▶ Abspielen',loading:'Klänge laden …',playing:'Ⅱ Pause',paused:'▶ Fortsetzen',finished:'▶ Noch einmal',error:'▶ Erneut versuchen'}[state];
    play.disabled=state==='loading';stop.disabled=['idle','error'].includes(state);
    message.classList.toggle('error',state==='error');
    message.textContent=update.message||({idle:'Bereit zum Vergleichen.',loading:'Instrumente werden einmalig geladen …',paused:'Pausiert.',finished:'Hörprobe beendet.'}[state]??`Strophe ${update.verse??1}${update.inGap?' · Atemzeit':' · '+variant.input.selectedOptions[0].textContent}`);
  }
  function updateMix(){mixText.textContent=`Begleitung: ${mix.value} %`;player.mix(article,Number(mix.value)/100,melody.checked);}
  function updateVariant(){
    player.stop(article);
    const choice=song.variants.find(v=>v.id===variant.input.value);description.textContent=choice.description;
    const solo=['reference','warm'].includes(choice.id);mix.disabled=melody.disabled=solo;
    // Solo variants always remain audible, even after trying "only backing".
    if(solo)melody.checked=true;
  }
  tempo.addEventListener('input',()=>{tempoText.textContent=`Tempo: ${tempo.value} Viertel / Minute`;player.tempo(article,Number(tempo.value));});
  tempoText.textContent=`Tempo: ${tempo.value} Viertel / Minute`;
  mix.addEventListener('input',updateMix);melody.addEventListener('change',updateMix);updateMix();updateVariant();
  variant.input.addEventListener('change',updateVariant);
  for(const input of [verses.input,gap.input])input.addEventListener('change',()=>player.stop(article));
  play.addEventListener('click',()=>{
    if(state==='playing')player.pause(article);
    else if(state==='paused')player.resume(article);
    else player.start(article,{url:song.variants.find(v=>v.id===variant.input.value).url,bpm:Number(tempo.value),
      verses:verses.input.value==='infinite'?Infinity:Number(verses.input.value),gapQuarters:Number(gap.input.value)*song.measure_quarters,
      backing:Number(mix.value)/100,melody:melody.checked},display);
  });
  stop.addEventListener('click',()=>player.stop(article));
  article.append(variant.wrapper,description,fields,tempoLabel,mixLabel,melodyLabel,meta,controls,message,progress);
  return article;
}
try {
  const response=await fetch('experiments/catalog.json',{cache:'no-cache'});
  if(!response.ok)throw Error('Katalog nicht erreichbar.');
  const songs=await response.json();if(!Array.isArray(songs))throw Error('Ungültiger Katalog.');
  root.replaceChildren(...songs.map(card));status.hidden=true;
} catch {status.textContent='Die Hörvarianten konnten nicht geladen werden. Bitte prüfe die Verbindung und lade erneut.';status.setAttribute('role','alert');}
