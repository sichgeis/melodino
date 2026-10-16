import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateLyrics,selectedVerses,lyricPosition} from '../../docs/lyric-timing.js';
import {ScoreClock} from '../../docs/score-clock.js';
const read=path=>JSON.parse(readFileSync(new URL(`../../docs/${path}`,import.meta.url)));
const data=read('lyrics/schlaf-kindlein-schlaf.json'),source=read('arrangements/schlaf-kindlein-schlaf-klarinette-researched-source.json');
test('three historical text verses each match all 30 melody notes, including pickups within lines',()=>{
  assert.equal(validateLyrics(data,source),data);
  assert.deepEqual(data.verses.map(v=>v.historical_number),[1,2,4]);
  for(const v of data.verses){
    assert.equal(v.lines.flatMap(l=>l.cues).length,30);
    assert.deepEqual(v.lines.map(l=>l.cues[0].at),[0,7,15,23,32]);
    assert.deepEqual(v.lines.flatMap(l=>l.cues).map(c=>[c.at,c.duration]),source.notes.map(n=>[n.at,n.duration]));
  }
});
test('syllable/line highlight changes on musical positions and holds the final word to the end',()=>{
  const verses=data.verses;
  const at=q=>lyricPosition(verses,40,{state:'playing',verse:1,quarter:q});
  assert.deepEqual([at(0).lineIndex,at(0).cueIndex],[0,0]);
  assert.deepEqual([at(2).lineIndex,at(2).cueIndex],[0,1]);
  assert.deepEqual([at(6.99).lineIndex,at(6.99).cueIndex],[0,3]);
  assert.deepEqual([at(7).lineIndex,at(7).cueIndex],[1,0]);
  assert.deepEqual([at(15).lineIndex,at(15).cueIndex],[2,0]);
  assert.deepEqual([at(23).lineIndex,at(23).cueIndex],[3,0]);
  assert.deepEqual([at(39.99).lineIndex,at(39.99).cueIndex],[4,3]);
  const pause=lyricPosition(verses,40,{state:'paused',verse:1,quarter:7});assert.equal(pause.cueIndex,0);
  const gap=lyricPosition(verses,40,{state:'playing',verse:1,quarter:40,inGap:true});
  assert.equal(gap.cueIndex,-1);assert.deepEqual(gap.next,{verseIndex:1,lineIndex:0});
  const finished=lyricPosition(verses,40,{state:'finished'});assert.equal(finished.verseIndex,2);assert.equal(finished.lineIndex,4);assert.equal(finished.cueIndex,-1);
});
test('selected verses define the musical queue, not their printed numbers',()=>{
  const queue=selectedVerses(data,['bell','home']);assert.deepEqual(queue.map(v=>v.id),['home','bell']);
  assert.equal(lyricPosition(queue,40,{state:'playing',verse:2,quarter:15}).verseIndex,1);
  assert.equal(queue[1].historical_number,4);
  assert.equal(lyricPosition([],40),null);
  assert.deepEqual(selectedVerses(data,[]),[]);
  assert.throws(()=>selectedVerses(data,['home','home']));assert.throws(()=>selectedVerses(data,['missing']));
});
test('actual clock repeats exactly for selected texts, with pauses and tempo changes still on the same quarter',()=>{
  const score=read('arrangements/schlaf-kindlein-schlaf-klarinette-researched-gentle.json');
  for(const ids of [['home'],['home','bell'],['home','sky','bell']]){
    const queue=selectedVerses(data,ids),starts=[],notifications=[];
    const synth={stopAllChannels(){},programChange(){},controllerChange(){},process(){},noteOff(){},noteOn(channel,midi){if(channel===0)starts.push([clock.frame,midi]);}};
    const clock=new ScoreClock(synth,44100,e=>notifications.push(e));clock.load(score,undefined,88,queue.length,4);clock.play();
    const render=()=>clock.render(new Float32Array(128),new Float32Array(128));
    render();clock.pause();const frame=clock.frame,q=clock.quarter;render();assert.equal(clock.frame,frame);
    clock.setTempo(104);assert.equal(clock.quarter,q);clock.play();while(clock.state==='playing')render();
    assert.equal(starts.length,30*queue.length);
    for(let v=1;v<queue.length;v++)assert.equal(starts[v*30][0],clock.frameAt(v*44));
    assert.equal(clock.frame,clock.frameAt(queue.length*40+(queue.length-1)*4));
    assert.equal(notifications.at(-1).verse,queue.length);
  }
});
test('bad or stale alignment is rejected before singing starts',()=>{
  for(const mutate of [
    d=>d.verses[0].lines[1].cues[0].at=8,
    d=>d.verses[0].lines[0].text='wrong',
    d=>d.verses[0].lines[0].cues[0].duration=NaN,
    d=>d.verses[0].id='other/path',
    d=>d.verses.push(d.verses[0])
  ]){const copy=structuredClone(data);mutate(copy);assert.throws(()=>validateLyrics(copy,source));}
  const stale=structuredClone(source);stale.notes[0].duration=1;assert.throws(()=>validateLyrics(data,stale));
});

