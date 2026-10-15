import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AudioOutput, configurePlaybackSession, isAppleMobile} from '../../docs/audio-output.js';

function environment(navigator) {
  const calls=[];
  const media={setAttribute(k,v){this[k]=v;},play(){calls.push('media-play');return Promise.resolve();},pause(){calls.push('media-pause');}};
  const document={body:{append(node){assert.equal(node,media);calls.push('append');}},createElement(tag){assert.equal(tag,'audio');return media;}};
  const context={destination:{},sampleRate:48000,state:'suspended',
    createMediaStreamDestination(){calls.push('stream');return {stream:{}};},
    createBuffer(channels,length,rate){assert.deepEqual([channels,length,rate],[1,1,48000]);return {};},
    createBufferSource(){return {connect(target){calls.push(['buffer-target',target]);},start(){calls.push('buffer-start');},disconnect(){}};},
    resume(){calls.push('resume');this.state='running';return Promise.resolve();}};
  return {context,options:{navigator,document},calls,media};
}

test('WebKit session is marked as playback, unsupported or denied APIs are optional',()=>{
  const navigator={audioSession:{type:'auto'}};
  assert.equal(configurePlaybackSession(navigator),true);
  assert.equal(navigator.audioSession.type,'playback');
  assert.equal(configurePlaybackSession({}),false);
  assert.equal(configurePlaybackSession({get audioSession(){throw Error('denied');}}),false);
  assert.equal(configurePlaybackSession({audioSession:{set type(_){throw Error('denied');}}}),false);
});
test('modern iOS uses the direct output and unlocks synchronously before awaiting',async()=>{
  const env=environment({userAgent:'iPhone',audioSession:{type:'auto'}});
  const output=new AudioOutput(env.context,env.options);
  assert.equal(output.destination,env.context.destination);
  const ready=output.activate();
  assert.ok(env.calls.includes('buffer-start'));
  assert.ok(env.calls.includes('resume'));
  assert.ok(!env.calls.includes('stream'));
  await ready;
});
test('old iPhone routes real audio through an unmuted, user-started media element',async()=>{
  const env=environment({userAgent:'iPhone'});
  const output=new AudioOutput(env.context,env.options);
  assert.equal(env.media.srcObject,output.destination.stream);
  assert.equal(env.media['data-melodino-output'],'');
  assert.notEqual(env.media.muted,true);
  const ready=output.activate();
  assert.ok(env.calls.includes('media-play'));
  await ready;
  output.pause();assert.equal(env.calls.at(-1),'media-pause');
  await output.activate();assert.equal(env.calls.at(-1),'media-play');
});
test('iPad desktop identity and restricted session use the legacy route',async()=>{
  const nav={platform:'MacIntel',maxTouchPoints:5,audioSession:{set type(_){throw Error('not available');}}};
  assert.equal(isAppleMobile(nav),true);
  const env=environment(nav);const output=new AudioOutput(env.context,env.options);
  assert.ok(env.calls.includes('stream'));
  await output.activate();output.pause();
});
test('Android and desktop without AudioSession keep their original output',async()=>{
  for(const nav of [{userAgent:'Android Chrome'},{platform:'MacIntel',maxTouchPoints:0}]) {
    const env=environment(nav),output=new AudioOutput(env.context,env.options);
    assert.equal(output.destination,env.context.destination);
    await output.activate();assert.ok(!env.calls.includes('stream'));
  }
});
test('hanging resume gives an actionable error and can be retried',async()=>{
  const env=environment({userAgent:'iPhone'});
  env.context.resume=()=>new Promise(()=>{});
  const output=new AudioOutput(env.context,env.options);
  await assert.rejects(output.activate(5),/erneut auf Abspielen/);
  assert.equal(env.calls.at(-1),'media-pause');
  env.context.resume=()=>{env.context.state='running';return Promise.resolve();};
  await output.activate(50);
});
test('media permission rejection and still-interrupted context do not report success',async()=>{
  const env=environment({userAgent:'iPhone'}),output=new AudioOutput(env.context,env.options);
  env.media.play=()=>Promise.reject(Error('NotAllowedError'));
  await assert.rejects(output.activate(),/Safari/);
  const other=environment({});other.context.resume=()=>Promise.resolve();
  await assert.rejects(new AudioOutput(other.context,other.options).activate(),/Audioausgabe/);
});
test('an obsolete activation timeout cannot pause a newer successful start',async()=>{
  const env=environment({userAgent:'iPhone'}),output=new AudioOutput(env.context,env.options);
  env.context.resume=()=>new Promise(()=>{});
  const old=output.activate(10);
  output.pause();
  env.context.resume=()=>{env.context.state='running';return Promise.resolve();};
  await output.activate(50);
  const pauses=env.calls.filter(c=>c==='media-pause').length;
  await assert.rejects(old,/Audioausgabe/);
  assert.equal(env.calls.filter(c=>c==='media-pause').length,pauses);
});
