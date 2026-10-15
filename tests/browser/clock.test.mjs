import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ScoreClock, validatePlayback, makeEvents, instruments} from '../../docs/score-clock.js';
import {SpessaSynthProcessor, SoundBankLoader, SpessaLog} from '../../docs/vendor/spessasynth-core-4.3.22.js';
for (const name of ['info','group','groupCollapsed','groupEnd']) SpessaLog[name] = () => {};
const score = {schema_version:1,title:'Auftakt',bpm:104,quarters:2,notes:[
  {at:0,duration:.5,midi:62},{at:.5,duration:1,midi:67},{at:1.5,duration:.5,midi:67}]};
function spy() {
  return {position:0, notes:[], stopAllChannels(){}, programChange(c,p){this.program=p;},
    noteOn(c,p){this.notes.push([this.position,p]);},noteOff(){},
    process(l,r,o,n){this.position+=n;}};
}
function render(clock, count=128) { clock.render(new Float32Array(count),new Float32Array(count)); }

test('60 verses have absolute sample positions, no per-loop rounding drift',()=>{
  const synth=spy(), boundaries=[];
  const clock=new ScoreClock(synth,44100,e=>boundaries.push(e));
  clock.load(score,'clarinet',104,Infinity); clock.play();
  while(boundaries.length<60) render(clock);
  for(let i=0;i<60;i++) assert.equal(boundaries[i].frame,Math.round((i+1)*2*44100*60/104));
  for(let i=0;i<60;i++) assert.equal(synth.notes[i*3][0],Math.round(i*2*44100*60/104));
});
test('finite verses stop exactly, pause freezes samples and tempo keeps pitch/position',()=>{
  const synth=spy(), clock=new ScoreClock(synth,48000);
  clock.load(score,'piano',104,3); clock.play(); render(clock);
  clock.pause(); const frame=clock.frame, noteCount=synth.notes.length;
  for(let i=0;i<10;i++) render(clock);
  assert.equal(clock.frame,frame); assert.equal(synth.notes.length,noteCount);
  const quarter=clock.quarter;
  clock.setTempo(88); assert.equal(clock.quarter,quarter);
  clock.play(); while(clock.state==='playing') render(clock);
  assert.equal(synth.notes.length,9);
  assert.deepEqual(synth.notes.map(e=>e[1]),[62,67,67,62,67,67,62,67,67]);
  assert.equal(clock.cycle,3); assert.equal(clock.state,'finished');
  clock.load(score,'flute',104,1); clock.play(); render(clock);
  assert.equal(clock.frame,128); assert.equal(clock.epochQuarter,0);
  clock.stop(); render(clock); assert.equal(clock.state,'idle');
});
test('chords, rests and ties expressed as simultaneous or absent events',()=>{
  const notes={...score,quarters:4,notes:[{at:.5,duration:3,midi:60},{at:.5,duration:3,midi:64}]};
  const ev=makeEvents(notes,'piano');
  assert.deepEqual(ev.map(e=>e.at),[.5,.5,3.5,3.5]);
});
test('invalid notes, instruments, tempo and repetitions rejected',()=>{
  for(const update of [{quarters:0},{notes:[]},{notes:[{at:0,duration:NaN,midi:60}]},
      {notes:[{at:1,duration:2,midi:60}]},{notes:[{at:0,duration:1,midi:128}]}]) {
    assert.throws(()=>validatePlayback({...score,...update}));
  }
  assert.throws(()=>makeEvents(score,'__proto__'));
  const c=new ScoreClock(spy(),44100);
  assert.throws(()=>c.load(score,'piano',0,1));
  assert.throws(()=>c.load(score,'piano',88,0));
});
for(const [instrument,config] of Object.entries(instruments)) test(`real ${instrument} SoundFont renders audio and a 6-second held note`,async()=>{
  const synth=new SpessaSynthProcessor(44100);
  await synth.processorInitialized;
  const data=readFileSync(new URL(`../../docs/samples/${instrument}.sf2`,import.meta.url));
  const bank=SoundBankLoader.fromArrayBuffer(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength));
  assert.equal(bank.presets.length,1); assert.equal(bank.presets[0].program,config.program);
  synth.soundBankManager.addSoundBank(bank,'main');
  const clock=new ScoreClock(synth,44100);
  clock.load({...score,quarters:5,notes:[{at:0,duration:5,midi:67}]},instrument,40,1);
  clock.play();
  let energy=0,peak=0,lateEnergy=0;
  while(clock.state==='playing') {
    const left=new Float32Array(128),right=new Float32Array(128);
    clock.render(left,right);
    for(const v of left) {energy+=v*v;peak=Math.max(peak,Math.abs(v));if(clock.frame>44100*6) lateEnergy+=v*v;}
  }
  assert.ok(energy>1,`Silent instrument: ${energy}`);
  assert.ok(peak<1.8,`Unexpected level ${peak}`);
  if(['clarinet','flute'].includes(instrument)) assert.ok(lateEnergy>1,'Sustain ended prematurely');
});

