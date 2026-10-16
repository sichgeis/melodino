import {selectedVerses,lyricPosition,validateLyrics} from './lyric-timing.js?v=20261016-mond-text';
function el(tag,text,className){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;}
export function validateTextCatalog(catalog,songs){
  if(!catalog||catalog.schema_version!==1||!Array.isArray(catalog.songs))throw Error('Ungültiger Textkatalog.');
  const known=new Set(songs.map(s=>s.slug)),seen=new Set();
  for(const entry of catalog.songs){
    if(!known.has(entry.slug)||seen.has(entry.slug)||!/^lyrics\/[a-z0-9]+(?:-[a-z0-9]+)*\.json$/.test(entry.url)||
        (entry.preferredVersion!==undefined&&!['original','researched'].includes(entry.preferredVersion)))throw Error('Ungültiger Textverweis.');
    seen.add(entry.slug);
  }return catalog;
}
export function createStrophePanel(data,source,onSelection){
  validateLyrics(data,source);
  const panel=el('section',undefined,'strophe-panel');panel.setAttribute('aria-label','Text zum Mitsingen');
  const heading=el('p',undefined,'strophe-heading'),body=el('div',undefined,'strophe-lines');panel.append(heading,body);
  const choices=el('fieldset',undefined,'strophe-choices');choices.append(el('legend','Welche Strophen singen wir?'));
  const inputs=[];let chosen=data.verses,snapshot={state:'idle',verse:1,quarter:0,inGap:false},key='';
  data.verses.forEach((verse,index)=>{
    const label=el('label',undefined,'strophe-choice'),input=el('input');input.type='checkbox';input.checked=true;input.value=verse.id;inputs.push(input);
    label.append(input,el('span',`${index+1}. ${verse.label}`));choices.append(label);
    input.addEventListener('change',()=>{
      chosen=selectedVerses(data,inputs.filter(i=>i.checked).map(i=>i.value));snapshot={state:'idle',verse:1,quarter:0,inGap:false};key='';paint();onSelection();
    });
  });
  function paint(){
    const position=lyricPosition(chosen,data.quarters,snapshot);
    if(!position){heading.textContent='Keine Strophe ausgewählt';body.replaceChildren(el('p','Wählt unter „Strophen & Klang“ mindestens eine Strophe.'));return;}
    const verse=chosen[position.verseIndex],newKey=verse.id;
    if(key!==newKey){body.replaceChildren(...verse.lines.map(line=>el('p',line.text,'strophe-line')));key=newKey;}
    const label=`Textstrophe ${data.verses.indexOf(verse)+1} · ${position.verseIndex+1} von ${chosen.length}`;
    if(heading.textContent!==label)heading.textContent=label;
    [...body.children].forEach((row,i)=>{
      const active=i===position.lineIndex&&position.cueIndex>=0&&['playing','paused'].includes(snapshot.state)&&!snapshot.inGap;
      row.classList.toggle('active-line',active);
      if(active)row.setAttribute('aria-current','true');else row.removeAttribute('aria-current');
    });
  }
  function update(change){
    if(change.verse!==undefined&&change.verse!==snapshot.verse&&change.quarter===undefined)snapshot.quarter=0;
    snapshot={...snapshot,...change};
    if(['idle','loading'].includes(snapshot.state))snapshot={state:snapshot.state,verse:1,quarter:0,inGap:false};
    if(snapshot.state==='finished')snapshot={state:'finished',verse:chosen.length,quarter:data.quarters,inGap:false};
    paint();
  }
  paint();return {panel,choices,update,get count(){return chosen.length;}};
}
