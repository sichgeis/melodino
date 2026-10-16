export function validateLyrics(data, score) {
  if(!data||data.schema_version!==1||typeof data.title!=='string'||!Number.isFinite(data.quarters)||data.quarters<=0||
      !Array.isArray(data.verses)||!data.verses.length||data.verses.length>20)throw Error('Ungültiger Liedtext.');
  const ids=new Set();
  for(const verse of data.verses){
    if(!verse||typeof verse.id!=='string'||!/^[a-z]+$/.test(verse.id)||ids.has(verse.id)||typeof verse.label!=='string'||
        !Array.isArray(verse.lines)||!verse.lines.length||verse.lines.length>20)throw Error('Ungültige Textstrophe.');
    ids.add(verse.id);let end=0,count=0;
    for(const line of verse.lines){
      if(typeof line.text!=='string'||!line.text.length||line.text.length>500||!Array.isArray(line.cues)||!line.cues.length)throw Error('Ungültige Textzeile.');
      let text='';
      for(const cue of line.cues){
        if(!cue||!Number.isFinite(cue.at)||cue.at<end-1e-7||(count===0&&cue.at!==0)||!Number.isFinite(cue.duration)||cue.duration<=0||
            cue.at+cue.duration>data.quarters+1e-7||typeof cue.text!=='string'||!cue.text.length||cue.text.length>80||typeof cue.spaceAfter!=='boolean')throw Error('Ungültige Silbenposition.');
        text+=cue.text+(cue.spaceAfter?' ':'');end=cue.at+cue.duration;count++;
      }
      if(text.trimEnd()!==line.text)throw Error('Text und Silben stimmen nicht überein.');
    }
    if(Math.abs(end-data.quarters)>1e-7||count>1000)throw Error('Unvollständige Textzuordnung.');
    if(score){
      const cues=verse.lines.flatMap(l=>l.cues);
      if(score.schema_version!==1||score.quarters!==data.quarters||score.notes.length!==cues.length||
          cues.some((cue,i)=>cue.at!==score.notes[i].at||cue.duration!==score.notes[i].duration))throw Error('Text und Melodierhythmus passen nicht zusammen.');
    }
  }
  return data;
}
export function selectedVerses(data, ids) {
  if(!Array.isArray(ids)||ids.some(id=>!data.verses.some(v=>v.id===id))||new Set(ids).size!==ids.length)throw Error('Ungültige Strophenauswahl.');
  return data.verses.filter(v=>ids.includes(v.id));
}
export function lyricPosition(verses, quarters, {verse=1,quarter=0,state='idle',inGap=false}={}) {
  if(!verses.length)return null;
  const index=state==='finished'?verses.length-1:Math.max(0,Math.min(verses.length-1,verse-1));
  const textVerse=verses[index],q=state==='finished'?quarters:Math.max(0,Math.min(quarters,quarter));
  let lineIndex=0;
  textVerse.lines.forEach((line,i)=>{if(line.cues[0].at<=q)lineIndex=i;});
  lineIndex=Math.max(0,lineIndex);
  const line=textVerse.lines[lineIndex];
  const cueIndex=inGap||!['playing','paused'].includes(state)?-1:line.cues.findIndex(c=>q>=c.at&&q<c.at+c.duration);
  const next=lineIndex+1<textVerse.lines.length?{verseIndex:index,lineIndex:lineIndex+1}:
    index+1<verses.length?{verseIndex:index+1,lineIndex:0}:null;
  return {verseIndex:index,lineIndex,cueIndex,next,inGap,finished:state==='finished'};
}
