import test from 'node:test';import assert from 'node:assert/strict';import {voiceLevel} from './assistant-voice-level';
test('nível acompanha amplitude, fica em zero no silêncio e respeita limites',()=>{
 assert.equal(voiceLevel(new Float32Array(80)),0);
 assert.equal(voiceLevel([]),0);
 assert.equal(voiceLevel([NaN,Infinity]),0);
 assert.ok(voiceLevel(new Float32Array(80).fill(.02))<voiceLevel(new Float32Array(80).fill(.1)));
 assert.equal(voiceLevel(new Float32Array(80).fill(1)),1);
 assert.equal(voiceLevel(new Float32Array(80).fill(-.1)),voiceLevel(new Float32Array(80).fill(.1)));
});