test('real engine repeats the uploaded melody with no added tail gap',async()=>{
  const score=JSON.parse(readFileSync(new URL('../../docs/assets/was-muessen-das-fuer-baeume-sein-glocke/playback.json',import.meta.url)));
  const synth=new SpessaSynthProcessor(44100);
  await synth.processorInitialized;
  const data=readFileSync(new URL('../../docs/samples/clarinet.sf2',import.meta.url));
  synth.soundBankManager.addSoundBank(SoundBankLoader.fromArrayBuffer(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)),'main');
  const starts=[];
  const adapter={process:(...a)=>synth.process(...a),programChange:(...a)=>synth.programChange(...a),
    stopAllChannels:(...a)=>synth.stopAllChannels(...a),noteOff:(...a)=>synth.noteOff(...a),
    noteOn:(...a)=>{starts.push([clock.frame,a[1]]);synth.noteOn(...a);}};
  const clock=new ScoreClock(adapter,44100);
  clock.load(score,'clarinet',104,3);clock.play();
  const boundaryEnergies=[0,0];
  while(clock.state==='playing') {
    const frame=clock.frame,left=new Float32Array(128),right=new Float32Array(128);
    clock.render(left,right);
    for(let cycle=1;cycle<=2;cycle++) {
      const boundary=clock.frameAt(cycle*36);
      for(let i=0;i<128;i++) if(frame+i>=boundary+441&&frame+i<boundary+4410) boundaryEnergies[cycle-1]+=left[i]**2;
    }
  }
  assert.equal(starts.length,180);
  assert.equal(starts[60][0],Math.round(36*44100*60/104));
  assert.equal(starts[120][0],Math.round(72*44100*60/104));
  assert.ok(boundaryEnergies.every(e=>e>1),'No silent tail gap before the next verse');
});

test('verse gaps preserve pickup notes, absolute timing and omit the final gap',()=>{
  for (const gap of [0, 2, 4]) {
    const synth=spy(), clock=new ScoreClock(synth,44100);
    clock.load(score,'piano',104,3,gap); clock.play();
    while(clock.state==='playing') render(clock);
    assert.deepEqual(synth.notes.map(n=>n[1]),[62,67,67,62,67,67,62,67,67]);
    for(let verse=0;verse<3;verse++) assert.equal(synth.notes[verse*3][0],Math.round(verse*(2+gap)*44100*60/104));
    assert.equal(clock.frame,Math.round((6+2*gap)*44100*60/104));
  }
});
test('pause and tempo during the gap preserve position and next pickup',()=>{
  const synth=spy(), clock=new ScoreClock(synth,48000);
  clock.load(score,'piano',120,2,2);clock.play();
  render(clock,60000); // 2.5 quarters: inside the gap
  assert.equal(synth.notes.length,3);
  clock.pause();render(clock,4800);assert.equal(clock.frame,60000);
  clock.setTempo(60);assert.equal(clock.quarter,2.5);
  clock.play();while(clock.state==='playing') render(clock);
  assert.equal(synth.notes[3][0],132000); // remaining 1.5 quarters at 60 BPM
  assert.equal(clock.frame,228000);
});
test('60 verses with gaps have no drift; invalid gaps are rejected',()=>{
  const synth=spy(), clock=new ScoreClock(synth,44100);
  clock.load(score,'piano',104,Infinity,2);clock.play();
  while(synth.notes.length<181) render(clock);
  for(let verse=0;verse<=60;verse++) assert.equal(synth.notes[verse*3][0],Math.round(verse*4*44100*60/104));
  for(const gap of [-1,NaN,Infinity,129,'2']) assert.throws(()=>clock.load(score,'piano',104,2,gap));
});