test('five photographed Mond verses match the unchanged melody and leave its rest unmarked',()=>{
  const text=read('lyrics/der-mond-ist-aufgegangen.json'),melody=read('assets/der-mond-ist-aufgegangen/playback.json');
  assert.equal(validateLyrics(text,melody),text);
  assert.deepEqual(text.verses.map(v=>v.historical_number),[1,2,3,4,5]);
  for(const verse of text.verses){
    assert.equal(verse.lines.length,6);
    assert.deepEqual(verse.lines.map(l=>l.cues[0].at),[0,8,16,24,32,40]);
    assert.deepEqual(verse.lines.flatMap(l=>l.cues).map(c=>[c.at,c.duration]),melody.notes.map(n=>[n.at,n.duration]));
  }
  const at=q=>lyricPosition(text.verses,48,{state:'playing',verse:1,quarter:q});
  assert.equal(at(22.99).lineIndex,2);assert.ok(at(22.99).cueIndex>=0);
  assert.equal(at(23).cueIndex,-1);assert.equal(at(23.99).cueIndex,-1);
  assert.equal(at(24).lineIndex,3);assert.equal(at(24).cueIndex,0);
  const queue=selectedVerses(text,['moon','night']);
  assert.equal(queue.length,2);assert.equal(queue[1].historical_number,5);
  assert.equal(lyricPosition(queue,48,{state:'playing',verse:2,quarter:0}).verseIndex,1);
  assert.equal(text.verses[2].lines[5].text,'weil unsre Augen sie nicht sehen.');
  assert.equal(text.verses[4].lines[5].text,'und unsern kranken Nachbarn auch.');
  const stale=structuredClone(text);stale.verses[0].lines[2].cues.at(-1).duration++;
  assert.throws(()=>validateLyrics(stale,melody));
  const overlap=structuredClone(text);overlap.verses[0].lines[1].cues[0].at--;
  assert.throws(()=>validateLyrics(overlap,melody));
  const tooMany=structuredClone(text);tooMany.verses=Array(21).fill(text.verses[0]);
  assert.throws(()=>validateLyrics(tooMany,melody));
});

test('all five Mond texts play through with exact verse starts and no final gap',()=>{
  const text=read('lyrics/der-mond-ist-aufgegangen.json'),melody=read('assets/der-mond-ist-aufgegangen/playback.json');
  const starts=[];
  const synth={stopAllChannels(){},programChange(){},controllerChange(){},process(){},noteOff(){},noteOn(channel,midi){starts.push([clock.frame,midi]);}};
  const clock=new ScoreClock(synth,8000);clock.load(melody,'clarinet',200,text.verses.length,4);clock.play();
  while(clock.state==='playing')clock.render(new Float32Array(128),new Float32Array(128));
  assert.equal(starts.length,210);
  for(let verse=0;verse<5;verse++)assert.equal(starts[verse*42][0],clock.frameAt(verse*52));
  assert.equal(clock.frame,clock.frameAt(256));
  for(const invalid of [0,21,1.5,NaN,'5'])assert.throws(()=>clock.load(melody,'clarinet',88,invalid));
});
