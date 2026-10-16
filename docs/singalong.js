import {player} from './player.js?v=20261016-singalong';
import {validateLyrics,selectedVerses,lyricPosition} from './lyric-timing.js';
const $=id=>document.getElementById(id);
const root=$('sing-player'),viewport=$('lyrics'),play=$('play'),stop=$('stop');
const source='arrangements/schlaf-kindlein-schlaf-klarinette-researched-source.json';
let data,chosen=[],state='idle',view='sheet',lastKey='',snapshot={verse:1,quarter:0,inGap:false},rows=[];
async function json(path){const response=await fetch(path);if(!response.ok)throw Error('Datei nicht erreichbar.');return response.json();}
function setText(element,text){if(element.textContent!==text)element.textContent=text;}
function node(tag,text,className){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;}
function followCurrent(){
  if(view!=='scroll'||!$('follow').checked||!['playing','paused'].includes(state))return;
  const active=viewport.querySelector('.current-line');if(!active)return;
  const top=active.getBoundingClientRect().top-viewport.getBoundingClientRect().top+viewport.scrollTop-viewport.clientHeight*.3;
  viewport.scrollTo({top:Math.max(0,top),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
}
function renderText(){
  rows=[];viewport.replaceChildren();
  chosen.forEach((verse,vi)=>{
    const section=node('section',undefined,'lyric-verse');section.append(node('h3',`${data.verses.indexOf(verse)+1}. ${verse.label}`));
    const lines=verse.lines.map(line=>{
      const row=node('p',undefined,'lyric-line'),cues=[];
      const spoken=node('span',line.text,'sr-only'),visual=node('span');visual.setAttribute('aria-hidden','true');row.append(spoken,visual);
      for(const cue of line.cues){const span=node('span',cue.text);visual.append(span);if(cue.spaceAfter)visual.append(document.createTextNode(' '));cues.push(span);}
      section.append(row);return {row,cues};
    });rows.push({section,lines});viewport.append(section);
  });lastKey='';viewport.scrollTop=0;paint();
}
function paint(){
  const position=lyricPosition(chosen,data.quarters,{...snapshot,state});
  if(!position){viewport.replaceChildren(node('p','Wählt mindestens eine Strophe.'));$('verse-status').textContent='';return;}
  const key=JSON.stringify([view,state,position]);if(key===lastKey)return;lastKey=key;
  rows.forEach(({section,lines},vi)=>{
    section.hidden=view==='sheet'?vi!==position.verseIndex:view==='karaoke'?vi!==position.verseIndex&&vi!==position.next?.verseIndex:false;
    lines.forEach(({row,cues},li)=>{
      const current=vi===position.verseIndex&&li===position.lineIndex,next=vi===position.next?.verseIndex&&li===position.next?.lineIndex;
      row.classList.toggle('current-line',current);row.classList.toggle('next-line',next);
      if(current)row.setAttribute('aria-current','true');else row.removeAttribute('aria-current');
      cues.forEach((cue,ci)=>cue.classList.toggle('active-cue',current&&ci===position.cueIndex));
    });
  });
  const original=data.verses.indexOf(chosen[position.verseIndex])+1;
  setText($('verse-status'),`Textstrophe ${original} · ${position.verseIndex+1} von ${chosen.length} ausgewählten Strophen`);
  followCurrent();
}
function display(update){
  state=update.state;root.dataset.state=state;
  if(update.verse!==undefined&&update.verse!==snapshot.verse&&update.quarter===undefined)snapshot.quarter=0;
  for(const key of ['verse','quarter','inGap'])if(update[key]!==undefined)snapshot[key]=update[key];
  if(['idle','loading'].includes(state))snapshot={verse:1,quarter:0,inGap:false};
  if(state==='finished')snapshot={verse:chosen.length,quarter:data.quarters,inGap:false};
  setText(play,{idle:'▶ Gemeinsam singen',loading:'Klänge laden …',playing:'Ⅱ Pause',paused:'▶ Weiter singen',finished:'▶ Noch einmal singen',error:'▶ Erneut versuchen'}[state]);
  play.disabled=state==='loading'||chosen.length===0;stop.disabled=['idle','error'].includes(state);
  $('sing-progress').value=snapshot.quarter;
  $('play-status').classList.toggle('error',state==='error');
  setText($('play-status'),update.message??({idle:'Lest die erste Zeile, dann startet die Musik.',loading:'Instrumente werden einmalig geladen …',paused:'Pausiert – Text und Musik warten auf euch.',finished:'Fertig gesungen. Schön, dass ihr zusammen gesungen habt.',error:'Die Musik konnte nicht geladen werden.'}[state]??(snapshot.inGap?'Zeit zum Atmen. Danach kommt die nächste Textstrophe.':'Singt mit der markierten Zeile.')));
  paint();
}
function setView(value){
  view=value;viewport.className=`lyric-viewport mode-${view}`;lastKey='';
  document.querySelectorAll('[data-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.view===view)));
  $('follow-control').hidden=view!=='scroll';
  $('view-description').textContent={sheet:'Die ganze aktuelle Strophe – die gesungene Zeile ist markiert.',karaoke:'Die aktuelle Silbe ist markiert. Darunter seht ihr, was als Nächstes kommt.',scroll:'Große Schrift für alle Strophen. Der Textbereich folgt der aktuellen Zeile.'}[view];paint();
}
function choose(){
  player.stop(root);chosen=selectedVerses(data,[...$('verse-choices').querySelectorAll('input:checked')].map(input=>input.value));
  snapshot={verse:1,quarter:0,inGap:false};state='idle';root.dataset.state=state;
  $('selection-summary').textContent=chosen.length?`${chosen.length} Textstrophen · die Musik spielt automatisch ${chosen.length===1?'einmal':chosen.length+' Durchgänge'}.`:'Wählt mindestens eine Strophe.';
  renderText();display({state:'idle'});
}
try{
  const [lyrics,score]=await Promise.all([json('lyrics/schlaf-kindlein-schlaf.json'),json(source)]);
  data=validateLyrics(lyrics,score);
  data.verses.forEach((verse,index)=>{
    const label=node('label',undefined,'verse-choice'),input=node('input');input.type='checkbox';input.checked=true;input.value=verse.id;
    label.append(input,node('span',`${index+1}. ${verse.label}`));input.addEventListener('change',choose);$('verse-choices').append(label);
  });
  choose();setView('sheet');$('ready').hidden=false;$('load-message').hidden=true;
  document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>setView(button.dataset.view)));
  $('follow').addEventListener('change',followCurrent);
  for(const input of [$('arrangement'),$('gap')])input.addEventListener('change',()=>player.stop(root));
  $('tempo').addEventListener('input',()=>{$('tempo-text').textContent=`${$('tempo').value} Viertel / Minute`;player.tempo(root,Number($('tempo').value));});
  $('melody').addEventListener('change',()=>player.mix(root,.8,$('melody').checked));
  $('arrangement').addEventListener('change',()=>{
    const solo=$('arrangement').value==='warm';$('melody').disabled=solo;if(solo)$('melody').checked=true;
  });
  play.addEventListener('click',()=>{
    if(state==='playing')player.pause(root);
    else if(state==='paused')player.resume(root);
    else if(chosen.length)player.start(root,{
      url:`arrangements/schlaf-kindlein-schlaf-klarinette-researched-${$('arrangement').value}.json`,sourceUrl:source,
      bpm:Number($('tempo').value),verses:chosen.length,gapQuarters:Number($('gap').value),backing:.8,melody:$('melody').checked,reportHz:30
    },display);
  });stop.addEventListener('click',()=>player.stop(root));
}catch{
  $('load-message').textContent='Text und Musik konnten nicht vorbereitet werden. Bitte prüft die Verbindung und ladet die Seite neu.';
  $('load-message').setAttribute('role','alert');
}
