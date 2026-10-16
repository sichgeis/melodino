import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateArrangements,configureScore} from '../../docs/song-options.js';
import {validatePlayback,ScoreClock,instruments} from '../../docs/score-clock.js';
import {SpessaSynthProcessor,SoundBankLoader,SpessaLog} from '../../docs/vendor/spessasynth-core-4.3.22.js';
for(const name of ['info','group','groupCollapsed','groupEnd'])SpessaLog[name]=()=>{};
const read=path=>JSON.parse(readFileSync(new URL(`../../docs/${path}`,import.meta.url)));
const library=read('library.json'),catalog=read('arrangements/catalog.json');
const identity=notes=>notes.map(({at,duration,midi})=>({at,duration,midi}));
test('every library song has four source-checked variants; alternative remains explicitly separate',()=>{
  validateArrangements(catalog,library);assert.equal(catalog.songs.length,library.length);
  for(const entry of catalog.songs){
    const song=library.find(s=>s.slug===entry.slug);
    for(const version of entry.versions){
      const source=read(version.source??song.files.playback);
      for(const v of version.variants){
        const score=read(v.url);validatePlayback(score);configureScore(score,undefined,source);
        assert.deepEqual(identity(score.tracks[0].notes),identity(source.notes));
        assert.equal(score.quarters,source.quarters);
        if(v.id==='lively')assert.ok(score.tracks.some(t=>t.role==='rhythm'));
        for(const track of score.tracks)assert.ok(Object.hasOwn(instruments,track.instrument));
      }
    }
  }
  const sleep=catalog.songs.find(s=>s.slug==='schlaf-kindlein-schlaf-klarinette');
  assert.deepEqual(sleep.versions.map(v=>v.id),['original','researched']);
});
test('arrangement catalog rejects traversal, external URLs, duplicate variants and hidden source replacement',()=>{
  const invalid=[
    c=>c.songs[0].versions[0].variants[0].url='../private.json',
    c=>c.songs[0].versions[0].variants[0].url='https://example.org/song.json',
    c=>c.songs[0].versions[0].variants[0].id='warm',
    c=>c.songs[0].versions[0].source='arrangements/other.json',
    c=>c.songs.push(c.songs[0]),
    c=>c.songs[0].slug='unknown'
  ];
  for(const mutate of invalid){const copy=structuredClone(catalog);mutate(copy);assert.throws(()=>validateArrangements(copy,library));}
});
test('changing melody instrument leaves pitches, backing and cached score intact; stale arrangements rejected',()=>{
  const entry=catalog.songs[0],song=library.find(s=>s.slug===entry.slug),v=entry.versions[0].variants.find(v=>v.id==='gentle');
  const score=read(v.url),source=read(song.files.playback),before=structuredClone(score);
  const changed=configureScore(score,'guitar',source);
  assert.equal(changed.tracks[0].instrument,'guitar');assert.deepEqual(identity(changed.tracks[0].notes),identity(source.notes));
  assert.deepEqual(changed.tracks.slice(1),score.tracks.slice(1));assert.deepEqual(score,before);
  const stale=structuredClone(source);stale.notes[0].midi++;
  assert.throws(()=>configureScore(score,undefined,stale),/Solo/);
  const rhythmChanged=structuredClone(source);rhythmChanged.notes[0].duration/=2;
  assert.throws(()=>configureScore(score,undefined,rhythmChanged),/Solo/);
  assert.throws(()=>configureScore(score,'__proto__',source));
});
test('melody, accompaniment and rhythm switches independently control actual MIDI channel volume',()=>{
  const score=read(catalog.songs[0].versions[0].variants.find(v=>v.id==='lively').url);
  const controls=[],synth={stopAllChannels(){},programChange(){},controllerChange(...args){controls.push(args);}};
  const clock=new ScoreClock(synth,44100);clock.load(score,undefined,104,1);
  clock.mix(.8,false,true,false);
  assert.deepEqual(controls.slice(-4),score.tracks.map((t,c)=>[c,7,t.role==='rhythm'?Math.round(t.volume*.8):0]));
  clock.mix(.5,true,false,true);
  assert.deepEqual(controls.slice(-4),score.tracks.map((t,c)=>[c,7,t.role==='melody'?t.volume:t.role==='backing'?Math.round(t.volume*.5):0]));
});
for(const slug of ['die-kuh-die-sass-im-schwalbennest','schlaf-kindlein-suesse','viel-glueck-und-viel-segen'])
  for(const variant of ['gentle','lively'])test(`real arranged audio and two-verse timing: ${slug}/${variant}`,async()=>{
    const entry=catalog.songs.find(s=>s.slug===slug),song=library.find(s=>s.slug===slug);
    const score=read(entry.versions[0].variants.find(v=>v.id===variant).url);
    const synth=new SpessaSynthProcessor(22050);await synth.processorInitialized;
    for(const id of new Set(score.tracks.map(t=>t.instrument))){
      const data=readFileSync(new URL(`../../docs/samples/${id}.sf2`,import.meta.url));
      synth.soundBankManager.addSoundBank(SoundBankLoader.fromArrayBuffer(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)),id);
    }
    const clock=new ScoreClock(synth,22050);clock.load(score,undefined,song.bpm,2,song.measure_quarters*song.verse_gap_bars);clock.play();
    let energy=0,peak=0;
    while(clock.state==='playing'){
      const l=new Float32Array(128),r=new Float32Array(128);clock.render(l,r);
      for(const a of [l,r])for(const x of a){assert.ok(Number.isFinite(x));energy+=x*x;peak=Math.max(peak,Math.abs(x)*.55);}
    }
    assert.ok(energy>2);assert.ok(peak<.95,`peak ${peak}`);
    assert.equal(clock.frame,clock.frameAt(2*score.quarters+song.measure_quarters*song.verse_gap_bars));synth.destroySynthProcessor();
  });
