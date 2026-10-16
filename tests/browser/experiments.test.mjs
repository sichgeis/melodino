import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ScoreClock,validatePlayback,instruments} from '../../docs/score-clock.js';
import {SpessaSynthProcessor,SoundBankLoader,SpessaLog} from '../../docs/vendor/spessasynth-core-4.3.22.js';
for(const name of ['info','group','groupCollapsed','groupEnd'])SpessaLog[name]=()=>{};
const read=path=>JSON.parse(readFileSync(new URL(`../../${path}`,import.meta.url)));
const catalog=read('docs/experiments/catalog.json');
const base=read('docs/assets/schlaf-kindlein-schlaf-klarinette/playback.json');
const canonical=read('examples/schlaf-kindlein-schlaf-vergleich.json');
const identity=notes=>notes.map(({at,duration,midi})=>({at,duration,midi}));
test('all twelve variants preserve their melody exactly and use valid local banks',()=>{
  assert.equal(catalog.length,3);
  for(const song of catalog){
    assert.equal(song.variants.length,4);
    const reference=read(`docs/${song.variants[0].url}`);
    for(const v of song.variants){
      assert.equal(v.url,`experiments/data/${song.id}-${v.id}.json`);
      const score=validatePlayback(read(`docs/${v.url}`));
      assert.equal(score.quarters,song.quarters);
      assert.deepEqual(identity(score.tracks[0].notes),identity(reference.tracks[0].notes));
      for(const t of score.tracks)assert.ok(readFileSync(new URL(`../../docs/samples/${t.instrument}.sf2`,import.meta.url)).length>0);
    }
  }
  const original=read('docs/experiments/data/sleep-reference.json');
  assert.deepEqual(identity(original.tracks[0].notes),identity(base.notes));
});
test('researched melody has four explicit differences, correct fifth measure and 40 quarters',()=>{
  const source=read('examples/schlaf-kindlein-schlaf.json');
  assert.equal(canonical.measures.length,10);
  assert.deepEqual(canonical.measures.map(m=>m.reduce((n,[,d])=>n+d,0)),Array(10).fill(4));
  assert.equal(canonical.measures.flat().length,30);
  assert.deepEqual(canonical.measures[4],[['B-4',1],['B-4',1],['G4',1],['G4',1]]);
  assert.deepEqual(canonical.measures.flatMap((m,i)=>JSON.stringify(m)===JSON.stringify(source.measures[i])?[]:[i+1]),[2,3,4,9]);
});
test('multitrack clock uses separate channels, exact two-verse timing, pause/tempo and mix',()=>{
  const score=read('docs/experiments/data/trees-lively.json');
  const ons=[],controllers=[],programs=[];
  const synth={process(){},stopAllChannels(){},programChange(...args){programs.push(args);},
    controllerChange(...args){controllers.push(args);},noteOff(){},noteOn(c,m,v){ons.push([clock.frame,c,m,v]);}};
  const clock=new ScoreClock(synth,44100);
  clock.load(score,undefined,88,2,2);
  assert.deepEqual(programs,score.tracks.map((t,c)=>[c,instruments[t.instrument].program]));
  clock.mix(.5,false);
  assert.deepEqual(controllers.slice(-4),score.tracks.map((t,c)=>[c,7,c?Math.round(t.volume*.5):0]));
  clock.play();clock.render(new Float32Array(128),new Float32Array(128));clock.pause();
  const position=clock.quarter;clock.render(new Float32Array(128),new Float32Array(128));assert.equal(clock.quarter,position);
  clock.setTempo(104);assert.equal(clock.quarter,position);clock.play();
  while(clock.state==='playing')clock.render(new Float32Array(128),new Float32Array(128));
  assert.equal(ons.length,2*score.tracks.reduce((n,t)=>n+t.notes.length,0));
  assert.equal(clock.frame,clock.frameAt(74));
  const melody=ons.filter(n=>n[1]===0);assert.equal(melody[60][0],clock.frameAt(38));
  assert.deepEqual(melody.slice(0,60).map(n=>n[2]),score.tracks[0].notes.map(n=>n.midi));
  for(const value of [-1,2,NaN])assert.throws(()=>clock.mix(value,true));
});
test('invalid track metadata, velocities and unsafe instruments are rejected',()=>{
  const score=read('docs/experiments/data/sleep-warm.json');
  for(const change of [{instrument:'__proto__'},{volume:128},{pan:NaN},{role:'other'},{notes:[{at:0,duration:1,midi:60,velocity:0}]}])
    assert.throws(()=>validatePlayback({...score,tracks:[{...score.tracks[0],...change}]}));
  assert.throws(()=>validatePlayback({...score,room:NaN}));
});
for(const song of catalog)for(const v of song.variants)test(`real full arrangement: ${song.id}/${v.id} has signal and safe output`,async()=>{
  const score=read(`docs/${v.url}`),synth=new SpessaSynthProcessor(22050);
  await synth.processorInitialized;
  for(const name of new Set(score.tracks.map(t=>t.instrument))){
    const bytes=readFileSync(new URL(`../../docs/samples/${name}.sf2`,import.meta.url));
    synth.soundBankManager.addSoundBank(SoundBankLoader.fromArrayBuffer(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)),name);
  }
  const clock=new ScoreClock(synth,22050);clock.load(score,undefined,song.bpm,1);clock.mix(.8,true);clock.play();
  let energy=0,peak=0;
  while(clock.state==='playing'){
    const l=new Float32Array(128),r=new Float32Array(128);clock.render(l,r);
    for(const data of [l,r])for(const x of data){assert.ok(Number.isFinite(x));energy+=x*x;peak=Math.max(peak,Math.abs(x)*.55);}
  }
  assert.ok(energy>2,'silent arrangement');assert.ok(peak<.95,`peak after browser gain ${peak}`);
  synth.destroySynthProcessor();
});
